import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
const runtime=vi.hoisted(()=>({INSTALLER_PLATFORM_MODE:'local-test',INSTALLER_BASE_URL:'http://localhost:3000',PHONE_VERIFICATION_SECRET:'synthetic-phone-secret-more-than-thirty-two',ASSESSMENT_SIGNING_SECRET:'synthetic-assessment-secret-more-than-thirty-two',DB:undefined as D1Database|undefined}));
vi.mock('@/lib/server/runtime',()=>({getRuntimeEnv:()=>runtime,requireDatabase:()=>runtime.DB!}));
vi.mock('@/lib/server/private-preview-auth',()=>({authenticateRestrictedSiteOwner:async()=>null}));
vi.mock('@/lib/server/contact-mode',async original=>{
  const actual=await original<typeof import('@/lib/server/contact-mode')>();
  return {...actual,publicContactConfiguration:(row:Parameters<typeof actual.publicContactConfiguration>[0])=>actual.publicContactConfiguration({...row,contact_collection_mode:'shared_solar_company_handoff',contact_collection_enabled:1,public_collection_enabled:1,legal_complete:1,retention_days:180,distribution_window_days:7,recipient_category:'solar_service_recipients',active_partner_count:1,adult_confirmation_version_id:'synthetic-adult',consent_version_id:'synthetic-consent',privacy_notice_version_id:'synthetic-privacy',terms_version_id:'synthetic-terms',cookie_policy_version_id:'synthetic-cookies'})};
});
import {NextRequest} from 'next/server';
import {FixtureDatabase,seedFixture,syntheticAnswers} from '../installer/fixtures';
import {getCurrentRelease,publishHomeownerDesignV3Release,getPublicAssessmentConfig} from '@/lib/server/releases';
import {createAssessmentToken} from '@/lib/server/assessment-token';
import {sha256} from '@/lib/server/crypto';
import {verificationBindings} from '@/lib/installer/phone-verification';
import {POST} from '@/app/api/leads/route';
import {calculateContactAssessment,contactConsumption} from '@/lib/qualification/contact-consumption';
import {CONTACT_CONSUMPTION_VERSION,consumptionSummary,storedContactConsumption} from '@/lib/qualification/consumption-snapshot';
import {calculateLeadAssessment,initialScoringConfiguration} from '@/lib/qualification/scoring';
import {deliveryProjection} from '@/lib/installer/portal-data';
import {assessmentRows} from '@/lib/installer/assessment-display';
import {contactLaunchReviewCopy,legalReviewContentVersion} from '@/config/legal-review';
import type {EstimateAnswers} from '@/lib/calculator/types';

const kwh:EstimateAnswers={...syntheticAnswers,estimateModelVersion:'energy-v3',calculationReferenceDate:'2026-10-19',roofArea:'100-200',consumptionInput:'kwh',monthlyBillThb:0,monthlyConsumptionKwh:1200,billingPeriodDays:30,tariffCategory:'ordinary-1.2'};
let fixture:FixtureDatabase;
beforeEach(async()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-19T03:00:00Z'));fixture=new FixtureDatabase();fixture.now='2026-10-19T03:00:00.000Z';runtime.DB=fixture.d1();await seedFixture(runtime.DB);const old=(await getCurrentRelease(runtime.DB))!;await publishHomeownerDesignV3Release(runtime.DB,{actor:'synthetic',expectedCurrentReleaseId:old.release_id});});
afterEach(()=>{fixture.close();runtime.DB=undefined;vi.useRealTimers();});
async function payload(answers=kwh,policy:string|undefined=CONTACT_CONSUMPTION_VERSION){
 const db=fixture.d1(),r=(await getCurrentRelease(db))!;
 const config=await getPublicAssessmentConfig({request:new Request('http://localhost:3000/api/assessment/config')});
 expect(config.contactInputSupport).toMatchObject({policyVersion:CONTACT_CONSUMPTION_VERSION,kwh:true});
 const token=policy===CONTACT_CONSUMPTION_VERSION?config.assessmentToken!:(await createAssessmentToken({releaseId:r.release_id,questionnaireVersionId:r.questionnaire_version_id,ruleVersionId:r.rule_version_id,contactInputPolicy:policy}))!.token;
 expect(token).toBeTruthy();
 const id=crypto.randomUUID(),proof='p'.repeat(43),bindings=await verificationBindings('0812345678',token);
 await db.prepare(`INSERT INTO installer_phone_challenges(id,phone_hash,phone_e164,session_hash,code_hash,expires_at,resend_after,mode,send_state,verified_at,proof_hash,created_at) VALUES(?,?,?,?,?,?,?,'local-test','accepted',?,?,?)`).bind(id,bindings.phoneHash,'+66812345678',bindings.sessionHash,'unused','2026-10-19T03:05:00Z','2026-10-19T03:01:00Z','2026-10-19T03:00:00Z',await sha256(proof),'2026-10-19T03:00:00Z').run();
 vi.advanceTimersByTime(2000);
 return {legalFirstName:'Synthetic',legalLastName:'Review',phone:'0812345678',contactMethod:'phone',adultConfirmed:true,consent:true,locale:'en',assessmentToken:token,phoneVerificationId:id,phoneVerificationProof:proof,idempotencyKey:crypto.randomUUID(),website:'',answers};
}
const request=(body:unknown)=>new NextRequest('http://localhost:3000/api/leads',{method:'POST',headers:{Origin:'http://localhost:3000','Content-Type':'application/json'},body:JSON.stringify(body)});

describe('versioned consumption and controlled final submission',()=>{
 it('preserves raw kWh/period and zero absent bill, stores server-derived provenance and one consented enquiry on retries',async()=>{
   const p=await payload();const response=await POST(request(p));expect(response.status).toBe(201);
   const row=fixture.sqlite.prepare('SELECT * FROM leads').get()!;
   expect(JSON.parse(String(row.answers_json))).toMatchObject({consumptionInput:'kwh',monthlyConsumptionKwh:1200,billingPeriodDays:30,monthlyBillThb:0});
   const c=storedContactConsumption(row.scoring_explanation_json)!;
   expect(c).toMatchObject({version:CONTACT_CONSUMPTION_VERSION,input:'kwh',reportedBillThb:null,reportedKwh:1200,billingPeriodDays:30,periodAssumed:false,tariff:{authority:'MEA',referenceDate:'2026-10-19'}});
   expect(row.monthly_bill_thb).toBe(Math.floor(c.qualificationBillThb));expect(c.monthlyKwh).toBeCloseTo(1200/30*365/12);
   expect(row.raw_score).toBe(calculateLeadAssessment({...kwh,monthlyBillThb:c.qualificationBillThb}).rawPoints);
   expect(JSON.parse(String(row.scoring_explanation_json)).factors.find((f:{key:string})=>f.key==='monthly-bill').explanationEn).toContain('no bill supplied');
   expect(row.consent_version).toBe(`local-test:${legalReviewContentVersion}`);expect(row.consent_text_en).toBe(contactLaunchReviewCopy.consent.en);expect(row.consent_text_th).toBe(contactLaunchReviewCopy.consent.th);expect(row.phone_verified_at).toBeTruthy();
   expect((await POST(request(p))).status).toBe(200);
   expect(fixture.sqlite.prepare('SELECT count(*) n FROM leads').get()?.n).toBe(1);expect(fixture.sqlite.prepare('SELECT count(*) n FROM installer_enquiries').get()?.n).toBe(1);
   expect(fixture.sqlite.prepare('SELECT count(*) n FROM lead_score_history').get()?.n).toBe(1);
   expect(fixture.sqlite.prepare('SELECT count(*) n FROM lead_recipient_deliveries').get()?.n).toBe(0);
   expect(fixture.sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
 });
 it.each(['en','th'])('normalizes %s kWh while ignoring a leftover slider bill and forged snapshots',async locale=>{
   const p=await payload({...kwh,monthlyBillThb:99999});
   const r=await POST(request({...p,locale,answers:{...p.answers,consumption:{reportedBillThb:99999,qualificationBillThb:99999}}}));expect(r.status).toBe(201);
   const row=fixture.sqlite.prepare('SELECT * FROM leads').get()!;const c=storedContactConsumption(row.scoring_explanation_json)!;
   expect(c.reportedBillThb).toBeNull();expect(c.qualificationBillThb).toBeLessThan(10000);expect(JSON.parse(String(row.answers_json))).not.toHaveProperty('consumption');
 });
 it('rejects a legacy token policy, invalid OTP, missing consent and top-level forged score',async()=>{
   const p=await payload(kwh,'actual-bill-v1');expect((await POST(request(p))).status).toBe(422);
   const valid=await payload();expect((await POST(request({...valid,phoneVerificationProof:'z'.repeat(43)}))).status).toBe(403);
   expect((await POST(request({...valid,consent:false}))).status).toBe(400);expect((await POST(request({...valid,score:100}))).status).toBe(400);
   expect(fixture.sqlite.prepare('SELECT count(*) n FROM leads').get()?.n).toBe(0);
 });
 it('preserves independent owner/four-AC rules and never adds tax/export/future loads to qualification',()=>{
   const n=calculateContactAssessment(kwh,initialScoringConfiguration);expect(n.assessment.hardEligible).toBe(true);
   expect(calculateContactAssessment({...kwh,ownershipStatus:'renter',ownerPermission:'yes'},initialScoringConfiguration).assessment.hardEligible).toBe(false);
   expect(calculateContactAssessment({...kwh,airConditionerCount:3},initialScoringConfiguration).assessment.hardEligible).toBe(false);
   expect(contactConsumption({...kwh,plannedLoadChanges:[{kind:'ev',startDate:'2027-01-01',monthlyKwh:500}]})).toEqual(n.consumption);
   const bill={...syntheticAnswers,monthlyBillThb:6000};expect(calculateContactAssessment(bill,initialScoringConfiguration).assessment).toEqual(calculateLeadAssessment(bill));
 });
 it.each([{tariffCategory:'tou'},{tariffCategory:'unknown'},{projectType:'expand-existing',solarOnlyIllustration:true},{monthlyConsumptionKwh:100000},{calculationReferenceDate:'2027-01-01'}] as Partial<EstimateAnswers>[])('rejects unsupported kWh normalization %j',changes=>{expect(()=>contactConsumption({...kwh,...changes})).toThrow('contact_consumption_input_not_supported');});
 it('does not authorise public collection just because kWh integration is supported',async()=>{
   const p=await payload();
   fixture.sqlite.prepare("UPDATE installer_platform_settings SET config_json=json_set(config_json,'$.collectionEnabled',json('false'),'$.platformPaused',json('true')) WHERE id=1").run();
   const config=await getPublicAssessmentConfig();expect(config.contactInputSupport).toMatchObject({kwh:true,policyVersion:CONTACT_CONSUMPTION_VERSION});
   expect(config.assessmentToken).toBeNull();expect((await POST(request(p))).status).toBe(503);expect(fixture.sqlite.prepare('SELECT count(*) n FROM leads').get()?.n).toBe(0);
 });
 it('shows actual kWh rather than an invented bill in installer adapters, and redacts after withdrawal',()=>{
   const row={id:'synthetic',enquiry_id:'synthetic',fields_disclosed_json:'["assessmentAnswers"]',answers_json:JSON.stringify(kwh),monthly_bill_thb:6000};
   const projected=deliveryProjection(row);expect(projected.assessment).not.toHaveProperty('monthlyBillThb');
   expect(assessmentRows(projected.assessment,true)).toEqual(expect.arrayContaining([expect.objectContaining({key:'monthlyConsumptionKwh',value:'1,200 kWh'}),expect.objectContaining({key:'billInputStatus',value:'Not supplied'})]));
   expect(deliveryProjection({...row,withdrawal_suppressed:1}).assessment).toEqual({});
   expect(consumptionSummary(contactConsumption(kwh),0)).toContain('no bill supplied');
 });
});
