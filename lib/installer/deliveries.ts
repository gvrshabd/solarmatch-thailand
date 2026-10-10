import { getPlatformSettings, withinDeliveryHours } from './settings';
import { auditStatement } from '@/lib/server/audit';
import { beginJobRun,finishJobRun } from './operations';
import { installerAllocationNow } from './test-clock';

export type Row = Record<string, string | number | null>;
export const parseJson = <T>(value: unknown, fallback: T): T => { try { return typeof value === 'string' ? JSON.parse(value) as T : fallback; } catch { return fallback; } };
export const isoNow = () => new Date().toISOString();
export function platformAudit(db:D1Database,actor:string,action:string,id:string,next?:unknown) {
  return auditStatement(db,{actorEmail:actor,action:`installer.${action}`,entityType:'installer_platform',entityId:id,next});
}

/** The DB trigger is the final authority: debit, slot, outbox and rotation commit together. */
export async function allocateEnquiry(db:D1Database,enquiryId:string,actor:string,requestedCompanyIds?:string[]) {
  const settings=await getPlatformSettings(db);
  const allocationTime=await installerAllocationNow(db);
  if(settings.platformPaused||settings.deliveryPaused||!settings.collectionEnabled||!withinDeliveryHours(allocationTime,settings)) return {allocated:[],reason:'paused_or_outside_hours'};
  const enquiry=await db.prepare('SELECT * FROM installer_enquiries WHERE id=?').bind(enquiryId).first<Row>();
  if(!enquiry) throw new Error('enquiry_not_found');
  const candidates=await db.prepare(`SELECT p.id FROM solar_company_partners p JOIN installer_credit_accounts a ON a.company_id=p.id
    WHERE p.approval_status='approved' AND p.paused=0 AND p.active=1 AND p.archived_at IS NULL AND a.debt=0
    AND (a.trial_remaining>0 OR a.available>=?) ORDER BY p.rotation_sequence,p.created_at,p.id`).bind(settings.sharedCredits).all<{id:string}>();
  const allocated:string[]=[];
  for(const company of candidates.results) {
    if(requestedCompanyIds&&!requestedCompanyIds.includes(company.id)) continue;
    const id=crypto.randomUUID();const now=allocationTime.toISOString();
    try {
      const committed=await db.batch([
        db.prepare(`INSERT INTO lead_recipient_deliveries(id,lead_id,partner_id,consent_version,privacy_notice_version_id,disclosure_purpose,fields_disclosed_json,
          delivered_at,delivered_by,delivery_method,distribution_expires_at,created_at,updated_at,enquiry_id,product,credit_cost,price_minor,funding_source,available_at,claim_deadline,delivery_channel)
          SELECT ?,l.id,?,l.consent_version,l.privacy_notice_version_id,'residential_solar_site_survey_and_quotation',l.disclosed_fields_snapshot_json,
          ?,?,'manual-email',e.request_expires_at,?,?,e.id,'shared_residential',?,?,
          CASE WHEN a.trial_remaining>0 THEN 'trial' ELSE 'purchased' END,?,?,'portal'
          FROM installer_enquiries e JOIN leads l ON l.id=e.lead_id JOIN installer_credit_accounts a ON a.company_id=? WHERE e.id=? RETURNING id`)
          .bind(id,company.id,now,actor,now,now,settings.sharedCredits,settings.sharedCredits*settings.creditValueMinor,now,new Date(allocationTime.getTime()+settings.claimDays*86400000).toISOString(),company.id,enquiryId),
        db.prepare(`INSERT INTO audit_events(id,actor_email,action,entity_type,entity_id,next_json)
          SELECT ?,?,'installer.allocate','installer_platform',?,? WHERE EXISTS(SELECT 1 FROM lead_recipient_deliveries WHERE id=?)`)
          .bind(crypto.randomUUID(),actor,id,JSON.stringify({enquiryId,companyId:company.id}),id),
      ]);
      // D1 meta.changes includes trigger writes; RETURNING identifies the actual
      // inserted delivery consistently in local Workerd and SQLite fixtures.
      if(committed[0].results.some(row=>(row as {id?:string}).id===id))allocated.push(id);
    } catch(error) {
      // Eligibility can change between selection and INSERT. Never relax it on retry.
      const message=error instanceof Error?error.message:'';
      if(!/constraint|eligible|capacity|credit|funding|duplicate|limit|paused|hours|consent|contract|territory|delivery|trial|terms|enquiry|recipient|suppressed|expired|UNIQUE/iu.test(message)) throw error;
    }
  }
  if(!allocated.length)await db.prepare(`UPDATE installer_enquiries SET status='unmatched' WHERE id=? AND status IN ('queued','unmatched')
    AND verification_state='verified' AND qualification_state='eligible' AND suppressed_at IS NULL AND julianday(request_expires_at)>julianday(?)
    AND NOT EXISTS(SELECT 1 FROM lead_recipient_deliveries WHERE enquiry_id=?)`).bind(enquiryId,allocationTime.toISOString(),enquiryId).run();
  return {allocated,reason:allocated.length?'allocated':'no_eligible_company_or_capacity'};
}
export async function processQueue(db:D1Database,actor:string) {
  const runId=await beginJobRun(db,'allocation',actor);
  const results:Array<{enquiryId:string;allocated:string[];reason:string}>=[];
  try {
    const settings=await getPlatformSettings(db);
    if(settings.platformPaused||settings.deliveryPaused||!settings.collectionEnabled||!withinDeliveryHours(await installerAllocationNow(db),settings)) {
      await finishJobRun(db,runId,{processed:0,reason:'paused_or_outside_hours'});return results;
    }
    const clock=(await installerAllocationNow(db)).toISOString();
    const pending=await db.prepare(`SELECT id FROM installer_enquiries
      WHERE status IN ('queued','partially-delivered','unmatched') AND verification_state='verified' AND qualification_state='eligible'
      AND duplicate_state IN('original','repeat') AND suppressed_at IS NULL AND julianday(request_expires_at)>julianday(?)
      AND (next_allocation_at IS NULL OR julianday(next_allocation_at)<=julianday(?))
      AND (allocation_lease_until IS NULL OR julianday(allocation_lease_until)<=julianday(?))
      ORDER BY COALESCE(next_allocation_at,created_at),created_at,id LIMIT 50`).bind(clock,clock,clock).all<{id:string}>();
    for(const item of pending.results) {
      const now=(await installerAllocationNow(db)).toISOString();
      const lease=await db.prepare(`UPDATE installer_enquiries SET allocation_lease_until=?,last_allocation_at=?,allocation_attempts=allocation_attempts+1
        WHERE id=? AND status IN('queued','partially-delivered','unmatched') AND suppressed_at IS NULL
        AND (allocation_lease_until IS NULL OR julianday(allocation_lease_until)<=julianday(?))
        AND (next_allocation_at IS NULL OR julianday(next_allocation_at)<=julianday(?)) RETURNING allocation_attempts`)
        .bind(new Date(Date.parse(now)+120000).toISOString(),now,item.id,now,now).first<{allocation_attempts:number}>();
      if(!lease)continue;
      try {
        const result=await allocateEnquiry(db,item.id,actor);results.push({enquiryId:item.id,...result});
        await db.prepare('UPDATE installer_enquiries SET allocation_lease_until=NULL,allocation_error_code=NULL,next_allocation_at=? WHERE id=?')
          .bind(new Date(Date.parse(now)+300000).toISOString(),item.id).run();
      } catch {
        // Safe operational code only: raw database/provider errors may contain private values.
        await db.prepare(`UPDATE installer_enquiries SET allocation_lease_until=NULL,allocation_error_code='allocation_failed',next_allocation_at=?,
          status=CASE WHEN allocation_attempts>=8 THEN 'review' ELSE status END WHERE id=?`)
          .bind(new Date(Date.parse(now)+Math.min(21600000,2**Math.min(lease.allocation_attempts,8)*60000)).toISOString(),item.id).run();
        results.push({enquiryId:item.id,allocated:[],reason:'allocation_failed'});
      }
    }
    const failures=results.filter(result=>result.reason==='allocation_failed').length;
    await finishJobRun(db,runId,{processed:results.length,deliveries:results.reduce((count,result)=>count+result.allocated.length,0),failures},failures?'allocation_items_failed':undefined);
    return results;
  } catch(error) {
    await finishJobRun(db,runId,{processed:results.length},'allocation_run_failed');throw error;
  }
}
export async function retryEnquiry(db:D1Database,enquiryId:string,actor:string) {
  const clock=(await installerAllocationNow(db)).toISOString();
  const result=await db.batch([
    db.prepare(`UPDATE installer_enquiries SET next_allocation_at=NULL,allocation_lease_until=NULL,allocation_attempts=0,allocation_error_code=NULL,
      status=CASE WHEN EXISTS(SELECT 1 FROM lead_recipient_deliveries WHERE enquiry_id=installer_enquiries.id) THEN 'partially-delivered' ELSE 'queued' END
      WHERE id=? AND verification_state='verified' AND qualification_state='eligible' AND duplicate_state IN('original','repeat') AND suppressed_at IS NULL
      AND julianday(request_expires_at)>julianday(?) AND (allocation_lease_until IS NULL OR julianday(allocation_lease_until)<=julianday(?))
      AND (SELECT COUNT(DISTINCT partner_id) FROM lead_recipient_deliveries WHERE enquiry_id=installer_enquiries.id)<recipient_limit
      AND EXISTS(SELECT 1 FROM leads l WHERE l.id=installer_enquiries.lead_id AND l.suppressed=0 AND l.consent_withdrawn_at IS NULL
      AND l.purged_at IS NULL AND l.deleted_at IS NULL AND l.archived_at IS NULL AND l.distribution_allowed=1 AND l.quote_contact_requested=1
      AND l.third_party_disclosure_authorized_v2=1 AND julianday(l.distribution_expires_at)>julianday(?))`).bind(enquiryId,clock,clock,clock),
    db.prepare(`INSERT INTO audit_events(id,actor_email,action,entity_type,entity_id)
      SELECT ?,?,'installer.retry-enquiry','installer_platform',? WHERE changes()=1`).bind(crypto.randomUUID(),actor,enquiryId),
  ]);
  if(result[0].meta.changes!==1)throw new Error('enquiry_retry_not_allowed');
  return {queued:true};
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
