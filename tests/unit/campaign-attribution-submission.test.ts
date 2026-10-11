import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({restricted:false}));
const runtime=vi.hoisted(()=>({INSTALLER_PLATFORM_MODE:'production',INSTALLER_BASE_URL:'https://solar.example.test',PHONE_VERIFICATION_SECRET:'synthetic-phone-secret-more-than-thirty-two',ASSESSMENT_SIGNING_SECRET:'synthetic-assessment-secret-more-than-thirty-two',CAMPAIGN_ATTRIBUTION_ENABLED:'true',CAMPAIGN_ATTRIBUTION_PRIVACY_REVIEWED:'true',DB:undefined as D1Database|undefined}));
vi.mock('@/lib/server/runtime',()=>({getRuntimeEnv:()=>runtime,requireDatabase:()=>runtime.DB!}));
vi.mock('@/lib/server/private-preview-auth',()=>({authenticateRestrictedSiteOwner:async()=>state.restricted?{email:'owner@example.test'}:null}));
vi.mock('@/lib/server/contact-mode',async original=>{
  const actual=await original<typeof import('@/lib/server/contact-mode')>();
  const ready=(row:Parameters<typeof actual.publicContactConfiguration>[0])=>actual.publicContactConfiguration({...row,contact_collection_mode:'shared_solar_company_handoff',contact_collection_enabled:1,public_collection_enabled:1,restricted_site_collection_enabled:1,legal_complete:1,retention_days:180,distribution_window_days:7,recipient_category:'solar_service_recipients',active_partner_count:1,adult_confirmation_version_id:'synthetic-adult',consent_version_id:'synthetic-consent',privacy_notice_version_id:'synthetic-privacy',terms_version_id:'synthetic-terms',cookie_policy_version_id:'synthetic-cookies'});
  return {...actual,publicContactConfiguration:ready,restrictedOperationalContactConfiguration:ready};
});
import {NextRequest} from 'next/server';
import {FixtureDatabase,seedFixture,syntheticAnswers} from '../installer/fixtures';
import {getCurrentRelease} from '@/lib/server/releases';
import {createAssessmentToken} from '@/lib/server/assessment-token';
import {sha256} from '@/lib/server/crypto';
import {verificationBindings} from '@/lib/installer/phone-verification';
import {getPlatformSettings} from '@/lib/installer/settings';
import {POST} from '@/app/api/leads/route';
import {ATTRIBUTION_CATALOG} from '@/lib/analytics/attribution';
let fixture:FixtureDatabase;
beforeEach(async()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-11T03:00:00Z'));
  Object.assign(runtime,{INSTALLER_PLATFORM_MODE:'production',INSTALLER_BASE_URL:'https://solar.example.test',CAMPAIGN_ATTRIBUTION_ENABLED:'true',CAMPAIGN_ATTRIBUTION_PRIVACY_REVIEWED:'true'});state.restricted=false;
  fixture=new FixtureDatabase();runtime.DB=fixture.d1();await seedFixture(runtime.DB);
});
afterEach(()=>{fixture.close();runtime.DB=undefined;vi.useRealTimers();});
async function verifiedRequest() {
  const db=fixture.d1(),release=(await getCurrentRelease(db))!;
  await db.prepare('UPDATE contact_configuration_versions SET public_collection_enabled=1 WHERE id=?').bind(release.contact_configuration_version_id).run();
  await db.prepare("UPDATE public_releases SET live_lead_submissions=1,receiving_company_en='Synthetic',receiving_company_th='ทดสอบ',receiving_company_privacy_url='https://example.test/privacy',retention_days=180 WHERE id=?").bind(release.release_id).run();
  await db.prepare('UPDATE legal_document_versions SET is_complete=1 WHERE id=?').bind(release.legal_document_version_id).run();
  const token=(await createAssessmentToken({releaseId:release.release_id,questionnaireVersionId:release.questionnaire_version_id,ruleVersionId:release.rule_version_id}))!.token;
  const challengeId=crypto.randomUUID(),proof='p'.repeat(43),bindings=await verificationBindings('0812345678',token);
  await db.prepare(`INSERT INTO installer_phone_challenges(id,phone_hash,phone_e164,session_hash,code_hash,expires_at,resend_after,mode,send_state,verified_at,proof_hash,created_at)
    VALUES(?,?,?,?,?,?,?,?,'accepted',?,?,?)`).bind(challengeId,bindings.phoneHash,'+66812345678',bindings.sessionHash,'synthetic-unused','2026-10-11T03:05:00Z','2026-10-11T03:01:00Z',runtime.INSTALLER_PLATFORM_MODE,'2026-10-11T03:00:00Z',await sha256(proof),'2026-10-11T03:00:00Z').run();
  vi.advanceTimersByTime(2000);
  return {challengeId,body:{legalFirstName:'Synthetic',legalLastName:'Review',phone:'0812345678',contactMethod:'phone',adultConfirmed:true,consent:true,locale:'en',assessmentToken:token,phoneVerificationId:challengeId,phoneVerificationProof:proof,idempotencyKey:crypto.randomUUID(),website:'',answers:syntheticAnswers,attribution:ATTRIBUTION_CATALOG[2]}};
}
function request(body:unknown){return new NextRequest(`${runtime.INSTALLER_BASE_URL}/api/leads`,{method:'POST',headers:{Origin:runtime.INSTALLER_BASE_URL,'Content-Type':'application/json'},body:JSON.stringify(body)});}
describe('campaign capture belongs only to the authorised final submission transaction',()=>{
  it.each(['production','sandbox','local-test','restricted-preview'] as const)('captures the original approved %s classification and safe codes',async mode=>{
    runtime.INSTALLER_PLATFORM_MODE=mode==='restricted-preview'?'production':mode;
    runtime.INSTALLER_BASE_URL=mode==='local-test'?'http://localhost:3000':'https://solar.example.test';state.restricted=mode==='restricted-preview';
    const {body}=await verifiedRequest();expect((await POST(request(body))).status).toBe(201);
    expect(fixture.sqlite.prepare('SELECT campaign_code,source_code,medium_code,submission_mode,original_qualified FROM lead_campaign_attribution').get())
      .toEqual({campaign_code:'pilot-search',source_code:'google',medium_code:'cpc',submission_mode:mode,original_qualified:1});
  });
  it('capture is absent with either privacy switch off but contact submission still succeeds',async()=>{
    runtime.CAMPAIGN_ATTRIBUTION_PRIVACY_REVIEWED='false';const {body}=await verifiedRequest();expect((await POST(request(body))).status).toBe(201);
    expect(fixture.sqlite.prepare('SELECT count(*) n FROM leads').get()?.n).toBe(1);
    expect(fixture.sqlite.prepare('SELECT count(*) n FROM lead_campaign_attribution').get()?.n).toBe(0);
  });
  it('stores unknown for an older client with no attribution, never infers direct from server referrer',async()=>{
    const {body}=await verifiedRequest();expect((await POST(request({...body,attribution:undefined}))).status).toBe(201);
    expect(fixture.sqlite.prepare('SELECT campaign_code FROM lead_campaign_attribution').get()?.campaign_code).toBe('unknown');
  });
  it('a valid request rejected by qualification is captured as original rejected acquisition',async()=>{
    const {body}=await verifiedRequest();expect((await POST(request({...body,answers:{...body.answers,ownershipStatus:'renter',ownerPermission:'yes'}}))).status).toBe(201);
    expect(fixture.sqlite.prepare('SELECT original_qualified FROM lead_campaign_attribution').get()?.original_qualified).toBe(0);
    expect(fixture.sqlite.prepare('SELECT qualification_state FROM installer_enquiries').get()?.qualification_state).toBe('review');
  });
  it('idempotent retries cannot rewrite original campaign or add acquisition',async()=>{
    const {body}=await verifiedRequest();expect((await POST(request(body))).status).toBe(201);
    expect((await POST(request({...body,attribution:ATTRIBUTION_CATALOG[3]}))).status).toBe(200);
    expect(fixture.sqlite.prepare('SELECT count(*) n,campaign_code FROM lead_campaign_attribution').get()).toMatchObject({n:1,campaign_code:'pilot-search'});
  });
  it('never stores campaign PII, arbitrary slugs, URLs or additional fields',async()=>{
    const {body,challengeId}=await verifiedRequest();
    for(const attribution of [{...body.attribution,campaign:'somchai-0812345678'},{...body.attribution,source:'https://example.test/private'},
      {...body.attribution,assessmentAnswers:body.answers},{...body.attribution,medium:'messaging'}])expect((await POST(request({...body,attribution}))).status).toBe(400);
    expect(fixture.sqlite.prepare('SELECT count(*) n FROM leads').get()?.n).toBe(0);
    expect(fixture.sqlite.prepare('SELECT consumed_at FROM installer_phone_challenges WHERE id=?').get(challengeId)?.consumed_at).toBeNull();
  });
  it('pause intervening at the commit boundary writes neither acquisition nor proof consumption',async()=>{
    const {body,challengeId}=await verifiedRequest(),settings=await getPlatformSettings(fixture.d1()),original=fixture.batch.bind(fixture);
    fixture.batch=async statements=>{
      if(statements.length>3)fixture.sqlite.prepare('UPDATE installer_platform_settings SET config_json=? WHERE id=1').run(JSON.stringify({...settings,platformPaused:true}));
      return original(statements);
    };
    expect((await POST(request(body))).status).toBe(503);
    expect(fixture.sqlite.prepare('SELECT count(*) n FROM lead_campaign_attribution').get()?.n).toBe(0);
    expect(fixture.sqlite.prepare('SELECT count(*) n FROM leads').get()?.n).toBe(0);
    expect(fixture.sqlite.prepare('SELECT consumed_at FROM installer_phone_challenges WHERE id=?').get(challengeId)?.consumed_at).toBeNull();
  });
  it('a late attribution failure rolls back lead/proof/canonical changes rather than recording partial acquisition',async()=>{
    const {body,challengeId}=await verifiedRequest(),original=fixture.batch.bind(fixture);
    fixture.batch=async statements=>original(statements.length>3?[...statements,fixture.d1().prepare('INSERT INTO intentionally_missing_attribution_table(id) VALUES(1)')]:statements);
    expect((await POST(request(body))).status).toBe(500);
    expect(fixture.sqlite.prepare('SELECT count(*) n FROM leads').get()?.n).toBe(0);
    expect(fixture.sqlite.prepare('SELECT count(*) n FROM installer_enquiries').get()?.n).toBe(0);
    expect(fixture.sqlite.prepare('SELECT count(*) n FROM lead_campaign_attribution').get()?.n).toBe(0);
    expect(fixture.sqlite.prepare('SELECT consumed_at FROM installer_phone_challenges WHERE id=?').get(challengeId)?.consumed_at).toBeNull();
  });
});
