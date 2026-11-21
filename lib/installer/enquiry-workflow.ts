import { activeDelivery } from './delivery-access';
import type { ContactActivity, CloseReason, DeliveryActivity, OpenOutcome } from './portal-contract';

export const workflowOutcomes = ['open','contacted','site_visit','quoted','won','lost','not-suitable'] as const;
export const contactActivities = ['call-spoke','call-no-answer','call-wrong','text'] as const;
export const closeReasons = ['other-company','price','not-ready','unreachable','not-suitable'] as const;
export const claimReasons = ['incorrect-contact','duplicate','outside-criteria','no-request','withdrawn'] as const;
type Outcome = typeof workflowOutcomes[number];
type State = {
  outcome_status: string; portal_progress_stage: OpenOutcome | null;
  portal_site_visit_at: string | null; portal_quote_amount_thb: number | null;
  portal_close_reason: CloseReason | null; portal_last_open_stage: OpenOutcome | null;
  portal_workflow_revision: number;
};
type Input =
  | { action: 'report-outcome'; outcome: Outcome; siteVisitAt?: string | null; quoteAmountThb?: number | null; closeReason?: CloseReason | null; revision?: number }
  | { action: 'log-activity'; kind: ContactActivity; revision?: number };

const available = `SELECT d.id FROM lead_recipient_deliveries d JOIN leads l ON l.id=d.lead_id JOIN installer_enquiries e ON e.id=d.enquiry_id
  WHERE d.id=? AND d.partner_id=? AND ${activeDelivery} AND l.archived_at IS NULL AND d.delivery_status IN ('delivered','accepted')`;
const closed = (stage: string) => ['won','lost','not-suitable'].includes(stage);
export const installerAuditActor = (userId: string) => 'installer-user:' + userId;

export function reopenStage(row: Pick<State,'portal_progress_stage'|'portal_last_open_stage'|'portal_quote_amount_thb'|'portal_site_visit_at'>): OpenOutcome {
  if (row.portal_progress_stage) return row.portal_progress_stage;
  return row.portal_last_open_stage ?? (row.portal_quote_amount_thb != null ? 'quoted' : row.portal_site_visit_at ? 'site_visit' : 'open');
}

function applyOutcome(previous: State, outcome: Outcome, edit?: Extract<Input, { action:'report-outcome' }>) {
  const was = previous.portal_progress_stage ?? previous.outcome_status;
  const stage = outcome === 'contacted' || outcome === 'site_visit' || outcome === 'quoted' ? outcome : null;
  const next:State = {
    ...previous, outcome_status:stage ? 'open' : outcome, portal_progress_stage:stage,
    portal_last_open_stage:closed(outcome) ? reopenStage(previous) : stage ?? 'open',
    portal_close_reason:closed(outcome) ? edit?.closeReason ?? (was===outcome ? previous.portal_close_reason : null) : null,
  };
  if (edit?.siteVisitAt !== undefined) next.portal_site_visit_at = edit.siteVisitAt;
  if (edit?.quoteAmountThb !== undefined) next.portal_quote_amount_thb = edit.quoteAmountThb;
  return next;
}

export async function changeWorkflow(db:D1Database,companyId:string,userId:string,deliveryId:string,input:Input) {
  const previous=await db.prepare(`SELECT outcome_status,portal_progress_stage,portal_site_visit_at,portal_quote_amount_thb,
    portal_close_reason,portal_last_open_stage,portal_workflow_revision FROM lead_recipient_deliveries WHERE id IN (${available})`)
    .bind(deliveryId,companyId).first<State>();
  if (!previous) return {error:'delivery_unavailable'} as const;
  if (input.revision!==undefined && input.revision!==previous.portal_workflow_revision) return {error:'workflow_changed'} as const;

  const was = previous.portal_progress_stage ?? previous.outcome_status;
  let next = previous;
  let kind:DeliveryActivity['kind'];
  const detail:Record<string,string|number>={};
  if (input.action==='log-activity') {
    kind=input.kind;
    if (kind==='call-spoke' && (was==='open' || was==='not-recorded')) {
      next=applyOutcome(previous,'contacted');
      detail.outcome='contacted';
    }
  } else {
    const {outcome,siteVisitAt,quoteAmountThb,closeReason}=input;
    if ((siteVisitAt!==undefined && outcome!=='site_visit') || (quoteAmountThb!==undefined && outcome!=='quoted') ||
      (closeReason!=null && (closeReason==='not-suitable' ? outcome!=='not-suitable' : outcome!=='lost'))) return {error:'invalid_outcome'} as const;
    next=applyOutcome(previous,outcome,input);
    kind = closed(was) && !closed(outcome) ? 'reopened' : outcome==='won' ? 'won' : closed(outcome) ? 'closed'
      : outcome==='site_visit' && siteVisitAt ? 'visit' : outcome==='quoted' ? 'quote' : 'outcome';
    detail.outcome=outcome;
    if (siteVisitAt) detail.siteVisitAt=siteVisitAt;
    if (quoteAmountThb!=null) detail.quoteAmountThb=quoteAmountThb;
    if (closeReason) detail.closeReason=closeReason;
  }

  const now = new Date();
  const undoId = crypto.randomUUID();
  const undoExpiresAt = new Date(now.getTime()+6000).toISOString();
  // The snapshot is captured from the server, and compare-and-swap protects the
  // read/write gap even for older clients that do not send a revision.
  const undo = JSON.stringify({id:undoId,user:userId,expires:undoExpiresAt,previous});
  const results=await db.batch([
    db.prepare(`UPDATE lead_recipient_deliveries SET outcome_status=?,portal_progress_stage=?,portal_site_visit_at=?,portal_quote_amount_thb=?,
      portal_close_reason=?,portal_last_open_stage=?,portal_workflow_revision=portal_workflow_revision+1,portal_undo_json=?,updated_at=?
      WHERE id IN (${available}) AND portal_workflow_revision=? RETURNING id`)
      .bind(next.outcome_status,next.portal_progress_stage,next.portal_site_visit_at,next.portal_quote_amount_thb,next.portal_close_reason,
        next.portal_last_open_stage,undo,now.toISOString(),deliveryId,companyId,previous.portal_workflow_revision),
    db.prepare(`INSERT INTO audit_events(id,actor_email,action,entity_type,entity_id,next_json,created_at)
      SELECT ?,?,?,'installer_platform',?,?,? WHERE changes()=1`).bind(undoId,installerAuditActor(userId),
      input.action==='report-outcome'?'installer.outcome':'installer.contact-activity',deliveryId,JSON.stringify({kind,...detail}),now.toISOString()),
  ]);
  if (!results[0].results.length) {
    const stillAvailable=await db.prepare(available).bind(deliveryId,companyId).first();
    return {error:stillAvailable?'workflow_changed':'delivery_unavailable'} as const;
  }
  return {ok:true,undoId,undoExpiresAt} as const;
}

export async function undoWorkflow(db:D1Database,companyId:string,userId:string,deliveryId:string,undoId:string) {
  const now=new Date().toISOString();
  const restore = ['outcome_status','portal_progress_stage','portal_site_visit_at','portal_quote_amount_thb','portal_close_reason','portal_last_open_stage']
    .map(column=>`${column}=json_extract(portal_undo_json,'$.previous.${column}')`).join(',');
  const results=await db.batch([
    db.prepare(`UPDATE lead_recipient_deliveries SET ${restore},portal_undo_json=NULL,portal_workflow_revision=portal_workflow_revision+1,updated_at=?
      WHERE id IN (${available}) AND json_extract(portal_undo_json,'$.id')=? AND json_extract(portal_undo_json,'$.user')=?
      AND json_extract(portal_undo_json,'$.expires')>? RETURNING id`).bind(now,deliveryId,companyId,undoId,userId,now),
    db.prepare(`INSERT INTO audit_events(id,actor_email,action,entity_type,entity_id,next_json,created_at)
      SELECT ?,?,'installer.workflow-undo','installer_platform',?,?,? WHERE changes()=1`)
      .bind(crypto.randomUUID(),installerAuditActor(userId),deliveryId,JSON.stringify({undid:undoId}),now),
  ]);
  return results[0].results.length ? {ok:true} as const : {error:'undo_expired_or_changed'} as const;
}
