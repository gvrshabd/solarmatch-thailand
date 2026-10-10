import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
const runtime=vi.hoisted(()=>({PHONE_VERIFICATION_SECRET:'fixture-phone-secret-thirty-two-characters',INSTALLER_PLATFORM_MODE:'local-test',INSTALLER_BASE_URL:'http://localhost:3000',DB:undefined as D1Database|undefined}));
vi.mock('@/lib/server/runtime',()=>({getRuntimeEnv:()=>runtime}));
import {FixtureDatabase,seedFixture,seedLead} from '../installer/fixtures';
import {allocateEnquiry,suppressEnquiry} from '@/lib/installer/deliveries';
import {processOutbox,runInstallerJobs} from '@/lib/installer/jobs';
import {getPlatformSettings} from '@/lib/installer/settings';
import {readShareLink,rotateShareLink} from '@/lib/installer/share';
let fixture:FixtureDatabase;
beforeEach(async()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-11T03:00:00.000Z'));fixture=new FixtureDatabase();runtime.DB=fixture.d1();await seedFixture(runtime.DB);
  const settings=await getPlatformSettings(runtime.DB);await runtime.DB.prepare('UPDATE installer_platform_settings SET config_json=? WHERE id=1').bind(JSON.stringify({...settings,notificationsEnabled:true})).run();
  await runtime.DB.prepare('UPDATE solar_company_partners SET paused=1 WHERE id<>?').bind('synthetic-company-1').run();
  await runtime.DB.prepare('UPDATE solar_company_partners SET line_user_id=? WHERE id=?').bind(`U${'a'.repeat(32)}`,'synthetic-company-1').run();
  vi.spyOn(globalThis,'fetch').mockRejectedValue(new Error('External network must not be called by local fixtures'));
});
afterEach(()=>{fixture.close();runtime.DB=undefined;vi.restoreAllMocks();vi.useRealTimers();});
function scalar(sql:string){return fixture.sqlite.prepare(sql).get()?.n;}
describe('committed enquiry to durable test notification workflow',()=>{
  it('captures LINE and homeowner SMS from committed outbox once; retries never recharge and withdrawal revokes sharing',async()=>{
    const db=fixture.d1(),lead=await seedLead(db);const allocated=await allocateEnquiry(db,lead.enquiryId,'fixture',['synthetic-company-1']);expect(allocated.allocated).toHaveLength(1);
    const deliveryId=allocated.allocated[0];expect(scalar('SELECT COUNT(*) n FROM installer_outbox')).toBe(2);
    const share=await rotateShareLink(db,'synthetic-company-1',deliveryId,'fixture','http://localhost:3000');const token=new URLSearchParams(new URL(share.url).hash.slice(1)).get('token')!;
    expect((await processOutbox(db,runtime)).processed).toBe(2);
    expect(scalar("SELECT COUNT(*) n FROM installer_outbox WHERE state='accepted'")).toBe(2);
    const captures=fixture.sqlite.prepare('SELECT channel,body FROM installer_test_messages ORDER BY channel').all();expect(captures).toHaveLength(2);
    const line=JSON.parse(String(captures.find(row=>row.channel==='installer-delivery')?.body));expect(line.messages[0].text).toContain(`/installers/enquiry/${deliveryId}`);expect(line.messages[0].text).not.toContain('+66812345678');expect(line.messages[0].text).not.toContain('Synthetic Homeowner');
    const sms=JSON.parse(String(captures.find(row=>row.channel==='homeowner-confirmation')?.body));expect(sms.body).toContain('Synthetic Company 1');expect(sms.to).toBe('+66812345678');
    await runInstallerJobs(runtime);await processOutbox(db,runtime);
    expect(scalar("SELECT COUNT(*) n FROM installer_credit_ledger WHERE kind='delivery'")).toBe(1);expect(scalar('SELECT COUNT(*) n FROM lead_recipient_deliveries')).toBe(1);expect(scalar('SELECT COUNT(*) n FROM installer_test_messages')).toBe(2);
    expect(fixture.sqlite.prepare('SELECT available FROM installer_credit_accounts WHERE company_id=?').get('synthetic-company-1')?.available).toBe(18);
    expect(await readShareLink(db,token)).not.toBeNull();await suppressEnquiry(db,lead.enquiryId,'Synthetic homeowner withdrew','fixture');expect(await readShareLink(db,token)).toBeNull();
    await processOutbox(db,runtime);expect(scalar("SELECT COUNT(*) n FROM installer_outbox WHERE kind='withdrawal' AND state='action-required'")).toBe(1);expect(globalThis.fetch).not.toHaveBeenCalled();
  });
  it('suppression before notification dispatch cancels queued messages without creating captures',async()=>{
    const db=fixture.d1(),lead=await seedLead(db);await allocateEnquiry(db,lead.enquiryId,'fixture',['synthetic-company-1']);await suppressEnquiry(db,lead.enquiryId,'Withdrawn before notification','fixture');await processOutbox(db,runtime);
    expect(scalar("SELECT COUNT(*) n FROM installer_outbox WHERE kind<>'withdrawal' AND state='cancelled'")).toBe(2);expect(scalar('SELECT COUNT(*) n FROM installer_test_messages')).toBe(0);expect(globalThis.fetch).not.toHaveBeenCalled();
  });
  it('holds overnight requests until 09:00 Bangkok then releases through the same transactional service',async()=>{
    const db=fixture.d1();vi.setSystemTime(new Date('2026-10-11T01:59:00.000Z'));fixture.now='2026-10-11T01:59:00.000Z';const lead=await seedLead(db);
    const original=fixture.sqlite.prepare('SELECT created_at FROM installer_enquiries WHERE id=?').get(lead.enquiryId)?.created_at;
    await runInstallerJobs(runtime);expect(scalar('SELECT COUNT(*) n FROM lead_recipient_deliveries')).toBe(0);expect(scalar('SELECT COUNT(*) n FROM installer_test_messages')).toBe(0);
    vi.setSystemTime(new Date('2026-10-11T02:00:00.000Z'));fixture.now='2026-10-11T02:00:00.000Z';await runInstallerJobs(runtime);
    expect(scalar('SELECT COUNT(*) n FROM lead_recipient_deliveries')).toBe(1);expect(scalar("SELECT COUNT(*) n FROM installer_outbox WHERE state='accepted'")).toBe(2);
    expect(fixture.sqlite.prepare('SELECT created_at FROM installer_enquiries WHERE id=?').get(lead.enquiryId)?.created_at).toBe(original);expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
