import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
const runtime=vi.hoisted(()=>({PHONE_VERIFICATION_SECRET:'fixture-phone-secret-thirty-two-characters',INSTALLER_PLATFORM_MODE:'local-test',INSTALLER_BASE_URL:'http://localhost:3000',DB:undefined as D1Database|undefined}));
vi.mock('@/lib/server/runtime',()=>({getRuntimeEnv:()=>runtime}));
import {FixtureDatabase,seedFixture,seedLead} from '../installer/fixtures';
import {allocateEnquiry,suppressEnquiry} from '@/lib/installer/deliveries';
import {processOutbox,retryNotification,runInstallerJobs} from '@/lib/installer/jobs';
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
  it('rechecks due time when claiming an outbox row selected by another worker',async()=>{
    const db=fixture.d1(),lead=await seedLead(db);await allocateEnquiry(db,lead.enquiryId,'fixture',['synthetic-company-1']);
    const original=fixture.prepare.bind(fixture);let moved=false;
    fixture.prepare=((sql:string)=>{
      const statement=original(sql);
      if(!moved&&sql.includes('SELECT id FROM installer_outbox WHERE state IN'))return {...statement,bind:(...params:Parameters<typeof statement.bind>)=>{
        const bound=statement.bind(...params);
        return {...bound,all:async <T>()=>{
          const due=await bound.all<T>();
          fixture.sqlite.prepare("UPDATE installer_outbox SET next_attempt_at='2026-10-12T03:00:00.000Z' WHERE id=?").run((due.results[0] as {id:string}).id);
          moved=true;return due;
        }};
      }} as unknown as ReturnType<typeof original>;
      return statement;
    }) as typeof fixture.prepare;
    expect((await processOutbox(db,runtime)).processed).toBe(1);
    expect(scalar("SELECT COUNT(*) n FROM installer_outbox WHERE state='sending'")).toBe(0);
    expect(scalar("SELECT COUNT(*) n FROM installer_outbox WHERE attempts=0 AND state='pending'")).toBe(1);
  });
  it('retains cancellation and provider evidence if withdrawal occurs during LINE send',async()=>{
    const db=fixture.d1(),lead=await seedLead(db);const allocated=await allocateEnquiry(db,lead.enquiryId,'fixture',['synthetic-company-1']);
    const deliveryId=allocated.allocated[0];
    const env={...runtime,INSTALLER_PLATFORM_MODE:'sandbox',INSTALLER_BASE_URL:'https://sandbox.example.test',OUTBOUND_MESSAGES_ENABLED:'true',LINE_PROVIDER_MODE:'sandbox',LINE_CHANNEL_ACCESS_TOKEN:'synthetic-token',LINE_TEST_RECIPIENTS:JSON.stringify([`U${'a'.repeat(32)}`])};
    vi.mocked(globalThis.fetch).mockImplementationOnce(async()=>{
      await suppressEnquiry(db,lead.enquiryId,'Withdrawn during provider call','fixture');
      return new Response('',{status:200,headers:{'x-line-request-id':'provider-accepted-123'}});
    });
    await processOutbox(db,env);
    const outbox=fixture.sqlite.prepare("SELECT state,provider_reference,last_error FROM installer_outbox WHERE id=?").get(`notify-${deliveryId}`);
    expect(outbox).toMatchObject({state:'cancelled',provider_reference:'provider-accepted-123',last_error:'provider_accepted_after_cancellation'});
    expect(fixture.sqlite.prepare('SELECT notification_status,withdrawal_suppressed FROM lead_recipient_deliveries WHERE id=?').get(deliveryId)).toMatchObject({notification_status:'pending',withdrawal_suppressed:1});
    expect(scalar("SELECT COUNT(*) n FROM installer_outbox WHERE kind='homeowner-confirmation' AND state='cancelled'")).toBe(1);
  });
  it('does not revive cancellation when a provider fails after withdrawal',async()=>{
    const db=fixture.d1(),lead=await seedLead(db);const allocated=await allocateEnquiry(db,lead.enquiryId,'fixture',['synthetic-company-1']);
    const env={...runtime,INSTALLER_PLATFORM_MODE:'sandbox',INSTALLER_BASE_URL:'https://sandbox.example.test',OUTBOUND_MESSAGES_ENABLED:'true',LINE_PROVIDER_MODE:'sandbox',LINE_CHANNEL_ACCESS_TOKEN:'synthetic-token',LINE_TEST_RECIPIENTS:JSON.stringify([`U${'a'.repeat(32)}`])};
    vi.mocked(globalThis.fetch).mockImplementationOnce(async()=>{
      await suppressEnquiry(db,lead.enquiryId,'Withdrawn during provider failure','fixture');throw new Error('synthetic timeout');
    });
    await processOutbox(db,env);
    expect(fixture.sqlite.prepare('SELECT state,last_error FROM installer_outbox WHERE id=?').get(`notify-${allocated.allocated[0]}`)).toMatchObject({state:'cancelled',last_error:null});
  });
  it('can retry an unambiguous failed notification after the former allocation window expires',async()=>{
    const db=fixture.d1(),lead=await seedLead(db);const allocated=await allocateEnquiry(db,lead.enquiryId,'fixture',['synthetic-company-1']);
    const notificationId=`notify-${allocated.allocated[0]}`;
    fixture.sqlite.prepare("UPDATE installer_enquiries SET request_expires_at='2026-10-10T03:00:00.000Z' WHERE id=?").run(lead.enquiryId);
    fixture.sqlite.prepare("UPDATE installer_outbox SET state='failed',attempts=8 WHERE id=?").run(notificationId);
    await retryNotification(db,notificationId,'synthetic-admin');
    expect(fixture.sqlite.prepare('SELECT state,attempts FROM installer_outbox WHERE id=?').get(notificationId)).toMatchObject({state:'pending',attempts:0});
    expect((await processOutbox(db,runtime)).processed).toBe(2);
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
