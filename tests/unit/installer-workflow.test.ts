import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
const runtime=vi.hoisted(()=>({PHONE_VERIFICATION_SECRET:'fixture-secret-at-least-32-characters',ASSESSMENT_SIGNING_SECRET:'fixture-assessment-secret-at-least-32-characters',INSTALLER_PLATFORM_MODE:'local-test',DB:undefined as D1Database|undefined}));
vi.mock('@/lib/server/runtime',()=>({getRuntimeEnv:()=>runtime,requireDatabase:()=>runtime.DB!}));
import {FixtureDatabase,seedFixture,seedLead,syntheticAnswers} from '../installer/fixtures';
import {allocateEnquiry,createClaim,decideClaim,grantTrial,suppressEnquiry} from '@/lib/installer/deliveries';
import {phoneCodeHash,verificationBindings,verifyPhoneCode,phoneProof} from '@/lib/installer/phone-verification';
import {createAssessmentToken} from '@/lib/server/assessment-token';
import {getCurrentRelease} from '@/lib/server/releases';
import {NextRequest} from 'next/server';
import {defaultInstallerSettings} from '@/lib/installer/settings';
import {POST as submitLead} from '@/app/api/leads/route';

describe('installer workflow with real migration constraints and transactions',()=>{
  let fixture:FixtureDatabase;
  beforeEach(async()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-11T03:00:00Z'));fixture=new FixtureDatabase();runtime.DB=fixture.d1();await seedFixture(fixture.d1());});
  afterEach(()=>{fixture?.close();vi.useRealTimers();});
  const company=(index:number)=>`synthetic-company-${index}`;
  const count=(sql:string)=>Number(fixture.sqlite.prepare(sql).get()?.count);

  it('caps shared delivery at three across repeat submissions and competing workers',async()=>{
    const first=await seedLead(fixture.d1());
    const repeated=await seedLead(fixture.d1());
    expect(repeated.enquiryId).toBe(first.enquiryId);
    await Promise.all([allocateEnquiry(fixture.d1(),first.enquiryId,'fixture'),allocateEnquiry(fixture.d1(),repeated.enquiryId,'fixture')]);
    expect(count('SELECT count(*) AS count FROM lead_recipient_deliveries')).toBe(3);
    expect(count("SELECT count(*) AS count FROM installer_credit_ledger WHERE kind='delivery'")).toBe(3);
    expect(count('SELECT count(*) AS count FROM installer_outbox')).toBe(6);
    expect(count('SELECT count(*) AS count FROM installer_enquiry_leads')).toBe(2);
  });

  it('changing property answers cannot obtain another canonical identity or selling slots',async()=>{
    const original=await seedLead(fixture.d1());await allocateEnquiry(fixture.d1(),original.enquiryId,'fixture');
    const edited=await seedLead(fixture.d1(),'+66812345678',{...syntheticAnswers,propertyType:'townhouse',district:'bang-rak'});
    expect(edited.enquiryId).toBe(original.enquiryId);
    expect(count('SELECT count(*) AS count FROM installer_enquiries')).toBe(1);
    expect(fixture.sqlite.prepare('SELECT status,duplicate_state FROM installer_enquiries WHERE id=?').get(original.enquiryId)).toMatchObject({status:'review',duplicate_state:'property-review'});
    await allocateEnquiry(fixture.d1(),edited.enquiryId,'fixture');
    expect(count('SELECT count(*) AS count FROM lead_recipient_deliveries')).toBe(3);
  });

  it('configured qualification can change without rewriting historical assessment scoring',async()=>{
    const rejected=await seedLead(fixture.d1(),'+66812345005',{...syntheticAnswers,ownershipStatus:'renter',airConditionerCount:0});
    expect(fixture.sqlite.prepare('SELECT qualification_state FROM installer_enquiries WHERE id=?').get(rejected.enquiryId)?.qualification_state).toBe('review');
    const evidence=JSON.parse(String(fixture.sqlite.prepare("SELECT attribution_json FROM installer_operational_events WHERE enquiry_id=? AND event_type='qualification-evaluated'").get(rejected.enquiryId)?.attribution_json));
    expect(evidence).toMatchObject({ownerRequired:1,minimumAcUnits:4,minimumQuality:4,ownership:'renter',installedAcUnits:0,ownerCriterionMet:0,acCriterionMet:0});
    fixture.sqlite.prepare('UPDATE installer_platform_settings SET config_json=? WHERE id=1').run(JSON.stringify({...defaultInstallerSettings,collectionEnabled:true,deliveryPaused:false,ownerRequired:false,minimumAcUnits:0}));
    const allowed=await seedLead(fixture.d1(),'+66812345006',{...syntheticAnswers,ownershipStatus:'renter',airConditionerCount:0});
    expect(fixture.sqlite.prepare('SELECT hard_eligible FROM leads WHERE id=?').get(allowed.leadId)?.hard_eligible).toBe(0);
    expect(fixture.sqlite.prepare('SELECT qualification_state FROM installer_enquiries WHERE id=?').get(allowed.enquiryId)?.qualification_state).toBe('eligible');
    expect((await allocateEnquiry(fixture.d1(),allowed.enquiryId,'fixture',[company(1)])).allocated).toHaveLength(1);
  });

  it('uses two trial entitlements then purchased credits and cannot grant twice',async()=>{
    await grantTrial(fixture.d1(),company(1),'fixture');
    await expect(grantTrial(fixture.d1(),company(1),'fixture')).rejects.toThrow();
    for(let i=0;i<3;i++){const lead=await seedLead(fixture.d1(),`+6681234500${i}`);await allocateEnquiry(fixture.d1(),lead.enquiryId,'fixture',[company(1)]);}
    const account=fixture.sqlite.prepare('SELECT available,trial_remaining FROM installer_credit_accounts WHERE company_id=?').get(company(1));
    expect(account).toMatchObject({available:18,trial_remaining:0});
    expect(count("SELECT count(*) AS count FROM lead_recipient_deliveries WHERE funding_source='trial'")).toBe(2);
    expect(count("SELECT count(*) AS count FROM lead_recipient_deliveries WHERE funding_source='purchased'")).toBe(1);
  });

  it('competing allocations cannot overspend the last two credits',async()=>{
    fixture.sqlite.prepare("INSERT INTO installer_credit_ledger(id,company_id,kind,available_delta,idempotency_key,reason,actor,created_at) VALUES('reduce',?,'fixture-adjustment',-18,'reduce','fixture','fixture',?)").run(company(1),fixture.now);
    const a=await seedLead(fixture.d1(),'+66812345001');const b=await seedLead(fixture.d1(),'+66812345002');
    await Promise.all([allocateEnquiry(fixture.d1(),a.enquiryId,'fixture',[company(1)]),allocateEnquiry(fixture.d1(),b.enquiryId,'fixture',[company(1)])]);
    expect(count('SELECT count(*) AS count FROM lead_recipient_deliveries')).toBe(1);
    expect(fixture.sqlite.prepare('SELECT available FROM installer_credit_accounts WHERE company_id=?').get(company(1))?.available).toBe(0);
  });

  it('blocks paused, expired-contract, out-of-area, unverified and outside-hours requests',async()=>{
    const {enquiryId}=await seedLead(fixture.d1());
    fixture.sqlite.prepare('UPDATE solar_company_partners SET paused=1 WHERE id=?').run(company(1));
    fixture.sqlite.prepare("UPDATE solar_company_partners SET contract_expiry_date='2020-01-01' WHERE id=?").run(company(2));
    fixture.sqlite.prepare(`UPDATE solar_company_partners SET service_provinces_json='["phuket"]' WHERE id=?`).run(company(3));
    await allocateEnquiry(fixture.d1(),enquiryId,'fixture',[company(1),company(2),company(3)]);
    expect(count('SELECT count(*) AS count FROM lead_recipient_deliveries')).toBe(0);
    fixture.sqlite.prepare("UPDATE installer_enquiries SET verification_state='unverified' WHERE id=?").run(enquiryId);
    await allocateEnquiry(fixture.d1(),enquiryId,'fixture',[company(4)]);
    expect(count('SELECT count(*) AS count FROM lead_recipient_deliveries')).toBe(0);
    fixture.sqlite.prepare("UPDATE installer_enquiries SET verification_state='verified' WHERE id=?").run(enquiryId);
    vi.setSystemTime(new Date('2026-10-11T13:00:00Z'));fixture.now=new Date().toISOString();
    expect((await allocateEnquiry(fixture.d1(),enquiryId,'fixture')).reason).toBe('paused_or_outside_hours');
  });

  it('claim restoration is once-only and never reopens recipient slots',async()=>{
    const {enquiryId}=await seedLead(fixture.d1());await allocateEnquiry(fixture.d1(),enquiryId,'fixture');
    const delivery=fixture.sqlite.prepare('SELECT id,partner_id FROM lead_recipient_deliveries LIMIT 1').get()!;
    const claim=await createClaim(fixture.d1(),String(delivery.partner_id),String(delivery.id),'incorrect-contact','Synthetic proof');
    await decideClaim(fixture.d1(),claim.id,'approved','Synthetic approval','fixture');
    await decideClaim(fixture.d1(),claim.id,'approved','Repeated retry','fixture');
    expect(count("SELECT count(*) AS count FROM installer_credit_ledger WHERE kind='claim-restoration'")).toBe(1);
    await allocateEnquiry(fixture.d1(),enquiryId,'fixture');
    expect(count('SELECT count(*) AS count FROM lead_recipient_deliveries')).toBe(3);
    await expect(createClaim(fixture.d1(),company(4),String(delivery.id),'incorrect-contact','Wrong tenant')).rejects.toThrow('claim_window_closed');
    const other=fixture.sqlite.prepare('SELECT id,partner_id FROM lead_recipient_deliveries WHERE id<>? LIMIT 1').get(String(delivery.id))!;
    vi.setSystemTime(new Date('2026-10-19T03:00:00Z'));fixture.now=new Date().toISOString();
    await expect(createClaim(fixture.d1(),String(other.partner_id),String(other.id),'duplicate','Late')).rejects.toThrow('claim_window_closed');
  });

  it('invalid trial delivery restores an entitlement without creating cash or reopening company delivery',async()=>{
    await grantTrial(fixture.d1(),company(1),'fixture');
    const {enquiryId}=await seedLead(fixture.d1());const allocation=await allocateEnquiry(fixture.d1(),enquiryId,'fixture',[company(1)]);
    const claim=await createClaim(fixture.d1(),company(1),allocation.allocated[0],'incorrect-contact','Synthetic evidence');
    await decideClaim(fixture.d1(),claim.id,'approved','Restore trial','fixture');
    expect(fixture.sqlite.prepare('SELECT available,trial_remaining FROM installer_credit_accounts WHERE company_id=?').get(company(1))).toMatchObject({available:20,trial_remaining:2});
    await allocateEnquiry(fixture.d1(),enquiryId,'fixture',[company(1)]);
    expect(count('SELECT count(*) AS count FROM lead_recipient_deliveries')).toBe(1);
  });

  it('outside-window repeats await review and disabled future exclusive products cannot allocate',async()=>{
    const original=await seedLead(fixture.d1());
    fixture.sqlite.prepare("UPDATE installer_enquiries SET created_at='2026-08-01T03:00:00Z' WHERE id=?").run(original.enquiryId);
    const repeat=await seedLead(fixture.d1());expect(repeat.enquiryId).toBe(original.enquiryId);
    expect(fixture.sqlite.prepare('SELECT duplicate_state,status FROM installer_enquiries WHERE id=?').get(original.enquiryId)).toMatchObject({duplicate_state:'outside-window-review',status:'review'});
    await allocateEnquiry(fixture.d1(),repeat.enquiryId,'fixture');
    const exclusive=await seedLead(fixture.d1(),'+66812345004');
    fixture.sqlite.prepare("UPDATE installer_enquiries SET product='exclusive_residential',recipient_limit=1 WHERE id=?").run(exclusive.enquiryId);
    await allocateEnquiry(fixture.d1(),exclusive.enquiryId,'fixture');
    expect(count('SELECT count(*) AS count FROM lead_recipient_deliveries')).toBe(0);
  });

  it('withdrawal prevents pending allocation and future exclusive relabelling is locked',async()=>{
    const lead=await seedLead(fixture.d1());await suppressEnquiry(fixture.d1(),lead.enquiryId,'withdrawal','fixture');
    await allocateEnquiry(fixture.d1(),lead.enquiryId,'fixture');expect(count('SELECT count(*) AS count FROM lead_recipient_deliveries')).toBe(0);
    const other=await seedLead(fixture.d1(),'+66812345003');await allocateEnquiry(fixture.d1(),other.enquiryId,'fixture',[company(1)]);
    expect(()=>fixture.sqlite.prepare("UPDATE installer_enquiries SET product='exclusive_residential',recipient_limit=1 WHERE id=?").run(other.enquiryId)).toThrow('immutable');
  });

  it('atomic attempts issue one proof, bind phone/session and consumed proof cannot be reused',async()=>{
    const id=crypto.randomUUID(),phone='+66812345678',token='a'.repeat(50);const bindings=await verificationBindings(phone,token);
    await fixture.d1().prepare(`INSERT INTO installer_phone_challenges(id,phone_hash,phone_e164,code_hash,session_hash,created_at,expires_at,resend_after,mode,send_state) VALUES(?,?,?,?,?,?,?,?,?,?)`).bind(id,bindings.phoneHash,phone,await phoneCodeHash(id,'123456'),bindings.sessionHash,fixture.now,new Date(Date.now()+300000).toISOString(),fixture.now,'local-test','accepted').run();
    const proofs=await Promise.all([verifyPhoneCode(fixture.d1(),id,phone,token,'123456'),verifyPhoneCode(fixture.d1(),id,phone,token,'123456')]);
    expect(proofs.filter(Boolean)).toHaveLength(1);const proof=proofs.find(Boolean)!;
    expect(await phoneProof(fixture.d1(),id,proof,phone,'b'.repeat(50))).toBeNull();
    expect(await phoneProof(fixture.d1(),id,proof,'+66892345678',token)).toBeNull();
    expect(await phoneProof(fixture.d1(),id,proof,phone,token)).not.toBeNull();
    fixture.sqlite.prepare('UPDATE installer_phone_challenges SET consumed_at=? WHERE id=?').run(fixture.now,id);
    expect(await phoneProof(fixture.d1(),id,proof,phone,token)).toBeNull();
  });

  it('concurrent real lead API requests atomically consume one proof and register one canonical request',async()=>{
    const release=(await getCurrentRelease(fixture.d1()))!;
    const session=(await createAssessmentToken({releaseId:release.release_id,questionnaireVersionId:release.questionnaire_version_id,ruleVersionId:release.rule_version_id}))!;
    const id=crypto.randomUUID(),phone='+66812345678',bindings=await verificationBindings(phone,session.token);
    await fixture.d1().prepare(`INSERT INTO installer_phone_challenges(id,phone_hash,phone_e164,code_hash,session_hash,created_at,expires_at,resend_after,mode,send_state) VALUES(?,?,?,?,?,?,?,?,?,?)`).bind(id,bindings.phoneHash,phone,await phoneCodeHash(id,'123456'),bindings.sessionHash,fixture.now,new Date(Date.now()+300000).toISOString(),fixture.now,'local-test','accepted').run();
    const proof=await verifyPhoneCode(fixture.d1(),id,phone,session.token,'123456');
    vi.setSystemTime(new Date(Date.now()+2000));fixture.now=new Date().toISOString();
    const request=()=>new NextRequest('http://localhost/api/leads',{method:'POST',headers:{Origin:'http://localhost','Content-Type':'application/json'},body:JSON.stringify({legalFirstName:'Synthetic',legalLastName:'Homeowner',phone,contactMethod:'phone',phoneVerificationId:id,phoneVerificationProof:proof,adultConfirmed:true,consent:true,locale:'th',assessmentToken:session.token,idempotencyKey:crypto.randomUUID(),answers:syntheticAnswers})});
    const responses=await Promise.all([submitLead(request()),submitLead(request())]);
    expect(responses.map(response=>response.status).sort()).toEqual([201,403]);
    expect(count('SELECT count(*) AS count FROM leads')).toBe(1);
    expect(count('SELECT count(*) AS count FROM installer_enquiries')).toBe(1);
    expect(count('SELECT count(*) AS count FROM lead_score_history')).toBe(1);
    expect(fixture.sqlite.prepare('SELECT phone_verified_at FROM leads').get()?.phone_verified_at).toBe('2026-10-11T03:00:00.000Z');
    expect(await phoneProof(fixture.d1(),id,proof!,phone,session.token)).toBeNull();
  });
});
