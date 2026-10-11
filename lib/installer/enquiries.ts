import type { EstimateAnswers } from '@/lib/calculator/types';
import { encodeBase64Url, hmacSha256 } from '@/lib/server/crypto';
import { getRuntimeEnv } from '@/lib/server/runtime';
import { normalizeThaiPhone } from '@/lib/validation/lead';

export type SubmissionMode='production'|'sandbox'|'local-test'|'restricted-preview';
type RegistrationSettings = { distributionWindowDays:number;duplicateWindowDays:number;minimumQuality:number;recipientLimit:number;ownerRequired?:boolean;minimumAcUnits?:number;ruleVersion?:string;submissionMode?:SubmissionMode };
const stableText = (value?:string) => (value??'').normalize('NFKC').trim().replace(/\s+/gu,' ').toLocaleLowerCase('en');

export async function canonicalEnquiryKey(phone:string, answers:EstimateAnswers,submissionMode:SubmissionMode='production') {
  const env=getRuntimeEnv() as unknown as Record<string,string>;
  const secret=env.PHONE_VERIFICATION_SECRET;
  if (!secret || secret.length<32) throw new Error('Enquiry registration unavailable.');
  // Timing and calculator answers cannot renew the same property's recipient slots.
  const property = [normalizeThaiPhone(phone),stableText(answers.province),stableText(answers.district),stableText(answers.customProvince??answers.customLocation),stableText(answers.propertyType),stableText(answers.customPropertyType)];
  const key=encodeBase64Url(await hmacSha256(`canonical-enquiry:v1:${JSON.stringify(property)}`,secret));
  return submissionMode==='production'?key:`${submissionMode}:${key}`;
}

/** Include these statements in the SAME D1 batch as guarded lead insertion/proof consumption. */
export async function canonicalEnquiryStatements(database:D1Database, leadId:string, phone:string, answers:EstimateAnswers, settings:RegistrationSettings):Promise<D1PreparedStatement[]> {
  const runtimeMode=getRuntimeEnv().INSTALLER_PLATFORM_MODE;
  const mode=settings.submissionMode??(runtimeMode==='local-test'||runtimeMode==='sandbox'?runtimeMode:'production');
  const canonicalKey=await canonicalEnquiryKey(phone,answers,mode);
  const id=crypto.randomUUID();
  const now=new Date().toISOString();
  const expires=new Date(Date.now()+settings.distributionWindowDays*86_400_000).toISOString();
  const qualified="(?=0 OR ownership_status='owner') AND air_conditioner_count>=? AND quality_score>=? AND quote_contact_requested=1 AND third_party_disclosure_authorized_v2=1";
  const policy=[settings.ownerRequired===false?0:1,settings.minimumAcUnits??4,settings.minimumQuality];
  const sameContext=`(
    (?='production' AND prior.is_test_submission=0 AND prior.submission_environment='production' AND COALESCE(prior.submission_mode,'production')='production')
    OR (?='sandbox' AND prior.is_test_submission=1 AND prior.submission_mode='sandbox')
    OR (?='local-test' AND prior.is_test_submission=1 AND (prior.submission_mode='local-test' OR (prior.submission_mode IS NULL AND prior.submission_environment='private_development_preview')))
    OR (?='restricted-preview' AND prior.is_test_submission=1 AND (prior.submission_mode='restricted-preview' OR (prior.submission_mode IS NULL AND prior.submission_environment='restricted_site_operational')))
  )`;
  const contexts=[mode,mode,mode,mode];
  return [
    database.prepare(`INSERT OR IGNORE INTO installer_enquiries(id,canonical_key,lead_id,created_at,request_expires_at,verification_state,qualification_state,duplicate_state,status,product,recipient_limit,rule_version)
      SELECT ?,?,id,?,?, 'verified',CASE WHEN ${qualified} THEN 'eligible' ELSE 'review' END,'original',
        CASE WHEN ${qualified} THEN 'queued' ELSE 'review' END,'shared_residential',?,? FROM leads WHERE id=?
        AND NOT EXISTS(SELECT 1 FROM installer_enquiries existing JOIN leads prior ON prior.id=existing.lead_id WHERE prior.phone_e164=? AND ${sameContext})`)
      .bind(id,canonicalKey,now,expires,...policy,...policy,Math.min(3,settings.recipientLimit),settings.ruleVersion??'installer-rules-v1',leadId,normalizeThaiPhone(phone),...contexts),
    database.prepare(`INSERT OR IGNORE INTO installer_enquiry_leads(lead_id,enquiry_id,created_at)
      SELECT ?,e.id,? FROM installer_enquiries e JOIN leads prior ON prior.id=e.lead_id
      WHERE (e.canonical_key=? OR prior.phone_e164=?) AND ${sameContext} AND EXISTS(SELECT 1 FROM leads WHERE id=?)
      ORDER BY CASE WHEN e.canonical_key=? THEN 0 ELSE 1 END,e.created_at,e.id LIMIT 1`).bind(leadId,now,canonicalKey,normalizeThaiPhone(phone),...contexts,leadId,canonicalKey),
    database.prepare(`UPDATE installer_enquiries SET duplicate_state=CASE WHEN canonical_key<>? THEN 'property-review' WHEN julianday(?)>julianday(created_at)+? THEN 'outside-window-review' ELSE 'repeat' END,
      status=CASE WHEN canonical_key<>? OR julianday(?)>julianday(created_at)+? THEN 'review' ELSE status END
      WHERE lead_id<>? AND EXISTS(SELECT 1 FROM installer_enquiry_leads WHERE lead_id=? AND enquiry_id=installer_enquiries.id)`)
      .bind(canonicalKey,now,settings.duplicateWindowDays,canonicalKey,now,settings.duplicateWindowDays,leadId,leadId),
    database.prepare(`INSERT INTO installer_operational_events(id,event_type,enquiry_id,attribution_json,created_at)
      SELECT ?,'qualification-evaluated',el.enquiry_id,json_object('sourceLeadId',l.id,'ruleVersion',?,'ownerRequired',?,'minimumAcUnits',?,'minimumQuality',?,
        'ownership',l.ownership_status,'installedAcUnits',l.air_conditioner_count,'qualityScore',l.quality_score,
        'ownerCriterionMet',CASE WHEN ?=0 OR l.ownership_status='owner' THEN 1 ELSE 0 END,
        'acCriterionMet',CASE WHEN l.air_conditioner_count>=? THEN 1 ELSE 0 END,
        'qualityCriterionMet',CASE WHEN l.quality_score>=? THEN 1 ELSE 0 END),?
      FROM leads l JOIN installer_enquiry_leads el ON el.lead_id=l.id WHERE l.id=?`)
      .bind(crypto.randomUUID(),settings.ruleVersion??'installer-rules-v1',...policy,...policy,now,leadId),
  ];
}
