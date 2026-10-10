import { installerAllocationNow } from './test-clock';

/** A human-reviewed resolution of an ambiguous homeowner SMS. No message is sent here. */
export async function reconcileNotification(db:D1Database, id:string, outcome:'accepted'|'not-sent', notes:string, providerReference:string|undefined, actor:string, mode:string) {
  if(!id||notes.trim().length<20||notes.length>2000)throw new Error('notification_evidence_required');
  const reference=providerReference?.trim();
  if(outcome==='accepted') {
    const real=/^SM[0-9a-fA-F]{32}$/.test(reference??'');
    const local=mode==='local-test'&&reference===`local_${id}`;
    if(!real&&!local)throw new Error('valid_provider_reference_required');
  } else if(outcome==='not-sent') {
    if(reference)throw new Error('provider_reference_not_allowed');
  } else throw new Error('invalid_reconciliation_outcome');
  const now=(await installerAllocationNow(db)).toISOString();
  const nextState=outcome==='accepted'?'accepted':'failed';
  const evidence=JSON.stringify({outcome,notes:notes.trim(),providerReference:outcome==='accepted'?reference:null});
  const results=await db.batch([
    db.prepare(`UPDATE installer_outbox SET state=?,provider_reference=?,last_error=?,next_attempt_at=?,lease_until=NULL,updated_at=?
      WHERE id=? AND kind='homeowner-confirmation' AND state='needs-reconciliation'
      AND EXISTS(SELECT 1 FROM lead_recipient_deliveries d JOIN installer_enquiries e ON e.id=d.enquiry_id JOIN leads l ON l.id=d.lead_id
        WHERE d.id=installer_outbox.delivery_id AND d.enquiry_id=installer_outbox.enquiry_id AND d.withdrawal_suppressed=0 AND e.suppressed_at IS NULL
        AND l.suppressed=0 AND l.consent_withdrawn_at IS NULL AND l.purged_at IS NULL AND l.deleted_at IS NULL)`)
      .bind(nextState,outcome==='accepted'?reference:null,outcome==='not-sent'?'confirmed_not_sent':null,now,now,id),
    db.prepare(`INSERT INTO audit_events(id,actor_email,action,entity_type,entity_id,previous_json,next_json,request_id)
      SELECT ?,?,'installer.reconcile-notification','installer_outbox',?,'{"state":"needs-reconciliation"}',?,NULL WHERE changes()=1`)
      .bind(crypto.randomUUID(),actor,id,evidence),
  ]);
  if(results[0].meta.changes!==1||results[1].meta.changes!==1)throw new Error('notification_reconciliation_not_allowed');
  return {id,state:nextState};
}
