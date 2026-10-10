import { assertPlatformRequest } from './platform';
import { auditStatement } from '@/lib/server/audit';
import { sha256 } from '@/lib/server/crypto';

/** Preview only: no default retention policy and no scheduled destructive cleanup. */
export async function previewRetention(db: D1Database, request: Request, retentionDays: number) {
  assertPlatformRequest(request);
  if (!Number.isInteger(retentionDays) || retentionDays < 1) throw new Error('retention_policy_required');
  return db.prepare(`SELECT id,created_at FROM leads WHERE purged_at IS NULL AND legal_hold=0
    AND julianday(created_at)<julianday('now')-? ORDER BY created_at LIMIT 100`).bind(retentionDays).all<{id:string;created_at:string}>();
}

/** Caller retains existing authenticated administrator + CSRF checks. */
export async function purgeInstallerLeads(db: D1Database, request: Request, leadIds: string[], actor: string) {
  assertPlatformRequest(request);
  return redactInstallerLeads(db,leadIds,actor);
}

/** Internal DB operation. Its HTTP caller MUST require administrator identity and CSRF.
 * Privacy redaction remains available when installer collection is switched off. */
export async function redactInstallerLeads(db:D1Database,leadIds:string[],actor:string) {
  if(!actor||leadIds.length<1||leadIds.length>50)throw new Error('invalid_privacy_redaction');
  const selected = await db.prepare(`SELECT DISTINCT l.id,l.phone_e164,l.line_id,l.request_fingerprint FROM leads l WHERE l.id IN (${leadIds.map(() => '?').join(',')})
    OR l.id IN(SELECT el.lead_id FROM installer_enquiry_leads el WHERE el.enquiry_id IN(SELECT enquiry_id FROM installer_enquiry_leads WHERE lead_id IN(${leadIds.map(() => '?').join(',')})))`)
    .bind(...leadIds,...leadIds).all<{id:string;phone_e164:string|null;line_id:string|null;request_fingerprint:string}>();
  const now = new Date().toISOString();
  const statements: D1PreparedStatement[] = [];
  for (const lead of selected.results) {
    // The migration guard aborts the entire D1 batch if ANY related row has a legal hold.
    statements.push(db.prepare(`UPDATE leads SET legal_first_name='[deleted]',legal_last_name='[deleted]',
      phone_e164=CASE WHEN preferred_contact_method='phone' THEN '[deleted]' ELSE NULL END,
      phone_display=CASE WHEN preferred_contact_method='phone' THEN '[deleted]' ELSE NULL END,
      line_id=CASE WHEN preferred_contact_method='line' THEN '[deleted]' ELSE NULL END,
      province='[deleted]',custom_location=NULL,custom_property_type=NULL,custom_daytime_load=NULL,custom_roof_material=NULL,
      answers_json='{}',daytime_loads_json='[]',scoring_explanation_json='{}',recipient_snapshot_json=CASE WHEN recipient_snapshot_json IS NULL THEN NULL ELSE '{}' END,
      user_agent_summary=NULL,request_fingerprint=?,property_type='[deleted]',roof_material='[deleted]',roof_shade='[deleted]',roof_area='[deleted]',
      daytime_pattern='[deleted]',installation_timeframe='[deleted]',ownership_status='other',air_conditioner_count=0,monthly_bill_thb=1,
      raw_score=0,quality_score=1,hard_eligible=0,high_quality=0,suppressed=1,suppressed_at=?,suppression_reason='privacy-redaction',
      distribution_allowed=0,status='deleted',deleted_at=COALESCE(deleted_at,?),purged_at=?,updated_at=? WHERE id=?`)
      .bind(await sha256('purged:'+lead.request_fingerprint),now,now,now,now,lead.id));
    for (const table of ['lead_notes','export_batch_items','lead_export_selections']) statements.push(db.prepare(`DELETE FROM ${table} WHERE lead_id=?`).bind(lead.id));
    statements.push(db.prepare("UPDATE lead_score_history SET explanation_json='{}',reason='privacy-redaction' WHERE lead_id=?").bind(lead.id));
    statements.push(db.prepare("UPDATE lead_status_events SET reason='privacy-redaction' WHERE lead_id=?").bind(lead.id));
    statements.push(db.prepare("UPDATE privacy_rights_requests SET resolution_notes='Personal data redacted; financial delivery records retained',suppression_applied=1,updated_at=? WHERE lead_id=?").bind(now,lead.id));
    statements.push(db.prepare("UPDATE installer_claims SET notes='[deleted]',decision_notes=CASE WHEN decision_notes IS NULL THEN NULL ELSE '[deleted]' END WHERE delivery_id IN(SELECT id FROM lead_recipient_deliveries WHERE lead_id=?)").bind(lead.id));
    statements.push(db.prepare("UPDATE lead_recipient_deliveries SET rejection_reason=CASE WHEN rejection_reason IS NULL THEN NULL ELSE '[deleted]' END WHERE lead_id=?").bind(lead.id));
    statements.push(db.prepare(`UPDATE audit_events SET previous_json=NULL,next_json=NULL WHERE entity_id=?
      OR entity_id IN(SELECT id FROM lead_recipient_deliveries WHERE lead_id=?)
      OR entity_id IN(SELECT id FROM privacy_rights_requests WHERE lead_id=?)
      OR entity_id IN(SELECT id FROM installer_claims WHERE delivery_id IN(SELECT id FROM lead_recipient_deliveries WHERE lead_id=?))`).bind(lead.id,lead.id,lead.id,lead.id));
    statements.push(db.prepare('UPDATE installer_operational_events SET attribution_json=NULL WHERE enquiry_id IN(SELECT enquiry_id FROM installer_enquiry_leads WHERE lead_id=?)').bind(lead.id));
    statements.push(db.prepare('DELETE FROM installer_phone_challenges WHERE phone_e164=?').bind(lead.phone_e164));
    statements.push(db.prepare('DELETE FROM installer_test_messages WHERE recipient=? OR recipient=? OR id IN(SELECT id FROM installer_outbox WHERE enquiry_id IN(SELECT enquiry_id FROM installer_enquiry_leads WHERE lead_id=?))').bind(lead.phone_e164,lead.line_id,lead.id));
    statements.push(db.prepare('INSERT INTO purge_tombstones(id,entity_type,non_personal_reference_hash,purged_by,reason) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),'lead',await sha256('purged:'+lead.id),actor,'installer-personal-data-redaction'));
    statements.push(auditStatement(db,{actorEmail:actor,action:'lead.personally-redacted',entityType:'lead',entityId:lead.id,next:{irreversible:true,financialFactsRetained:true}}));
  }
  if (statements.length) await db.batch(statements);
  return { ok: true, purged: selected.results.length, redacted: true, copiesAlreadyExportedRetracted: false };
}
