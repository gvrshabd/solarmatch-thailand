import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
const runtime=vi.hoisted(()=>({INSTALLER_PLATFORM_MODE:'local-test',INSTALLER_BASE_URL:'http://localhost:3000',LINE_CHANNEL_SECRET:'synthetic-line-secret',PHONE_VERIFICATION_SECRET:'fixture-phone-secret-thirty-two-characters'}));
vi.mock('@/lib/server/runtime',()=>({getRuntimeEnv:()=>runtime}));
import {FixtureDatabase,seedFixture,seedLead} from '../installer/fixtures';
import {allocateEnquiry} from '@/lib/installer/deliveries';
import {processOutbox,retryNotification} from '@/lib/installer/jobs';
import * as lineLinking from '@/lib/installer/line-linking';
import {getPlatformSettings} from '@/lib/installer/settings';
import {sha256} from '@/lib/server/crypto';
import {base64,hmac} from '@/lib/installer/providers/common';
import {sendMessage} from '@/lib/installer/providers/sms';
import {sendAuthEmail} from '@/lib/installer/providers/email';
const company='synthetic-company-1',lineUser=`U${'a'.repeat(32)}`;
let fixture:FixtureDatabase;
beforeEach(async()=>{
  runtime.INSTALLER_PLATFORM_MODE='local-test';
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-11T03:00:00.000Z'));fixture=new FixtureDatabase();await seedFixture(fixture.d1());
  const settings=await getPlatformSettings(fixture.d1());fixture.sqlite.prepare('UPDATE installer_platform_settings SET config_json=? WHERE id=1').run(JSON.stringify({...settings,notificationsEnabled:true}));
  fixture.sqlite.prepare('UPDATE solar_company_partners SET line_user_id=? WHERE id=?').run(lineUser,company);
  vi.spyOn(globalThis,'fetch').mockRejectedValue(new Error('No real provider calls allowed'));
});
afterEach(()=>{fixture.close();vi.restoreAllMocks();vi.useRealTimers();});
function at(iso:string){vi.setSystemTime(new Date(iso));fixture.now=iso;}
async function queued(mode='local-test'){const lead=await seedLead(fixture.d1());if(mode==='sandbox'){fixture.sqlite.prepare("UPDATE leads SET submission_mode='sandbox' WHERE id=?").run(lead.leadId);runtime.INSTALLER_PLATFORM_MODE='sandbox';}const result=await allocateEnquiry(fixture.d1(),lead.enquiryId,'fixture',[company]);return {deliveryId:result.allocated[0],...lead};}
const outbox=()=>fixture.sqlite.prepare('SELECT kind,state,attempts,last_error FROM installer_outbox ORDER BY kind').all();
describe('referral delivery hours',()=>{
  it.each(['2026-10-11T01:59:59.999Z','2026-10-11T10:00:00.000Z','2026-10-11T11:00:00.000Z'])('keeps committed queued referrals untouched outside hours at %s',async time=>{
    await queued();fixture.sqlite.prepare("UPDATE installer_outbox SET next_attempt_at='2026-10-11T01:00:00.000Z'").run();at(time);expect(await processOutbox(fixture.d1(),runtime)).toEqual({processed:0,failed:0});
    expect(outbox().every(row=>row.state==='pending'&&row.attempts===0)).toBe(true);expect(fixture.sqlite.prepare('SELECT COUNT(*) n FROM installer_test_messages').get()?.n).toBe(0);
    at('2026-10-12T02:00:00.000Z');expect((await processOutbox(fixture.d1(),runtime)).processed).toBe(2);
  });
  it('does not spend a failed retry attempt overnight and sends at inclusive opening',async()=>{
    const {deliveryId}=await queued();fixture.sqlite.prepare("UPDATE installer_outbox SET state='failed',attempts=4,last_error='synthetic-failure' WHERE id=?").run(`notify-${deliveryId}`);
    at('2026-10-11T10:00:00.000Z');expect((await processOutbox(fixture.d1(),runtime)).processed).toBe(0);
    expect(fixture.sqlite.prepare('SELECT state,attempts FROM installer_outbox WHERE id=?').get(`notify-${deliveryId}`)).toMatchObject({state:'failed',attempts:4});
    await retryNotification(fixture.d1(),`notify-${deliveryId}`,'fixture');expect((await processOutbox(fixture.d1(),runtime)).processed).toBe(0);
    at('2026-10-12T02:00:00.000Z');expect((await processOutbox(fixture.d1(),runtime)).processed).toBe(2);
    expect(fixture.sqlite.prepare("SELECT COUNT(*) n FROM installer_credit_ledger WHERE kind='delivery'").get()?.n).toBe(1);
  });
  it('stops a batch immediately after an accepted call crosses exclusive closing',async()=>{
    await queued('sandbox');at('2026-10-11T09:59:59.900Z');
    const env={...runtime,INSTALLER_PLATFORM_MODE:'sandbox',INSTALLER_BASE_URL:'https://sandbox.example.test',OUTBOUND_MESSAGES_ENABLED:'true',LINE_PROVIDER_MODE:'sandbox',LINE_CHANNEL_ACCESS_TOKEN:'synthetic-token',LINE_TEST_RECIPIENTS:JSON.stringify([lineUser])};
    vi.mocked(fetch).mockImplementationOnce(async()=>{at('2026-10-11T10:00:00.000Z');return new Response('',{status:200,headers:{'x-line-request-id':'synthetic-accepted'}});});
    expect(await processOutbox(fixture.d1(),env)).toEqual({processed:1,failed:0});expect(fetch).toHaveBeenCalledTimes(1);
    expect(outbox().find(row=>row.kind==='homeowner-confirmation')).toMatchObject({state:'pending',attempts:0});
  });
  it('returns a claimed failed row without consuming its attempt when settings read crosses closing',async()=>{
    await queued();fixture.sqlite.prepare("UPDATE installer_outbox SET state='failed',attempts=3 WHERE kind='installer-delivery'").run();at('2026-10-11T09:59:59.900Z');
    const original=fixture.prepare.bind(fixture);let reads=0;
    fixture.prepare=((sql:string)=>{const statement=original(sql);if(sql.includes('SELECT config_json'))return {...statement,first:async<T>()=>{const result=await statement.first<T>();if(++reads===2)at('2026-10-11T10:00:00.000Z');return result;}};return statement;}) as typeof fixture.prepare;
    expect(await processOutbox(fixture.d1(),runtime)).toEqual({processed:0,failed:0});
    expect(outbox().find(row=>row.kind==='installer-delivery')).toMatchObject({state:'failed',attempts:3});expect(outbox().find(row=>row.kind==='homeowner-confirmation')).toMatchObject({state:'pending',attempts:0});
  });
  it('still permits user-requested OTP, verification and recovery messages overnight',async()=>{
    at('2026-10-11T11:00:00.000Z');expect((await sendMessage({to:'+66800000000',body:'Synthetic OTP',idempotencyKey:'otp'},{mode:'local-test'})).status).toBe('captured');
    const transport=vi.fn(async()=>new Response(JSON.stringify({id:'synthetic-auth-email'}),{status:200}));
    for(const kind of ['verification','password-reset'] as const)expect((await sendAuthEmail({to:'synthetic@example.test',kind,url:'https://synthetic.example.test/api/installer-auth/verify?token=synthetic'},{mode:'sandbox',outboundEnabled:true,token:'synthetic-token',from:'auth@example.test',baseUrl:'https://synthetic.example.test',fetch:transport})).providerMessageId).toBe('synthetic-auth-email');
    expect(transport).toHaveBeenCalledTimes(2);
    expect(fetch).not.toHaveBeenCalled();
  });
});
async function signedLink(eventId:string,nonce:string,user=lineUser){
  const raw=JSON.stringify({events:[{type:'accountLink',webhookEventId:eventId,timestamp:Date.now(),source:{type:'user',userId:user},link:{result:'ok',nonce}}]});
  const headers=new Headers({'x-line-signature':base64(await hmac(new TextEncoder().encode(runtime.LINE_CHANNEL_SECRET),raw))});
  await lineLinking.processLineWebhook(fixture.d1(),new Request(`${runtime.INSTALLER_BASE_URL}/api/installer/line/webhook`,{headers}),raw);
}
async function challenge(id:string,companyId:string,user:string,nonce:string){await fixture.d1().prepare('INSERT INTO installer_line_links(id,company_id,nonce_hash,line_user_id,expires_at,created_at) VALUES(?,?,?,?,?,?)').bind(id,companyId,await sha256(nonce),user,'2026-10-11T04:00:00.000Z','2026-10-11T03:00:00.000Z').run();}
describe('company LINE unlink',()=>{
  it('invalidates an unfinished company connection even before an account has been linked',async()=>{
    fixture.sqlite.prepare('UPDATE solar_company_partners SET line_user_id=NULL WHERE id=?').run(company);
    await challenge('pending',company,lineUser,'pending-nonce');
    const oldToken='a'.repeat(43);fixture.sqlite.prepare('INSERT INTO installer_line_invitations(id,line_user_id,token_hash,expires_at,created_at) VALUES(?,?,?,?,?)').run('pending-invitation',lineUser,await sha256(oldToken),'2026-10-11T04:00:00.000Z','2026-10-11T03:00:00.000Z');
    await lineLinking.unlinkLine(fixture.d1(),company,'synthetic-owner@example.test');await signedLink('pending-webhook','pending-nonce');
    expect(fixture.sqlite.prepare('SELECT line_user_id FROM solar_company_partners WHERE id=?').get(company)?.line_user_id).toBeNull();
    await expect(lineLinking.beginLineLink(fixture.d1(),company,new Request(`${runtime.INSTALLER_BASE_URL}/installers`),oldToken)).rejects.toThrow('line_invitation_expired');
  });
  it('prevents a worker with a previously fetched recipient from sending after owner unlink',async()=>{
    await queued();const original=fixture.prepare.bind(fixture);let reads=0;
    fixture.prepare=((sql:string)=>{const statement=original(sql);if(sql.includes('SELECT config_json'))return {...statement,first:async<T>()=>{const result=await statement.first<T>();if(++reads===2)await lineLinking.unlinkLine(fixture.d1(),company,'synthetic-owner@example.test');return result;}};return statement;}) as typeof fixture.prepare;
    expect(await processOutbox(fixture.d1(),runtime)).toEqual({processed:1,failed:0});
    expect(fixture.sqlite.prepare("SELECT COUNT(*) n FROM installer_test_messages WHERE channel='installer-delivery'").get()?.n).toBe(0);
    expect(outbox().find(row=>row.kind==='installer-delivery')).toMatchObject({state:'cancelled',last_error:'line_unlinked'});expect(fetch).not.toHaveBeenCalled();
  });
  it('retains provider acceptance evidence when unlink happens during an already dispatched call',async()=>{
    const {deliveryId}=await queued('sandbox');const env={...runtime,INSTALLER_PLATFORM_MODE:'sandbox',INSTALLER_BASE_URL:'https://sandbox.example.test',OUTBOUND_MESSAGES_ENABLED:'true',LINE_PROVIDER_MODE:'sandbox',LINE_CHANNEL_ACCESS_TOKEN:'synthetic-token',LINE_TEST_RECIPIENTS:JSON.stringify([lineUser])};
    vi.mocked(fetch).mockImplementationOnce(async()=>{await lineLinking.unlinkLine(fixture.d1(),company,'synthetic-owner@example.test');return new Response('',{status:200,headers:{'x-line-request-id':'accepted-before-unlink'}});});
    await processOutbox(fixture.d1(),env);
    expect(fixture.sqlite.prepare('SELECT state,provider_reference,last_error FROM installer_outbox WHERE id=?').get(`notify-${deliveryId}`)).toMatchObject({state:'cancelled',provider_reference:'accepted-before-unlink',last_error:'provider_accepted_after_cancellation'});
    expect(fixture.sqlite.prepare('SELECT notification_status FROM lead_recipient_deliveries WHERE id=?').get(deliveryId)?.notification_status).toBe('action-required');
    expect(fixture.sqlite.prepare('SELECT line_user_id FROM solar_company_partners WHERE id=?').get(company)?.line_user_id).toBeNull();
  });
  it('clears only the owner company, invalidates old linking state and retains visible queued work',async()=>{
    const {deliveryId}=await queued();const otherUser=`U${'b'.repeat(32)}`;
    fixture.sqlite.prepare('UPDATE solar_company_partners SET line_user_id=? WHERE id=?').run(otherUser,'synthetic-company-2');
    await challenge('old',company,lineUser,'old-nonce');await challenge('other','synthetic-company-2',otherUser,'other-nonce');
    fixture.sqlite.prepare('INSERT INTO installer_line_invitations(id,line_user_id,token_hash,expires_at,created_at) VALUES(?,?,?,?,?)').run('old-invitation',lineUser,'old-token','2026-10-11T04:00:00.000Z','2026-10-11T03:00:00.000Z');
    expect(typeof lineLinking.unlinkLine).toBe('function');const result=await lineLinking.unlinkLine(fixture.d1(),company,'synthetic-owner@example.test');expect(result).toMatchObject({status:'not-connected',notificationsRequireAction:1});
    expect(fixture.sqlite.prepare('SELECT line_user_id FROM solar_company_partners WHERE id=?').get(company)?.line_user_id).toBeNull();expect(fixture.sqlite.prepare('SELECT line_user_id FROM solar_company_partners WHERE id=?').get('synthetic-company-2')?.line_user_id).toBe(otherUser);
    expect(fixture.sqlite.prepare('SELECT consumed_at FROM installer_line_links WHERE id=?').get('old')?.consumed_at).toBeTruthy();expect(fixture.sqlite.prepare('SELECT consumed_at FROM installer_line_links WHERE id=?').get('other')?.consumed_at).toBeNull();
    expect(fixture.sqlite.prepare('SELECT consumed_at FROM installer_line_invitations WHERE id=?').get('old-invitation')?.consumed_at).toBeTruthy();
    await signedLink('old-webhook','old-nonce');await signedLink('old-webhook','old-nonce');expect(fixture.sqlite.prepare('SELECT line_user_id FROM solar_company_partners WHERE id=?').get(company)?.line_user_id).toBeNull();
    expect(outbox().find(row=>row.kind==='installer-delivery')).toMatchObject({state:'action-required',attempts:0,last_error:'line_unlinked'});
    await expect(retryNotification(fixture.d1(),`notify-${deliveryId}`,'fixture')).rejects.toThrow('notification_retry_not_allowed');
    expect((await processOutbox(fixture.d1(),runtime)).processed).toBe(1);
    await challenge('new',company,lineUser,'new-nonce');await signedLink('new-webhook','new-nonce');await signedLink('new-webhook','new-nonce');
    expect(fixture.sqlite.prepare('SELECT line_user_id FROM solar_company_partners WHERE id=?').get(company)?.line_user_id).toBe(lineUser);
    await retryNotification(fixture.d1(),`notify-${deliveryId}`,'fixture');expect((await processOutbox(fixture.d1(),runtime)).processed).toBe(1);
    expect(fixture.sqlite.prepare('SELECT COUNT(*) n FROM installer_webhook_events').get()?.n).toBe(2);expect(fixture.sqlite.prepare("SELECT COUNT(*) n FROM installer_credit_ledger WHERE kind='delivery'").get()?.n).toBe(1);
  });
});
