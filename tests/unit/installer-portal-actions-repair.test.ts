import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state=vi.hoisted(()=>({db:null as D1Database|null,userId:'owner1',verified:true,mode:'local-test'}));
vi.mock('@/lib/server/runtime',()=>({getRuntimeEnv:()=>({INSTALLER_PLATFORM_MODE:state.mode,INSTALLER_BASE_URL:'https://installer.example.test',OMISE_PROVIDER_MODE:'sandbox',OMISE_SECRET_KEY:'skey_test_fixture',OMISE_PUBLIC_KEY:'pkey_test_fixture',INSTALLER_AUTH_SECRET:'synthetic-signing-secret-at-least-thirty-two-characters',PHONE_VERIFICATION_SECRET:'synthetic-phone-secret-at-least-thirty-two-characters'}),requireDatabase:()=>state.db}));
vi.mock('@/lib/installer/auth',()=>({getInstallerSession:async()=>state.userId?{user:{id:state.userId,name:'Synthetic owner',email:`${state.userId}@example.test`,emailVerified:state.verified}}:null}));
import { FixtureDatabase, seedFixture, seedLead } from '../installer/fixtures';
import { allocateEnquiry, suppressEnquiry } from '@/lib/installer/deliveries';
import { defaultInstallerSettings } from '@/lib/installer/settings';
import { POST } from '@/app/api/installer/portal/route';
const company='synthetic-company-1';
let fixture:FixtureDatabase;
const post=(body:unknown)=>{const origin=state.mode==='local-test'?'http://localhost:3000':'https://installer.example.test';return POST(new Request(origin+'/api/installer/portal?lang=en',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)}));};
beforeEach(async()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-11T03:00:00.000Z'));
  fixture=new FixtureDatabase();state.db=fixture.d1();state.userId='owner1';state.verified=true;state.mode='local-test';
  await seedFixture(state.db);
  for(const [user,id,role] of [['owner1',company,'owner'],['owner2','synthetic-company-2','owner'],['member',company,'member']]) {
    fixture.sqlite.prepare('INSERT INTO installer_auth_user(id,name,email,emailVerified,createdAt,updatedAt) VALUES(?,?,?,?,?,?)').run(user,'Synthetic',`${user}@example.test`,1,Date.now(),Date.now());
    fixture.sqlite.prepare('INSERT INTO installer_memberships(id,company_id,user_id,role) VALUES(?,?,?,?)').run(`membership-${user}`,id,user,role);
  }
});
afterEach(()=>{fixture.close();state.db=null;vi.useRealTimers();});
async function delivered() {
  const lead=await seedLead(fixture.d1());
  const result=await allocateEnquiry(fixture.d1(),lead.enquiryId,'fixture',[company]);
  expect(result.allocated).toHaveLength(1);return {...lead,id:result.allocated[0]};
}
describe('portal payment, unlink and withdrawn delivery actions',()=>{
  it('passes selected merchant method to checkout and rejects disabled selections',async()=>{
    state.mode='sandbox';
    await fixture.d1().prepare('UPDATE installer_platform_settings SET config_json=? WHERE id=1').bind(JSON.stringify({...defaultInstallerSettings,paymentsEnabled:true,paymentMethods:['promptpay','mobile_banking_kbank']})).run();
    const response=await post({action:'checkout',packageId:'credits-20',method:'mobile_banking_kbank'});
    expect(response.status).toBe(200);
    expect((await response.json() as {checkout:{defaultPaymentMethod:string}}).checkout.defaultPaymentMethod).toBe('mobile_banking_kbank');
    expect((await post({action:'checkout',packageId:'credits-20',method:'credit_card'})).status).toBe(400);
    expect(fixture.sqlite.prepare('SELECT COUNT(*) AS n FROM installer_payment_orders').get()?.n).toBe(1);
  });
  it('unlinks only the authenticated owner company and leaves another company connected',async()=>{
    fixture.sqlite.prepare('UPDATE solar_company_partners SET line_user_id=? WHERE id=?').run(`U${'a'.repeat(32)}`,company);
    fixture.sqlite.prepare('UPDATE solar_company_partners SET line_user_id=? WHERE id=?').run(`U${'b'.repeat(32)}`,'synthetic-company-2');
    const response=await post({action:'unlink-line'});
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({status:'not-connected',notificationsRequireAction:0});
    expect(fixture.sqlite.prepare('SELECT line_user_id FROM solar_company_partners WHERE id=?').get(company)?.line_user_id).toBeNull();
    expect(fixture.sqlite.prepare("SELECT line_user_id FROM solar_company_partners WHERE id='synthetic-company-2'").get()?.line_user_id).toBe(`U${'b'.repeat(32)}`);
  });
  it('rejects member, anonymous and unverified unlink attempts',async()=>{
    state.userId='member';expect((await post({action:'unlink-line'})).status).toBe(403);
    state.userId='';expect((await post({action:'unlink-line'})).status).toBe(401);
    state.userId='owner1';state.verified=false;expect((await post({action:'unlink-line'})).status).toBe(401);
  });
  it('refuses outcome writes after withdrawal while retaining eligible claim access',async()=>{
    const d=await delivered();
    await suppressEnquiry(fixture.d1(),d.enquiryId,'Synthetic withdrawal','fixture');
    expect((await post({action:'report-outcome',deliveryId:d.id,outcome:'won'})).status).toBe(400);
    expect(fixture.sqlite.prepare('SELECT outcome_status FROM lead_recipient_deliveries WHERE id=?').get(d.id)?.outcome_status).toBe('not-recorded');
    expect(fixture.sqlite.prepare("SELECT COUNT(*) AS n FROM audit_events WHERE action='installer.outcome'").get()?.n).toBe(0);
    expect((await post({action:'create-claim',deliveryId:d.id,reason:'withdrawn',notes:'Synthetic claim'})).status).toBe(201);
  });
  it('allows an active outcome but denies another company and records no misleading audit',async()=>{
    const d=await delivered();
    expect((await post({action:'report-outcome',deliveryId:d.id,outcome:'open'})).status).toBe(200);
    state.userId='owner2';expect((await post({action:'report-outcome',deliveryId:d.id,outcome:'won'})).status).toBe(400);
    expect(fixture.sqlite.prepare('SELECT outcome_status FROM lead_recipient_deliveries WHERE id=?').get(d.id)?.outcome_status).toBe('open');
    expect(fixture.sqlite.prepare("SELECT COUNT(*) AS n FROM audit_events WHERE action='installer.outcome'").get()?.n).toBe(1);
  });
  it.each(['rejected','withdrawal-notified','deleted-notified'])('rejects outcome changes for %s deliveries',async status=>{
    const d=await delivered();
    fixture.sqlite.prepare('UPDATE lead_recipient_deliveries SET delivery_status=? WHERE id=?').run(status,d.id);
    expect((await post({action:'report-outcome',deliveryId:d.id,outcome:'won'})).status).toBe(400);
    expect(fixture.sqlite.prepare('SELECT outcome_status FROM lead_recipient_deliveries WHERE id=?').get(d.id)?.outcome_status).toBe('not-recorded');
    expect(fixture.sqlite.prepare("SELECT COUNT(*) AS n FROM audit_events WHERE action='installer.outcome'").get()?.n).toBe(0);
  });
  it('rejects outcome changes for an archived lead',async()=>{
    const d=await delivered();
    fixture.sqlite.prepare('UPDATE leads SET archived_at=? WHERE id=?').run(new Date().toISOString(),d.leadId);
    expect((await post({action:'report-outcome',deliveryId:d.id,outcome:'won'})).status).toBe(400);
    expect(fixture.sqlite.prepare('SELECT outcome_status FROM lead_recipient_deliveries WHERE id=?').get(d.id)?.outcome_status).toBe('not-recorded');
  });
  it('checks withdrawal at the atomic write boundary',async()=>{
    const d=await delivered(),original=fixture.batch.bind(fixture);
    fixture.batch=async statements=>{fixture.sqlite.prepare('UPDATE leads SET consent_withdrawn_at=? WHERE id=?').run(new Date().toISOString(),d.leadId);return original(statements);};
    expect((await post({action:'report-outcome',deliveryId:d.id,outcome:'won'})).status).toBe(400);
    expect(fixture.sqlite.prepare('SELECT outcome_status FROM lead_recipient_deliveries WHERE id=?').get(d.id)?.outcome_status).toBe('not-recorded');
    expect(fixture.sqlite.prepare("SELECT COUNT(*) AS n FROM audit_events WHERE action='installer.outcome'").get()?.n).toBe(0);
  });
});

describe('Design v2 bounded workspace actions',()=>{
 it('persists preference without overwriting company edits or lifting global pauses',async()=>{
   const before=fixture.sqlite.prepare('SELECT trading_name,daily_limit FROM solar_company_partners WHERE id=?').get(company);
   expect((await post({action:'set-accepting',accepting:false})).status).toBe(200);
   expect(fixture.sqlite.prepare('SELECT paused FROM solar_company_partners WHERE id=?').get(company)?.paused).toBe(1);
   expect(fixture.sqlite.prepare('SELECT trading_name,daily_limit FROM solar_company_partners WHERE id=?').get(company)).toEqual(before);
   expect((await post({action:'set-accepting',accepting:true})).status).toBe(200);
   state.userId='member';expect((await post({action:'set-accepting',accepting:true})).status).toBe(403);
 });
 it.each(['contacted','site_visit','quoted','open','won','lost','not-suitable'])('persists explicit %s without changing legacy values on read',async(outcome)=>{
   const d=await delivered();
   expect((await post({action:'report-outcome',deliveryId:d.id,outcome})).status).toBe(200);
   const {getPortalData}=await import('@/lib/installer/portal-data');
   const data=await getPortalData(fixture.d1(),{user:{id:'owner1',name:'Synthetic',email:'owner1@example.test',emailVerified:true}});
   expect(data.deliveries.find(x=>x.id===d.id)?.outcome).toBe(outcome);
 });
 it('persists bounded notes, detects stale edits, and isolates tenant/staff views',async()=>{
   const d=await delivered();
   expect((await post({action:'save-team-notes',deliveryId:d.id,notes:'Synthetic team note',revision:0})).status).toBe(200);
   expect((await post({action:'save-team-notes',deliveryId:d.id,notes:'Stale overwrite',revision:0})).status).toBe(409);
   expect((await post({action:'save-team-notes',deliveryId:d.id,notes:'x'.repeat(2001),revision:1})).status).toBe(400);
   state.userId='owner2';expect((await post({action:'save-team-notes',deliveryId:d.id,notes:'Cross tenant',revision:1})).status).toBe(409);
   const {getPortalData}=await import('@/lib/installer/portal-data');
   const data=await getPortalData(fixture.d1(),{user:{id:'owner1',name:'Synthetic',email:'owner1@example.test',emailVerified:true}});
   expect(data.deliveries.find(x=>x.id===d.id)?.teamNotes).toBe('Synthetic team note');
   const {rotateShareLink,readShareLink}=await import('@/lib/installer/share');
   const share=await rotateShareLink(fixture.d1(),company,d.id,'fixture','http://localhost:3000');
   const token=new URL(share.url).hash.slice('#token='.length);
   expect(JSON.stringify(await readShareLink(fixture.d1(),token))).not.toContain('Synthetic team note');
   expect(JSON.stringify(fixture.sqlite.prepare("SELECT next_json FROM audit_events WHERE action='installer.team-notes'").all())).not.toContain('Synthetic team note');
 });
 it('erases notes on withdrawal and blocks later updates at the atomic boundary',async()=>{
   const d=await delivered();
   expect((await post({action:'save-team-notes',deliveryId:d.id,notes:'Synthetic private note',revision:0})).status).toBe(200);
   await suppressEnquiry(fixture.d1(),d.enquiryId,'fixture withdrawal','fixture');
   expect(fixture.sqlite.prepare('SELECT portal_team_notes FROM lead_recipient_deliveries WHERE id=?').get(d.id)?.portal_team_notes).toBe('');
   expect((await post({action:'save-team-notes',deliveryId:d.id,notes:'No',revision:1})).status).toBe(409);
   expect((await post({action:'report-outcome',deliveryId:d.id,outcome:'contacted'})).status).toBe(400);
 });
});
