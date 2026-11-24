import { activeDelivery } from './delivery-access';
import { claimReasons, closeReasons, contactActivities, workflowOutcomes } from './enquiry-workflow';
import type { DeliveryActivity } from './portal-contract';
import { parseJson, type Row } from './deliveries';

const knownKinds = [...contactActivities,'outcome','visit','quote','won','closed','reopened'] as const;
const memberOf = <T extends string>(options:readonly T[],value:unknown):value is T =>
  typeof value==='string' && options.some(option=>option===value);
function projectEvent(row:Row):DeliveryActivity|undefined {
  const raw=parseJson<Record<string,unknown>|null>(row.next_json,{}) ?? {};
  let kind:DeliveryActivity['kind'];
  const detail:Record<string,string|number>={};
  switch(row.action) {
    case 'installer.outcome':
    case 'installer.contact-activity':
      if (memberOf(knownKinds,raw.kind)) kind=raw.kind;
      else if (memberOf(workflowOutcomes,raw.outcome)) kind='outcome';
      else return;
      if (memberOf(workflowOutcomes,raw.outcome)) detail.outcome=raw.outcome;
      if (memberOf(closeReasons,raw.closeReason)) detail.closeReason=raw.closeReason;
      if (typeof raw.siteVisitAt==='string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(raw.siteVisitAt)) detail.siteVisitAt=raw.siteVisitAt;
      if (typeof raw.quoteAmountThb==='number' && Number.isSafeInteger(raw.quoteAmountThb) && raw.quoteAmountThb>=0) detail.quoteAmountThb=raw.quoteAmountThb;
      break;
    case 'installer.workflow-undo': kind='undone'; break;
    case 'installer.rotate-share-link': kind='share-link'; break;
    case 'installer.team-notes': kind='notes'; break;
    case 'installer.claim-submitted':
      kind='claim'; if (memberOf(claimReasons,raw.reason)) detail.reason=raw.reason; break;
    default: return;
  }
  const rawName=String(row.actor_name??'').trim();
  const actor=rawName && !/[@:]/.test(rawName) ? rawName.split(/\s+/)[0] : undefined;
  const at=String(row.created_at);
  return {kind,at:at.includes('T')?at:at.replace(' ','T')+'Z',actor,isYou:!!row.is_you,detail};
}

export async function deliveryActivities(db:D1Database,companyId:string,deliveryId:string,userId:string) {
  // One scoped read only when a detail is requested. The 101st row tells the
  // UI whether older audit history exists without counting the entire log.
  const events=await db.prepare(`SELECT d.available_at,a.action,a.next_json,a.created_at,u.name AS actor_name,u.id=? AS is_you,
    EXISTS(SELECT 1 FROM installer_share_tokens t WHERE t.delivery_id=d.id AND t.revoked_at IS NULL
      AND julianday(t.expires_at)>julianday('now')) AS has_share
    FROM lead_recipient_deliveries d JOIN leads l ON l.id=d.lead_id JOIN installer_enquiries e ON e.id=d.enquiry_id
    LEFT JOIN audit_events a ON a.entity_type='installer_platform' AND a.entity_id=d.id
      AND a.action IN ('installer.outcome','installer.contact-activity','installer.workflow-undo','installer.rotate-share-link','installer.claim-submitted','installer.team-notes')
      AND NOT EXISTS(SELECT 1 FROM audit_events undo WHERE undo.entity_type='installer_platform' AND undo.entity_id=a.entity_id
        AND undo.action='installer.workflow-undo' AND json_extract(undo.next_json,'$.undid')=a.id)
    LEFT JOIN installer_auth_user u ON ((a.actor_email LIKE 'installer-user:%' AND u.id=substr(a.actor_email,16)) OR a.actor_email=u.email)
      AND EXISTS (SELECT 1 FROM installer_memberships m WHERE m.company_id=d.partner_id AND m.user_id=u.id)
    WHERE d.partner_id=? AND d.id=? AND ${activeDelivery} AND l.archived_at IS NULL AND d.delivery_status IN ('delivered','accepted')
    ORDER BY julianday(a.created_at) DESC,a.rowid DESC LIMIT 101`).bind(userId,companyId,deliveryId).all<Row>();
  const first=events.results[0];
  if (!first) return;
  const activity:DeliveryActivity[]=[];
  for (const row of events.results.slice(0,100)) {
    const event=projectEvent(row);
    if (event) activity.push(event);
  }
  const activityHasMore=events.results.length>100;
  if (!activityHasMore) activity.push({kind:'received',at:String(first.available_at)});
  return {activity,activityHasMore,hasActiveShareLink:!!first.has_share};
}
