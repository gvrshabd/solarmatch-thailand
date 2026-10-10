import { canonicalEnquiryKey } from './enquiries';
import { getPlatformSettings } from './settings';
import { isoNow,parseJson,platformAudit,type Row } from './deliveries';
import type { EstimateAnswers } from '@/lib/calculator/types';

export async function reviewEnquiry(db:D1Database,enquiryId:string,decision:'same-project'|'distinct-project'|'reject',reason:string,actor:string,leadId?:string) {
  if(reason.trim().length<20)throw new Error('document_review_reason');
  const enquiry=await db.prepare('SELECT * FROM installer_enquiries WHERE id=?').bind(enquiryId).first<Row>();
  if(!enquiry)throw new Error('enquiry_missing');
  if(decision!=='distinct-project'){
    await db.batch([db.prepare(`UPDATE installer_enquiries SET duplicate_state=CASE WHEN ?='same-project' THEN 'repeat' ELSE duplicate_state END,status=CASE WHEN ?='same-project' AND verification_state='verified' AND qualification_state='eligible' AND suppressed_at IS NULL AND julianday(request_expires_at)>julianday('now') THEN 'queued' ELSE 'review' END WHERE id=?`).bind(decision,decision,enquiryId),platformAudit(db,actor,'duplicate-review',enquiryId,{decision,reason})]);
    return {id:enquiryId};
  }
  if(!leadId||leadId===enquiry.lead_id)throw new Error('separate_project_evidence_required');
  const lead=await db.prepare(`SELECT l.* FROM leads l JOIN installer_enquiry_leads el ON el.lead_id=l.id WHERE l.id=? AND el.enquiry_id=? AND l.suppressed=0 AND l.consent_withdrawn_at IS NULL AND l.purged_at IS NULL AND l.third_party_disclosure_authorized_v2=1 AND l.quote_contact_requested=1 AND julianday(l.distribution_expires_at)>julianday('now')`).bind(leadId,enquiryId).first<Row>();
  if(!lead||!lead.phone_e164||!lead.phone_verified_at)throw new Error('valid_new_request_required');
  const key=await canonicalEnquiryKey(String(lead.phone_e164),parseJson<EstimateAnswers>(lead.answers_json,{} as EstimateAnswers));
  if(key===enquiry.canonical_key)throw new Error('same_property_cannot_reset_recipient_slots');
  const settings=await getPlatformSettings(db);const id=crypto.randomUUID();const now=isoNow();
  const eligible=(!settings.ownerRequired||lead.ownership_status==='owner')&&Number(lead.air_conditioner_count)>=settings.minimumAcUnits&&Number(lead.quality_score)>=settings.minimumQuality;
  const result=await db.batch([db.prepare(`INSERT INTO installer_enquiries(id,canonical_key,lead_id,created_at,request_expires_at,verification_state,qualification_state,duplicate_state,status,product,recipient_limit,rule_version)
    SELECT ?,?,l.id,l.created_at,l.distribution_expires_at,'verified',?,'original',?,'shared_residential',?,? FROM leads l
    WHERE l.id=? AND l.phone_verified_at IS NOT NULL AND l.suppressed=0 AND l.consent_withdrawn_at IS NULL AND l.purged_at IS NULL
    AND l.third_party_disclosure_authorized_v2=1 AND l.quote_contact_requested=1 AND julianday(l.distribution_expires_at)>julianday('now')
    AND EXISTS(SELECT 1 FROM installer_enquiry_leads el WHERE el.lead_id=l.id AND el.enquiry_id=?)`)
    .bind(id,key,eligible?'eligible':'review',eligible?'queued':'review',settings.recipientLimit,settings.ruleVersion,leadId,enquiryId),
    db.prepare('UPDATE installer_enquiry_leads SET enquiry_id=? WHERE lead_id=? AND enquiry_id=? AND EXISTS(SELECT 1 FROM installer_enquiries WHERE id=?)').bind(id,leadId,enquiryId,id),
    db.prepare(`INSERT INTO audit_events(id,actor_email,action,entity_type,entity_id,next_json)
      SELECT ?,?,'installer.distinct-project-approved','installer_platform',?,? WHERE EXISTS(SELECT 1 FROM installer_enquiries WHERE id=?)`)
      .bind(crypto.randomUUID(),actor,id,JSON.stringify({previousEnquiryId:enquiryId,leadId,reason,reviewedAt:now}),id),
  ]);
  if(result[0].meta.changes!==1)throw new Error('valid_new_request_required');
  return {id};
}
