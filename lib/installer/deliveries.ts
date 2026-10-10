import { getPlatformSettings, withinDeliveryHours } from './settings';
import { auditStatement } from '@/lib/server/audit';

export type Row = Record<string, string | number | null>;
export const parseJson = <T>(value: unknown, fallback: T): T => { try { return typeof value === 'string' ? JSON.parse(value) as T : fallback; } catch { return fallback; } };
export const isoNow = () => new Date().toISOString();
export function platformAudit(db:D1Database,actor:string,action:string,id:string,next?:unknown) {
  return auditStatement(db,{actorEmail:actor,action:`installer.${action}`,entityType:'installer_platform',entityId:id,next});
}

/** The DB trigger is the final authority: debit, slot, outbox and rotation commit together. */
export async function allocateEnquiry(db:D1Database,enquiryId:string,actor:string,requestedCompanyIds?:string[]) {
  const settings=await getPlatformSettings(db);
  if(settings.deliveryPaused||!settings.collectionEnabled||!withinDeliveryHours(new Date(),settings)) return {allocated:[],reason:'paused_or_outside_hours'};
  const enquiry=await db.prepare('SELECT * FROM installer_enquiries WHERE id=?').bind(enquiryId).first<Row>();
  if(!enquiry) throw new Error('enquiry_not_found');
  const candidates=await db.prepare(`SELECT p.id FROM solar_company_partners p JOIN installer_credit_accounts a ON a.company_id=p.id
    WHERE p.approval_status='approved' AND p.paused=0 AND p.active=1 AND p.archived_at IS NULL AND a.debt=0
    AND (a.trial_remaining>0 OR a.available>=?) ORDER BY p.rotation_sequence,p.created_at,p.id`).bind(settings.sharedCredits).all<{id:string}>();
  const allocated:string[]=[];
  for(const company of candidates.results) {
    if(requestedCompanyIds&&!requestedCompanyIds.includes(company.id)) continue;
    const id=crypto.randomUUID();const now=isoNow();
    try {
      const committed=await db.batch([
        db.prepare(`INSERT INTO lead_recipient_deliveries(id,lead_id,partner_id,consent_version,privacy_notice_version_id,disclosure_purpose,fields_disclosed_json,
          delivered_at,delivered_by,delivery_method,distribution_expires_at,created_at,updated_at,enquiry_id,product,credit_cost,price_minor,funding_source,available_at,claim_deadline,delivery_channel)
          SELECT ?,l.id,?,l.consent_version,l.privacy_notice_version_id,'residential_solar_site_survey_and_quotation',l.disclosed_fields_snapshot_json,
          ?,?,'manual-email',e.request_expires_at,?,?,e.id,'shared_residential',?,?,
          CASE WHEN a.trial_remaining>0 THEN 'trial' ELSE 'purchased' END,?,?,'portal'
          FROM installer_enquiries e JOIN leads l ON l.id=e.lead_id JOIN installer_credit_accounts a ON a.company_id=? WHERE e.id=?`)
          .bind(id,company.id,now,actor,now,now,settings.sharedCredits,settings.sharedCredits*settings.creditValueMinor,now,new Date(Date.now()+settings.claimDays*86400000).toISOString(),company.id,enquiryId),
        db.prepare(`INSERT INTO audit_events(id,actor_email,action,entity_type,entity_id,next_json)
          SELECT ?,?,'installer.allocate','installer_platform',?,? WHERE EXISTS(SELECT 1 FROM lead_recipient_deliveries WHERE id=?)`)
          .bind(crypto.randomUUID(),actor,id,JSON.stringify({enquiryId,companyId:company.id}),id),
      ]);
      if(committed[0].meta.changes===1)allocated.push(id);
    } catch(error) {
      // Eligibility can change between selection and INSERT. Never relax it on retry.
      const message=error instanceof Error?error.message:'';
      if(!/constraint|eligible|capacity|credit|funding|duplicate|limit|paused|hours|consent|contract|territory|delivery|trial|terms|enquiry|recipient|suppressed|expired|UNIQUE/iu.test(message)) throw error;
    }
  }
  if(!allocated.length)await db.prepare(`UPDATE installer_enquiries SET status='unmatched' WHERE id=? AND status IN ('queued','unmatched')
    AND verification_state='verified' AND qualification_state='eligible' AND suppressed_at IS NULL AND julianday(request_expires_at)>julianday('now')
    AND NOT EXISTS(SELECT 1 FROM lead_recipient_deliveries WHERE enquiry_id=?)`).bind(enquiryId,enquiryId).run();
  return {allocated,reason:allocated.length?'allocated':'no_eligible_company_or_capacity'};
}
export async function processQueue(db:D1Database,actor:string) {
  const pending=await db.prepare("SELECT id FROM installer_enquiries WHERE status IN ('queued','partially-delivered','unmatched') AND suppressed_at IS NULL AND julianday(request_expires_at)>julianday('now') ORDER BY created_at,id LIMIT 50").all<{id:string}>();
  const results=[];for(const item of pending.results) results.push({enquiryId:item.id,...await allocateEnquiry(db,item.id,actor)});
  return results;
}
export async function grantTrial(db:D1Database,companyId:string,actor:string) {
  const now=isoNow();
  const settings=await getPlatformSettings(db);
  if(settings.trialDeliveries===0)throw new Error('trial_disabled');
  await db.batch([
    db.prepare(`INSERT INTO installer_trial_grants(company_id,created_at,actor) SELECT id,?,? FROM solar_company_partners WHERE id=? AND approval_status='approved'`).bind(now,actor,companyId),
    db.prepare(`INSERT INTO installer_credit_ledger(id,company_id,kind,available_delta,reserved_delta,trial_delta,debt_delta,source_id,idempotency_key,reason,actor,created_at)
      SELECT ?,company_id,'trial-grant',0,0,?,0,company_id,?,'Configured shared trial once per company',?,? FROM installer_trial_grants WHERE company_id=?`)
      .bind(crypto.randomUUID(),settings.trialDeliveries,`trial:${companyId}`,actor,now,companyId),
    db.prepare('UPDATE solar_company_partners SET trial_granted_at=? WHERE id=?').bind(now,companyId),
    platformAudit(db,actor,'trial-grant',companyId),
  ]);
}
export async function createClaim(db:D1Database,companyId:string,deliveryId:string,reason:string,notes:string) {
  const id=crypto.randomUUID();const now=isoNow();
  const inserted=await db.prepare(`INSERT INTO installer_claims(id,delivery_id,company_id,reason,notes,status,submitted_at)
    SELECT ?,id,partner_id,?,?,'submitted',? FROM lead_recipient_deliveries WHERE id=? AND partner_id=? AND delivery_channel='portal'
    AND julianday(claim_deadline)>=julianday(?) RETURNING id`).bind(id,reason,notes,now,deliveryId,companyId,now).first();
  if(!inserted) throw new Error('claim_window_closed');
  return {id};
}
export async function decideClaim(db:D1Database,claimId:string,decision:string,notes:string,actor:string) {
  const now=isoNow();
  await db.batch([
    db.prepare(`UPDATE installer_claims SET status=?,decision_notes=?,resolved_at=?,resolved_by=? WHERE id=? AND status IN ('submitted','needs-information')`).bind(decision,notes,decision==='needs-information'?null:now,actor,claimId),
    db.prepare(`INSERT OR IGNORE INTO installer_credit_ledger(id,company_id,kind,available_delta,reserved_delta,trial_delta,debt_delta,source_id,idempotency_key,reason,actor,created_at)
      SELECT ?,c.company_id,'claim-restoration',CASE WHEN d.funding_source='purchased' THEN d.credit_cost ELSE 0 END,0,CASE WHEN d.funding_source='trial' THEN 1 ELSE 0 END,0,c.id,?,'Approved quality claim',?,?
      FROM installer_claims c JOIN lead_recipient_deliveries d ON d.id=c.delivery_id WHERE c.id=? AND c.status='approved'`)
      .bind(crypto.randomUUID(),`claim:${claimId}`,actor,now,claimId),
    platformAudit(db,actor,'decide-claim',claimId,{decision}),
  ]);
}
export async function suppressEnquiry(db:D1Database,enquiryId:string,reason:string,actor:string) {
  const now=isoNow();
  await db.batch([
    db.prepare("UPDATE installer_enquiries SET suppressed_at=?,suppression_reason=?,status='suppressed' WHERE id=?").bind(now,reason,enquiryId),
    db.prepare('UPDATE leads SET suppressed=1,suppressed_at=?,suppression_reason=? WHERE id IN (SELECT lead_id FROM installer_enquiry_leads WHERE enquiry_id=?)').bind(now,reason,enquiryId),
    db.prepare('UPDATE installer_share_tokens SET revoked_at=? WHERE delivery_id IN (SELECT id FROM lead_recipient_deliveries WHERE enquiry_id=?) AND revoked_at IS NULL').bind(now,enquiryId),
    db.prepare("UPDATE installer_outbox SET state='cancelled',updated_at=? WHERE enquiry_id=? AND state IN ('pending','failed') AND kind<>'withdrawal'").bind(now,enquiryId),
    db.prepare(`INSERT OR IGNORE INTO installer_outbox(id,delivery_id,enquiry_id,company_id,kind,state,attempts,next_attempt_at,created_at,updated_at)
      SELECT lower(hex(randomblob(16))),id,enquiry_id,partner_id,'withdrawal','pending',0,?,?,? FROM lead_recipient_deliveries WHERE enquiry_id=?`).bind(now,now,now,enquiryId),
    platformAudit(db,actor,'suppress',enquiryId,{reason}),
  ]);
}
