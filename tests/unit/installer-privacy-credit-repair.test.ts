import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
const runtime=vi.hoisted(()=>({INSTALLER_PLATFORM_MODE:'local-test',PHONE_VERIFICATION_SECRET:'fixture-phone-secret-thirty-two-characters'}));
vi.mock('@/lib/server/runtime',()=>({getRuntimeEnv:()=>runtime}));
import {FixtureDatabase,seedFixture,seedLead} from '../installer/fixtures';
import {allocateEnquiry,createClaim,decideClaim,grantTrial,suppressEnquiry,adjustPurchasedCredits} from '@/lib/installer/deliveries';
import {getPortalData} from '@/lib/installer/portal-data';
import {redactInstallerLeads} from '@/lib/installer/privacy';
import {recordLocalPayment} from '@/lib/installer/payments';
import {readShareLink,rotateShareLink} from '@/lib/installer/share';
import {reconcileNotification} from '@/lib/installer/notification-reconciliation';

const company='synthetic-company-1';
const request=new Request('http://localhost:3000/installers');
const session=(id='owner1')=>({user:{id,name:'Synthetic owner',email:`${id}@example.test`,emailVerified:true}});
let fixture:FixtureDatabase;
beforeEach(async()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-11T03:00:00Z'));
  runtime.INSTALLER_PLATFORM_MODE='local-test';
  fixture=new FixtureDatabase();await seedFixture(fixture.d1());
  for(const [user,id] of [['owner1',company],['owner2','synthetic-company-2']]) {
    fixture.sqlite.prepare('INSERT INTO installer_auth_user(id,name,email,emailVerified,createdAt,updatedAt) VALUES(?,?,?,?,?,?)').run(user,'Synthetic',`${user}@example.test`,1,Date.now(),Date.now());
    fixture.sqlite.prepare("INSERT INTO installer_memberships(id,company_id,user_id,role) VALUES(?,?,?,'owner')").run(`membership-${user}`,id,user);
  }
});
afterEach(()=>{fixture.close();vi.useRealTimers();});
async function delivery(phone='+66812345678') {
  const lead=await seedLead(fixture.d1(),phone);
  const allocated=await allocateEnquiry(fixture.d1(),lead.enquiryId,'fixture',[company]);
  expect(allocated.allocated).toHaveLength(1);
  return {...lead,id:allocated.allocated[0]};
}
const account=()=>fixture.sqlite.prepare('SELECT available,debt,trial_remaining FROM installer_credit_accounts WHERE company_id=?').get(company)!;
async function order(id:string) {
  fixture.sqlite.prepare("INSERT INTO installer_payment_orders(id,company_id,package_id,credits,amount_minor,currency,status,provider,created_at,updated_at) VALUES(?,?,'credits-20',20,400000,'thb','pending','local-test',?,?)").run(id,company,new Date().toISOString(),new Date().toISOString());
  return recordLocalPayment(fixture.d1(),id,'paid',request);
}
async function claim(id:string) {return createClaim(fixture.d1(),company,id,'incorrect-contact','Synthetic claim evidence');}

describe('allocation separates trusted server modes',()=>{
  it.each(['production','sandbox'])('rejects historical preview fixtures in %s and allows matching classification',async(mode)=>{
    const lead=await seedLead(fixture.d1());runtime.INSTALLER_PLATFORM_MODE=mode;
    expect((await allocateEnquiry(fixture.d1(),lead.enquiryId,'fixture',[company])).allocated).toEqual([]);
    expect(account().available).toBe(20);
    fixture.sqlite.prepare('UPDATE leads SET submission_mode=?,is_test_submission=?,submission_environment=? WHERE id=?').run(mode,mode==='production'?0:1,mode==='production'?'production':'private_development_preview',lead.leadId);
    const allocation=await allocateEnquiry(fixture.d1(),lead.enquiryId,'fixture',[company]);expect(allocation.allocated).toHaveLength(1);
    expect(fixture.sqlite.prepare('SELECT allocation_environment FROM lead_recipient_deliveries WHERE id=?').get(allocation.allocated[0])?.allocation_environment).toBe(mode);
    expect(()=>fixture.sqlite.prepare("UPDATE lead_recipient_deliveries SET allocation_environment='local-test' WHERE id=?").run(allocation.allocated[0])).toThrow('delivery allocation environment is immutable');
  });
  it('never admits production or restricted-preview leads to local distribution, and off rejects all allocation',async()=>{
    const lead=await seedLead(fixture.d1());
    fixture.sqlite.prepare("UPDATE leads SET submission_mode='production',is_test_submission=0,submission_environment='production' WHERE id=?").run(lead.leadId);
    expect((await allocateEnquiry(fixture.d1(),lead.enquiryId,'fixture',[company])).allocated).toEqual([]);
    fixture.sqlite.prepare("UPDATE leads SET submission_mode='restricted-preview',is_test_submission=1,submission_environment='private_development_preview' WHERE id=?").run(lead.leadId);
    expect((await allocateEnquiry(fixture.d1(),lead.enquiryId,'fixture',[company])).allocated).toEqual([]);
    runtime.INSTALLER_PLATFORM_MODE='off';
    expect((await allocateEnquiry(fixture.d1(),lead.enquiryId,'fixture',[company])).reason).toBe('platform_unavailable');
    expect(account().available).toBe(20);
  });
});

describe('withdrawn financial delivery access',()=>{
  it('does not expose homeowner details in claim free text after withdrawal',async()=>{
    const d=await delivery(),marker='SYNTHETIC_WITHDRAWN_CLAIM_PERSONAL_MARKER';
    const filed=await createClaim(fixture.d1(),company,d.id,marker,marker);
    fixture.sqlite.prepare('UPDATE installer_claims SET decision_notes=? WHERE id=?').run(marker,filed.id);
    await suppressEnquiry(fixture.d1(),d.enquiryId,'Synthetic withdrawal','fixture');
    const portal=await getPortalData(fixture.d1(),session(),d.id);
    expect(portal.claims[0]).toMatchObject({id:filed.id,deliveryId:d.id,status:'submitted',reason:'withdrawn-claim',decision:null});
    expect(JSON.stringify(portal)).not.toContain(marker);
    expect(fixture.sqlite.prepare('SELECT reason,decision_notes FROM installer_claims WHERE id=?').get(filed.id)).toMatchObject({reason:marker,decision_notes:marker});
  });
  it('retains company-scoped financial access and claim window while redacting contact and staff access',async()=>{
    const d=await delivery();const before=(await getPortalData(fixture.d1(),session(),d.id)).deliveries[0];
    const link=await rotateShareLink(fixture.d1(),company,d.id,'fixture','http://localhost:3000');
    await suppressEnquiry(fixture.d1(),d.enquiryId,'Synthetic withdrawal','fixture');
    const financial=(await getPortalData(fixture.d1(),session(),d.id)).deliveries[0];
    expect(financial).toBeDefined();
    expect(financial).toMatchObject({id:d.id,reference:before.reference,product:before.product,creditCost:2,deliveredAt:before.deliveredAt,claimDeadline:before.claimDeadline,withdrawn:true,homeownerName:'',phone:'',location:'',assessment:{},requestedAt:'',qualification:'',outcome:null});
    expect((await getPortalData(fixture.d1(),session())).deliveries).toHaveLength(1);
    expect((await getPortalData(fixture.d1(),session('owner2'),d.id)).deliveries).toEqual([]);
    await expect(createClaim(fixture.d1(),'synthetic-company-2',d.id,'incorrect-contact','Wrong company')).rejects.toThrow('claim_window_closed');
    expect(await readShareLink(fixture.d1(),new URLSearchParams(new URL(link.url).hash.slice(1)).get('token')!)).toBeNull();
    await expect(rotateShareLink(fixture.d1(),company,d.id,'fixture','http://localhost:3000')).rejects.toThrow('delivery_unavailable');
    await claim(d.id);
    expect((await getPortalData(fixture.d1(),session(),d.id)).claims).toHaveLength(1);
  });
  it('keeps existing claims visible after withdrawal and rejects new claims after the original deadline',async()=>{
    const d=await delivery();const filed=await claim(d.id);await suppressEnquiry(fixture.d1(),d.enquiryId,'Synthetic withdrawal after claim','fixture');
    expect((await getPortalData(fixture.d1(),session(),d.id)).deliveries).toHaveLength(1);
    expect((await getPortalData(fixture.d1(),session(),d.id)).claims[0].id).toBe(filed.id);
    const second=await delivery('+66812345679');await suppressEnquiry(fixture.d1(),second.enquiryId,'Synthetic withdrawal','fixture');
    vi.setSystemTime(new Date('2026-10-19T03:00:00Z'));fixture.now=new Date().toISOString();
    await expect(claim(second.id)).rejects.toThrow('claim_window_closed');
    expect((await getPortalData(fixture.d1(),session(),second.id)).deliveries[0].claimDeadline).toBe('2026-10-18T03:00:00.000Z');
  });
});

describe('canonical purge includes administrative notes and audit evidence',()=>{
  it('redacts the suppression reason audited against the canonical enquiry id',async()=>{
    const d=await delivery();const marker='SYNTHETIC_CANONICAL_SUPPRESSION_PRIVATE_MARKER';
    await suppressEnquiry(fixture.d1(),d.enquiryId,marker,'fixture');
    await redactInstallerLeads(fixture.d1(),[d.leadId],'fixture');
    expect(JSON.stringify(fixture.sqlite.prepare("SELECT * FROM audit_events WHERE action='installer.suppress'").all())).not.toContain(marker);
  });
  it('removes distinctive private markers throughout canonical duplicates and linked financial/notification records',async()=>{
    const d=await delivery();const duplicate=await seedLead(fixture.d1());const marker='SYNTHETIC_PRIVATE_PERSON_668123_MARKER';
    const filed=await createClaim(fixture.d1(),company,d.id,marker,marker);
    fixture.sqlite.prepare('UPDATE installer_claims SET decision_notes=? WHERE id=?').run(marker,filed.id);
    const outbox=`homeowner-${d.id}`;
    fixture.sqlite.prepare("UPDATE installer_outbox SET state='needs-reconciliation' WHERE id=?").run(outbox);
    await reconcileNotification(fixture.d1(),outbox,'accepted',`${marker} verified synthetic notification evidence.`,`SM${'a'.repeat(32)}`,'fixture','local-test');
    await suppressEnquiry(fixture.d1(),d.enquiryId,marker,'fixture');
    fixture.sqlite.prepare('UPDATE installer_outbox SET last_error=? WHERE enquiry_id=?').run(marker,d.enquiryId);
    fixture.sqlite.prepare('UPDATE lead_recipient_deliveries SET rejection_reason=? WHERE id=?').run(marker,d.id);
    fixture.sqlite.prepare("INSERT INTO privacy_rights_requests(id,lead_id,request_type,received_channel,received_at,resolution_notes,created_by,updated_by) VALUES('privacy-marker',?,'deletion','other',?,?, 'fixture','fixture')").run(duplicate.leadId,new Date().toISOString(),marker);
    fixture.sqlite.prepare("INSERT INTO installer_operational_events(id,event_type,enquiry_id,delivery_id,attribution_json,created_at) VALUES('event-marker','fixture',?,?,?,?)").run(d.enquiryId,d.id,JSON.stringify({note:marker}),new Date().toISOString());
    fixture.sqlite.prepare('INSERT INTO audit_events(id,actor_email,action,entity_type,entity_id,next_json) VALUES(?,?,?,?,?,?)').run('operational-audit','fixture','fixture','installer_operational_event','event-marker',JSON.stringify({note:marker}));
    fixture.sqlite.prepare('INSERT INTO installer_test_messages(id,channel,recipient,body,created_at) VALUES(?,?,?,?,?)').run(outbox,'sms',marker,marker,new Date().toISOString());
    fixture.sqlite.prepare('INSERT INTO lead_notes(id,lead_id,note,actor_email) VALUES(?,?,?,?)').run('note-marker',duplicate.leadId,marker,'fixture');
    fixture.sqlite.prepare('INSERT INTO audit_events(id,actor_email,action,entity_type,entity_id,next_json) VALUES(?,?,?,?,?,?)').run('note-audit','fixture','fixture','lead_note','note-marker',JSON.stringify({note:marker}));
    expect((await redactInstallerLeads(fixture.d1(),[duplicate.leadId],'fixture')).purged).toBe(2);
    for(const table of ['leads','installer_enquiries','installer_claims','installer_outbox','privacy_rights_requests','audit_events','installer_operational_events','installer_test_messages','lead_recipient_deliveries']) {
      expect(JSON.stringify(fixture.sqlite.prepare(`SELECT * FROM ${table}`).all()),table).not.toContain(marker);
    }
    expect(fixture.sqlite.prepare('SELECT count(*) n FROM lead_recipient_deliveries').get()?.n).toBe(1);
    expect(fixture.sqlite.prepare("SELECT action FROM audit_events WHERE entity_id=? AND action='installer.suppress'").get(d.enquiryId)?.action).toBe('installer.suppress');
    expect(account().available).toBe(18);
    expect(fixture.sqlite.prepare("SELECT next_json FROM audit_events WHERE action='lead.personally-redacted' LIMIT 1").get()?.next_json).toBe('{"irreversible":true,"financialFactsRetained":true}');
  });
});

describe('purchased claim restoration offsets reversal debt',()=>{
  it('applies positive administrator adjustments against debt and rejects bypasses at the ledger boundary',async()=>{
    fixture.sqlite.prepare('UPDATE installer_credit_accounts SET available=0,debt=5 WHERE company_id=?').run(company);
    await adjustPurchasedCredits(fixture.d1(),company,2,'Synthetic compensation','fixture');
    expect(account()).toMatchObject({available:0,debt:3});
    await adjustPurchasedCredits(fixture.d1(),company,5,'Synthetic compensation','fixture');
    expect(account()).toMatchObject({available:2,debt:0});
    await adjustPurchasedCredits(fixture.d1(),company,-1,'Synthetic debit','fixture');
    expect(account()).toMatchObject({available:1,debt:0});
    const before=fixture.sqlite.prepare('SELECT count(*) n FROM installer_credit_ledger').get()?.n;
    await expect(adjustPurchasedCredits(fixture.d1(),company,-2,'Excess synthetic debit','fixture')).rejects.toThrow('insufficient credit balance');
    expect(fixture.sqlite.prepare('SELECT count(*) n FROM installer_credit_ledger').get()?.n).toBe(before);
    fixture.sqlite.prepare('UPDATE installer_credit_accounts SET debt=2 WHERE company_id=?').run(company);
    expect(()=>fixture.sqlite.prepare("INSERT INTO installer_credit_ledger(id,company_id,kind,available_delta,idempotency_key,reason,actor,created_at) VALUES('unsafe-adjust',?,'manual-adjustment',1,'unsafe-adjust','fixture','fixture',?)").run(company,new Date().toISOString())).toThrow('incoming credits must repay debt first');
  });
  it('repays the spent two credits after a full purchase reversal without available balance or duplicate restoration',async()=>{
    fixture.sqlite.prepare('UPDATE installer_credit_accounts SET available=0 WHERE company_id=?').run(company);
    await order('reversed-order');const d=await delivery();await recordLocalPayment(fixture.d1(),'reversed-order','reversed',request);
    expect(account()).toMatchObject({available:0,debt:2});const filed=await claim(d.id);
    await decideClaim(fixture.d1(),filed.id,'approved','Synthetic approval','fixture');
    expect(account()).toMatchObject({available:0,debt:0});
    await Promise.all([decideClaim(fixture.d1(),filed.id,'approved','Replay','fixture'),decideClaim(fixture.d1(),filed.id,'approved','Concurrent replay','fixture')]);
    expect(account()).toMatchObject({available:0,debt:0});
    const entry=fixture.sqlite.prepare("SELECT available_delta,debt_delta FROM installer_credit_ledger WHERE kind='claim-restoration'").get();
    expect(entry).toMatchObject({available_delta:0,debt_delta:-2});
    expect(fixture.sqlite.prepare("SELECT count(*) n FROM installer_credit_ledger WHERE kind='claim-restoration'").get()?.n).toBe(1);
    expect((await getPortalData(fixture.d1(),session())).balance.debt).toBe(0);
    expect((await getPortalData(fixture.d1(),session())).ledger.find(row=>row.kind==='claim-restoration')?.units).toBe(2);
  });
  it.each([{debt:1,available:1,remainingDebt:0},{debt:5,available:0,remainingDebt:3}])('handles restoration relative to debt $debt',async({debt,available,remainingDebt})=>{
    const d=await delivery();fixture.sqlite.prepare('UPDATE installer_credit_accounts SET available=0,debt=? WHERE company_id=?').run(debt,company);
    const filed=await claim(d.id);await decideClaim(fixture.d1(),filed.id,'approved','Synthetic approval','fixture');
    expect(account()).toMatchObject({available,debt:remainingDebt});
    expect((await getPortalData(fixture.d1(),session())).balance.debt).toBe(remainingDebt);
  });
  it('keeps trial restorations separate from purchased debt and preserves lifetime sharing slots',async()=>{
    await grantTrial(fixture.d1(),company,'fixture');const d=await delivery();await allocateEnquiry(fixture.d1(),d.enquiryId,'fixture');
    fixture.sqlite.prepare('UPDATE installer_credit_accounts SET available=0,debt=2 WHERE company_id=?').run(company);
    const filed=await claim(d.id);await decideClaim(fixture.d1(),filed.id,'approved','Synthetic trial restoration','fixture');
    expect(account()).toMatchObject({available:0,debt:2,trial_remaining:2});
    expect((await allocateEnquiry(fixture.d1(),d.enquiryId,'fixture')).allocated).toEqual([]);
    expect(fixture.sqlite.prepare('SELECT count(DISTINCT partner_id) n FROM lead_recipient_deliveries WHERE enquiry_id=?').get(d.enquiryId)?.n).toBe(3);
    expect(()=>fixture.sqlite.prepare("UPDATE installer_credit_ledger SET debt_delta=0 WHERE kind='claim-restoration'").run()).toThrow('ledger is immutable');
  });
  it('serializes two independent restorations against current debt',async()=>{
    const first=await delivery();const second=await delivery('+66812345679');
    const claims=await Promise.all([claim(first.id),claim(second.id)]);
    fixture.sqlite.prepare('UPDATE installer_credit_accounts SET available=0,debt=3 WHERE company_id=?').run(company);
    await Promise.all(claims.map(c=>decideClaim(fixture.d1(),c.id,'approved','Synthetic concurrent approval','fixture')));
    expect(account()).toMatchObject({available:1,debt:0});
    expect(fixture.sqlite.prepare("SELECT sum(available_delta-debt_delta) n FROM installer_credit_ledger WHERE kind='claim-restoration'").get()?.n).toBe(4);
  });
  it('rolls back approval and audit when the restoration cannot commit',async()=>{
    const d=await delivery();const filed=await claim(d.id);const before=account();
    fixture.sqlite.exec("CREATE TRIGGER synthetic_restore_failure BEFORE INSERT ON installer_credit_ledger WHEN NEW.kind='claim-restoration' BEGIN SELECT RAISE(ABORT,'synthetic restoration failure'); END;");
    await expect(decideClaim(fixture.d1(),filed.id,'approved','Synthetic approval','fixture')).rejects.toThrow('synthetic restoration failure');
    expect(fixture.sqlite.prepare('SELECT status FROM installer_claims WHERE id=?').get(filed.id)?.status).toBe('submitted');
    expect(account()).toEqual(before);
    expect(fixture.sqlite.prepare("SELECT count(*) n FROM audit_events WHERE action='installer.decide-claim'").get()?.n).toBe(0);
  });
  it('combines a new purchase and restoration using the debt at each serialized commit',async()=>{
    const d=await delivery();const filed=await claim(d.id);
    fixture.sqlite.prepare('UPDATE installer_credit_accounts SET available=0,debt=3 WHERE company_id=?').run(company);
    await Promise.all([order('concurrent-order'),decideClaim(fixture.d1(),filed.id,'approved','Synthetic approval','fixture')]);
    expect(account()).toMatchObject({available:19,debt:0});
    expect(fixture.sqlite.prepare("SELECT sum(available_delta-debt_delta) n FROM installer_credit_ledger WHERE kind IN('purchase','claim-restoration')").get()?.n).toBe(22);
  });
});
