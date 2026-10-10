import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
vi.mock('@/lib/server/runtime',()=>({getRuntimeEnv:()=>({INSTALLER_PLATFORM_MODE:'local-test',PHONE_VERIFICATION_SECRET:'fixture-phone-secret-thirty-two-characters'})}));
import {FixtureDatabase,seedFixture,seedLead,syntheticAnswers} from '../installer/fixtures';
import {allocateEnquiry,createClaim,suppressEnquiry} from '@/lib/installer/deliveries';
import {getPortalData,deliveryProjection} from '@/lib/installer/portal-data';
import {readShareLink,rotateShareLink} from '@/lib/installer/share';
import {reconcileOrder} from '@/lib/installer/payments';
import {reviewEnquiry} from '@/lib/installer/review';
let fixture:FixtureDatabase;
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-11T03:00:00.000Z'));fixture=new FixtureDatabase();});
afterEach(()=>{fixture.close();vi.useRealTimers();});
async function delivered(){const db=fixture.d1();await seedFixture(db);const lead=await seedLead(db);await db.prepare('UPDATE leads SET distribution_allowed=1 WHERE id=?').bind(lead.leadId).run();const result=await allocateEnquiry(db,lead.enquiryId,'fixture',['synthetic-company-1']);expect(result.allocated).toHaveLength(1);return {db,...lead,deliveryId:result.allocated[0]};}
const token=(url:string)=>new URLSearchParams(new URL(url).hash.slice(1)).get('token')!;
describe('tenant and delivery share boundaries',()=>{
  it('rejects another company share rotation, claim and private payment order',async()=>{
    const {db,deliveryId}=await delivered();
    await expect(rotateShareLink(db,'synthetic-company-2',deliveryId,'fixture','http://localhost:3000')).rejects.toThrow('delivery_unavailable');
    await expect(createClaim(db,'synthetic-company-2',deliveryId,'incorrect-contact','fixture')).rejects.toThrow('claim_window_closed');
    await db.prepare("INSERT INTO installer_payment_orders(id,company_id,package_id,credits,amount_minor,currency,status,provider,created_at,updated_at) VALUES('private-order','synthetic-company-1','shared-20',20,400000,'thb','pending','local-test','now','now')").run();
    await expect(reconcileOrder(db,'synthetic-company-2','private-order',new Request('http://localhost:3000/installers'))).rejects.toThrow('payment_order_not_found');
  });
  it('scopes inbox and financial records to authenticated membership',async()=>{
    const {db,deliveryId}=await delivered();for(const [user,company] of [['owner1','synthetic-company-1'],['owner2','synthetic-company-2']]){await db.prepare('INSERT INTO installer_auth_user(id,name,email,emailVerified,createdAt,updatedAt) VALUES(?,?,?,?,?,?)').bind(user,'Fixture',`${user}@example.test`,1,Date.now(),Date.now()).run();await db.prepare("INSERT INTO installer_memberships(id,company_id,user_id,role) VALUES(?,?,?,'owner')").bind(`member-${user}`,company,user).run();}
    const session=(id:string)=>({user:{id,name:'Fixture',email:`${id}@example.test`,emailVerified:true}});const own=await getPortalData(db,session('owner1')),other=await getPortalData(db,session('owner2'));
    expect(own.deliveries.map(d=>d.id)).toContain(deliveryId);expect(other.deliveries).toHaveLength(0);expect(other.ledger.some(row=>row.id==='seed-1')).toBe(false);expect(other.company?.id).toBe('synthetic-company-2');
    expect((await getPortalData(db,session('owner1'),deliveryId)).deliveries.map(row=>row.id)).toEqual([deliveryId]);
    expect((await getPortalData(db,session('owner2'),deliveryId)).deliveries).toEqual([]);
    expect((await getPortalData(db,session('owner1'),'not-owned-or-existent')).deliveries).toEqual([]);
    expect(own.terms.acceptedAt).toBeTruthy();
    fixture.sqlite.prepare("UPDATE solar_company_partners SET terms_version='historical-terms' WHERE id='synthetic-company-1'").run();
    expect((await getPortalData(db,session('owner1'))).terms.acceptedAt).toBeNull();
    expect(fixture.sqlite.prepare("SELECT terms_accepted_at FROM solar_company_partners WHERE id='synthetic-company-1'").get()?.terms_accepted_at).toBeTruthy();
  });
  it('supports repeated reads and rotation without billing or renewing claim deadline; expiry closes access',async()=>{
    const {db,deliveryId}=await delivered();const before=fixture.sqlite.prepare('SELECT * FROM lead_recipient_deliveries WHERE id=?').get(deliveryId)!;
    const first=await rotateShareLink(db,'synthetic-company-1',deliveryId,'fixture','http://localhost:3000');const one=await readShareLink(db,token(first.url));expect(one?.delivery.phone).toBe('+66812345678');expect(one?.delivery.homeownerName).toBe('');expect((await readShareLink(db,token(first.url)))?.delivery.id).toBe(deliveryId);expect(Object.keys(one!)).toEqual(['delivery','expiresAt']);
    const second=await rotateShareLink(db,'synthetic-company-1',deliveryId,'fixture','http://localhost:3000');expect(await readShareLink(db,token(first.url))).toBeNull();expect(await readShareLink(db,token(second.url))).not.toBeNull();
    const after=fixture.sqlite.prepare('SELECT * FROM lead_recipient_deliveries WHERE id=?').get(deliveryId)!;expect(after.available_at).toBe(before.available_at);expect(after.claim_deadline).toBe(before.claim_deadline);expect(fixture.sqlite.prepare("SELECT COUNT(*) n FROM installer_credit_ledger WHERE kind='delivery'").get()?.n).toBe(1);
    fixture.now='2099-01-01T00:00:00.000Z';expect(await readShareLink(db,token(second.url))).toBeNull();
  });
  it('revokes existing share access on withdrawal',async()=>{const {db,enquiryId,deliveryId}=await delivered();const link=await rotateShareLink(db,'synthetic-company-1',deliveryId,'fixture','http://localhost:3000');await suppressEnquiry(db,enquiryId,'Homeowner withdrew','fixture');expect(await readShareLink(db,token(link.url))).toBeNull();});
  it('projects only consented assessment whitelist and suppresses undisclosed names/phone',()=>{const projected=deliveryProjection({id:'fixture',fields_disclosed_json:'["assessmentAnswers"]',answers_json:JSON.stringify({propertyType:'home',email:'private@example.test',accessToken:'secret',phone:'+66812345678'}),legal_first_name:'Private',legal_last_name:'Name',phone_e164:'+66812345678',province:'bangkok'});expect(projected.assessment).toEqual({propertyType:'home'});expect(projected.phone).toBe('');expect(projected.homeownerName).toBe('');});
  it('reviewing a repeat cannot restore exhausted recipient slots',async()=>{
    const {db,enquiryId}=await delivered();await allocateEnquiry(db,enquiryId,'fixture');
    await reviewEnquiry(db,enquiryId,'same-project','Reviewed duplicate property evidence; same project','fixture');
    expect((await allocateEnquiry(db,enquiryId,'fixture')).allocated).toHaveLength(0);
    expect(fixture.sqlite.prepare('SELECT COUNT(DISTINCT partner_id) n FROM lead_recipient_deliveries WHERE enquiry_id=?').get(enquiryId)?.n).toBe(3);
  });
  it('cannot approve a same-property repeat as a distinct project with new selling slots',async()=>{
    const {db,enquiryId}=await delivered();const repeat=await seedLead(db);
    await expect(reviewEnquiry(db,enquiryId,'distinct-project','Reviewed requested separate project but same property','fixture',repeat.leadId)).rejects.toThrow('same_property_cannot_reset_recipient_slots');
    expect(fixture.sqlite.prepare('SELECT COUNT(*) n FROM installer_enquiries WHERE product=?').get('shared_residential')?.n).toBe(1);
  });
  it('reviews a genuinely distinct verified property without requiring the expired OTP secret',async()=>{
    const {db,enquiryId}=await delivered();
    const second=await seedLead(db,'+66812345678',{...syntheticAnswers,district:'bang-rak'});
    const reviewed=await reviewEnquiry(db,enquiryId,'distinct-project','Verified separate property with fresh recorded consent','fixture',second.leadId);
    expect(reviewed.id).not.toBe(enquiryId);
    expect(fixture.sqlite.prepare('SELECT enquiry_id FROM installer_enquiry_leads WHERE lead_id=?').get(second.leadId)?.enquiry_id).toBe(reviewed.id);
    expect(fixture.sqlite.prepare("SELECT COUNT(*) n FROM audit_events WHERE action='installer.distinct-project-approved'").get()?.n).toBe(1);
  });
  it('never reports distinct-project approval or writes a success audit without verified evidence',async()=>{
    const {db,enquiryId}=await delivered();
    const second=await seedLead(db,'+66812345678',{...syntheticAnswers,district:'bang-rak'});
    fixture.sqlite.prepare('UPDATE leads SET phone_verified_at=NULL WHERE id=?').run(second.leadId);
    await expect(reviewEnquiry(db,enquiryId,'distinct-project','No durable verification; cannot approve separate property','fixture',second.leadId)).rejects.toThrow('valid_new_request_required');
    expect(fixture.sqlite.prepare("SELECT COUNT(*) n FROM audit_events WHERE action='installer.distinct-project-approved'").get()?.n).toBe(0);
    expect(fixture.sqlite.prepare('SELECT COUNT(*) n FROM installer_enquiries').get()?.n).toBe(1);
  });
  it('records unmatched requests and retries the same canonical enquiry when capacity returns',async()=>{
    const db=fixture.d1();await seedFixture(db);const lead=await seedLead(db);
    fixture.sqlite.prepare('UPDATE solar_company_partners SET paused=1').run();
    expect((await allocateEnquiry(db,lead.enquiryId,'fixture')).allocated).toHaveLength(0);
    expect(fixture.sqlite.prepare('SELECT status FROM installer_enquiries WHERE id=?').get(lead.enquiryId)?.status).toBe('unmatched');
    fixture.sqlite.prepare("UPDATE solar_company_partners SET paused=0 WHERE id='synthetic-company-1'").run();
    expect((await allocateEnquiry(db,lead.enquiryId,'fixture')).allocated).toHaveLength(1);
  });
});
