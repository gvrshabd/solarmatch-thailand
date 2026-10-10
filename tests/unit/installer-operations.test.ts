import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
const runtime=vi.hoisted(()=>({INSTALLER_PLATFORM_MODE:'local-test',INSTALLER_BASE_URL:'http://localhost:3000',INSTALLER_TEST_CLOCK_ENABLED:'true',PHONE_VERIFICATION_SECRET:'synthetic-clock-and-phone-secret-32-characters'}));
vi.mock('@/lib/server/runtime',()=>({getRuntimeEnv:()=>runtime}));
import {FixtureDatabase,seedFixture,seedLead} from '../installer/fixtures';
import {allocateEnquiry,processQueue,retryEnquiry,suppressEnquiry} from '@/lib/installer/deliveries';
import {getInstallerOperations} from '@/lib/installer/operations';
import {installerAllocationNow,setLocalTestClock} from '@/lib/installer/test-clock';
import {retryNotification} from '@/lib/installer/jobs';
import {getPlatformSettings} from '@/lib/installer/settings';
let fixture:FixtureDatabase;
beforeEach(async()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-11T03:00:00Z'));fixture=new FixtureDatabase();await seedFixture(fixture.d1());runtime.INSTALLER_PLATFORM_MODE='local-test';});
afterEach(()=>{fixture.close();vi.useRealTimers();});
const request=()=>new Request('http://localhost:3000/admin/api/installer-platform',{method:'POST',headers:{Origin:'http://localhost:3000'}});
describe('operational recovery and guarded local demonstration clock',()=>{
  it('reports inserted deliveries even when D1 metadata includes all trigger writes',async()=>{
    const lead=await seedLead(fixture.d1());
    const db=fixture.d1();
    const batch=db.batch.bind(db);
    db.batch=async <T>(statements:D1PreparedStatement[])=>(await batch<T>(statements)).map(result=>({...result,meta:{...result.meta,changes:result.meta.changes+6}}));
    const result=await allocateEnquiry(db,lead.enquiryId,'synthetic-admin',['synthetic-company-1']);
    expect(result.allocated).toHaveLength(1);
    expect(result.reason).toBe('allocated');
    expect(fixture.sqlite.prepare('SELECT COUNT(*) AS total FROM lead_recipient_deliveries').get()).toMatchObject({total:1});
  });
  it('unmatched retries back off so the next batch reaches a newly submitted enquiry',async()=>{
    fixture.sqlite.prepare('UPDATE solar_company_partners SET paused=1').run();
    for(let index=0;index<50;index++)await seedLead(fixture.d1(),`+668${20000000+index}`);
    expect(await processQueue(fixture.d1(),'synthetic-admin')).toHaveLength(50);
    const fresh=await seedLead(fixture.d1(),'+66829999999');
    fixture.sqlite.prepare("UPDATE solar_company_partners SET paused=0 WHERE id='synthetic-company-1'").run();
    const next=await processQueue(fixture.d1(),'synthetic-admin');
    expect(next).toHaveLength(1);expect(next[0].enquiryId).toBe(fresh.enquiryId);expect(next[0].allocated).toHaveLength(1);
    const operations=await getInstallerOperations(fixture.d1());expect(operations.unmatchedCount).toBe(50);expect(operations.lastSuccessfulRun).not.toBeNull();
  });
  it('a missed worker lease recovers and allocation remains fair and once-only',async()=>{
    const first=await seedLead(fixture.d1());
    fixture.sqlite.prepare('UPDATE installer_enquiries SET allocation_lease_until=? WHERE id=?').run('2026-10-11T02:59:00Z',first.enquiryId);
    expect((await processQueue(fixture.d1(),'recovering-worker'))[0].allocated).toHaveLength(3);
    const second=await seedLead(fixture.d1(),'+66829999998');await processQueue(fixture.d1(),'recovering-worker');
    const delivered=fixture.sqlite.prepare('SELECT partner_id FROM lead_recipient_deliveries WHERE enquiry_id=? ORDER BY rowid').all(second.enquiryId);
    expect(delivered[0].partner_id).toBe('synthetic-company-4');
    await processQueue(fixture.d1(),'retry-worker');
    expect(fixture.sqlite.prepare('SELECT COUNT(*) n FROM lead_recipient_deliveries').get()?.n).toBe(6);
  });
  it('the global pause blocks service and direct database portal allocation',async()=>{
    const lead=await seedLead(fixture.d1());const db=fixture.d1();
    await db.prepare('UPDATE installer_platform_settings SET config_json=? WHERE id=1').bind(JSON.stringify({...await getPlatformSettings(db),platformPaused:true})).run();
    expect((await allocateEnquiry(db,lead.enquiryId,'synthetic-admin')).allocated).toHaveLength(0);
    expect(await processQueue(db,'synthetic-admin')).toHaveLength(0);
    expect(()=>fixture.sqlite.prepare(`INSERT INTO lead_recipient_deliveries(id,lead_id,partner_id,consent_version,privacy_notice_version_id,disclosure_purpose,fields_disclosed_json,delivered_at,delivered_by,delivery_method,delivery_channel)
      VALUES('blocked',?,'synthetic-company-1','fixture-v1','fixture-privacy','purpose','[]',?,'synthetic-admin','manual-copy','portal')`).run(lead.leadId,fixture.now)).toThrow();
  });
  it('legacy delivery cannot create an unfunded slot for a managed enquiry',async()=>{
    const lead=await seedLead(fixture.d1());
    expect(()=>fixture.sqlite.prepare(`INSERT INTO lead_recipient_deliveries(id,lead_id,partner_id,consent_version,privacy_notice_version_id,disclosure_purpose,fields_disclosed_json,delivered_at,delivered_by,delivery_method)
      VALUES('legacy-bypass',?,'synthetic-company-1','fixture-v1','fixture-privacy','purpose','[]',?,'synthetic-admin','manual-copy')`).run(lead.leadId,fixture.now)).toThrow('managed enquiry requires portal allocation');
  });
  it('the local clock exercises overnight release without changing the nine-to-five policy',async()=>{
    const db=fixture.d1(),lead=await seedLead(db);await setLocalTestClock(db,request(),'2026-10-11T01:59:00Z');
    expect((await allocateEnquiry(db,lead.enquiryId,'synthetic-admin')).allocated).toHaveLength(0);
    await setLocalTestClock(db,request(),'2026-10-11T03:00:00Z');
    expect((await allocateEnquiry(db,lead.enquiryId,'synthetic-admin')).allocated).toHaveLength(3);
    runtime.INSTALLER_PLATFORM_MODE='production';
    await expect(installerAllocationNow(db)).rejects.toThrow('test_clock_not_allowed');
    await expect(setLocalTestClock(db,new Request('https://example.test/admin'),'2026-10-11T03:00:00Z')).rejects.toThrow();
    runtime.INSTALLER_PLATFORM_MODE='local-test';await setLocalTestClock(db,request(),null);
    expect((await installerAllocationNow(db)).toISOString()).toBe(fixture.now);
  });
  it('manual retries never revive withdrawn enquiries or ambiguous SMS sends',async()=>{
    const db=fixture.d1(),lead=await seedLead(db);const delivered=await allocateEnquiry(db,lead.enquiryId,'synthetic-admin',['synthetic-company-1']);
    fixture.sqlite.prepare("UPDATE installer_outbox SET state='needs-reconciliation' WHERE kind='homeowner-confirmation'").run();
    await expect(retryNotification(db,`homeowner-${delivered.allocated[0]}`,'synthetic-admin')).rejects.toThrow('notification_retry_not_allowed');
    await suppressEnquiry(db,lead.enquiryId,'Synthetic withdrawal','synthetic-admin');
    await expect(retryEnquiry(db,lead.enquiryId,'synthetic-admin')).rejects.toThrow('enquiry_retry_not_allowed');
    await expect(retryNotification(db,`notify-${delivered.allocated[0]}`,'synthetic-admin')).rejects.toThrow('notification_retry_not_allowed');
  });
});
