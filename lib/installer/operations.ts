import {getPlatformSettings,withinDeliveryHours} from './settings';
const isoNow=()=>new Date().toISOString();
export type InstallerOperationsOptions={schedulerExpected?:boolean;now?:Date};
type OperationCounts={oldestQueuedAt:string|null;unmatchedCount:number;failedAllocationCount:number;failedNotificationsCount:number;failedReconciliationCount:number;staleJobRuns:number};

/** Operational summaries intentionally contain no contact details or bearer values. */
export async function beginJobRun(db:D1Database,jobName:'allocation'|'notifications'|'scheduled',actor:string) {
  const id=crypto.randomUUID();
  await db.prepare('INSERT INTO installer_job_runs(id,job_name,actor,started_at,status) VALUES(?,?,?,?,?)').bind(id,jobName,actor,isoNow(),'running').run();
  return id;
}
export async function finishJobRun(db:D1Database,id:string,summary:unknown,errorCode?:string) {
  await db.prepare('UPDATE installer_job_runs SET finished_at=?,status=?,summary_json=?,error_code=? WHERE id=? AND status=\'running\'')
    .bind(isoNow(),errorCode?'failed':'succeeded',JSON.stringify(summary),errorCode??null,id).run();
}
export async function getInstallerOperations(db:D1Database,options:InstallerOperationsOptions={}) {
  const now=options.now??new Date(),at=now.toISOString();
  const [recent,lastSuccess,counts,settings,scheduled,scheduledSuccess,lease,queue,notificationProblems,reconciliationTasks,alerts,alertCount]=await Promise.all([
    db.prepare('SELECT * FROM installer_job_runs ORDER BY started_at DESC,rowid DESC LIMIT 20').all(),
    db.prepare("SELECT * FROM installer_job_runs WHERE status='succeeded' ORDER BY finished_at DESC,rowid DESC LIMIT 1").first(),
    db.prepare(`SELECT
      (SELECT MIN(created_at) FROM installer_enquiries WHERE status IN('queued','partially-delivered','unmatched') AND suppressed_at IS NULL) AS oldestQueuedAt,
      (SELECT COUNT(*) FROM installer_enquiries WHERE status='unmatched' AND suppressed_at IS NULL) AS unmatchedCount,
      (SELECT COUNT(*) FROM installer_enquiries WHERE allocation_error_code IS NOT NULL) AS failedAllocationCount,
      (SELECT COUNT(*) FROM installer_outbox WHERE state IN('failed','needs-reconciliation','action-required')) AS failedNotificationsCount,
      (SELECT COUNT(*) FROM installer_payment_orders WHERE status='reconciliation-required' OR reconciliation_error_code IS NOT NULL) AS failedReconciliationCount,
      (SELECT COUNT(*) FROM installer_job_runs WHERE status='running' AND julianday(started_at)<julianday(?,'-10 minutes')) AS staleJobRuns`).bind(at).first<OperationCounts>(),
    getPlatformSettings(db),
    db.prepare("SELECT started_at,finished_at,status FROM installer_job_runs WHERE job_name='scheduled' ORDER BY started_at DESC,rowid DESC LIMIT 1").first<{started_at:string;finished_at:string|null;status:string}>(),
    db.prepare("SELECT finished_at FROM installer_job_runs WHERE job_name='scheduled' AND status='succeeded' ORDER BY finished_at DESC,rowid DESC LIMIT 1").first<{finished_at:string}>(),
    db.prepare("SELECT lease_until FROM installer_scheduler_leases WHERE name='scheduled'").first<{lease_until:string}>(),
    db.prepare(`SELECT COUNT(*) AS dueCount,
      SUM(CASE WHEN julianday(e.created_at)<=julianday(?,'-30 minutes') THEN 1 ELSE 0 END) AS staleCount,
      SUM(CASE WHEN e.allocation_lease_until IS NOT NULL AND julianday(e.allocation_lease_until)<=julianday(?) THEN 1 ELSE 0 END) AS expiredLeaseCount
      FROM installer_enquiries e JOIN leads l ON l.id=e.lead_id WHERE e.status IN('queued','partially-delivered','unmatched')
      AND e.suppressed_at IS NULL AND l.suppressed=0 AND l.consent_withdrawn_at IS NULL AND l.purged_at IS NULL AND l.deleted_at IS NULL
      AND julianday(e.request_expires_at)>julianday(?) AND (e.next_allocation_at IS NULL OR julianday(e.next_allocation_at)<=julianday(?))
      AND (e.allocation_lease_until IS NULL OR julianday(e.allocation_lease_until)<=julianday(?))`).bind(at,at,at,at,at).first<{dueCount:number;staleCount:number|null;expiredLeaseCount:number|null}>(),
    db.prepare(`SELECT
      (SELECT COUNT(*) FROM installer_outbox WHERE state='failed') AS failed,
      (SELECT COUNT(*) FROM installer_outbox WHERE state='action-required') AS actionRequired,
      (SELECT COUNT(*) FROM installer_outbox WHERE state='needs-reconciliation' AND kind='homeowner-confirmation') AS ambiguousSms,
      (SELECT COUNT(*) FROM installer_outbox WHERE state='cancelled' AND provider_reference IS NOT NULL) AS cancelledAfterAcceptance`).first<{failed:number;actionRequired:number;ambiguousSms:number;cancelledAfterAcceptance:number}>(),
    db.prepare(`SELECT
      (SELECT COUNT(*) FROM installer_payment_orders WHERE reconciliation_error_code IS NOT NULL) AS failed,
      (SELECT COUNT(*) FROM installer_payment_orders WHERE provider='omise' AND provider_order_id IS NULL AND status IN('authorizing','reconciliation-required')) AS manualAssociationRequired`).first<{failed:number;manualAssociationRequired:number}>(),
    db.prepare('SELECT id,code,severity,status,counts_json,delivery_mode,first_seen_at,last_seen_at,acknowledged_at,resolved_at FROM installer_operation_alerts ORDER BY last_seen_at DESC,rowid DESC LIMIT 20').all(),
    db.prepare("SELECT COUNT(*) AS openCount FROM installer_operation_alerts WHERE status IN('open','acknowledged')").first<{openCount:number}>(),
  ]);
  const queueAgeMinutes=counts?.oldestQueuedAt?Math.max(0,Math.floor((now.getTime()-Date.parse(String(counts.oldestQueuedAt)))/60000)):0;
  const ageMinutes=scheduledSuccess?Math.max(0,Math.floor((now.getTime()-Date.parse(scheduledSuccess.finished_at))/60000)):null;
  const active=Boolean(lease&&Date.parse(lease.lease_until)>now.getTime());
  const schedulerState=!options.schedulerExpected?'not-configured':active?'running':settings.platformPaused?'paused':!withinDeliveryHours(now,settings)?'outside-hours':
    (lease||(scheduled?.status==='running'&&Date.parse(scheduled.started_at)<now.getTime()-600000))?'stale':!scheduledSuccess?'never-run':ageMinutes!==null&&ageMinutes>10?'missed':'healthy';
  const queueActionable=!settings.platformPaused&&settings.collectionEnabled&&!settings.deliveryPaused&&withinDeliveryHours(now,settings);
  const attentionRequired=Number(counts?.failedAllocationCount??0)+Number(counts?.failedNotificationsCount??0)+Number(counts?.failedReconciliationCount??0)+Number(counts?.staleJobRuns??0)
    +(queueActionable?Number(queue?.staleCount??0):0)+(['missed','never-run','stale'].includes(schedulerState)?1:0)+Number(notificationProblems?.cancelledAfterAcceptance??0);
  return {...counts,queueAgeMinutes,attentionRequired,lastRun:recent.results[0]??null,lastSuccessfulRun:lastSuccess,recentRuns:recent.results,
    scheduler:{expected:Boolean(options.schedulerExpected),state:schedulerState,lastStartedAt:scheduled?.started_at??null,lastCompletedAt:scheduledSuccess?.finished_at??null,ageMinutes,activeLeaseUntil:active?lease!.lease_until:null},
    queue:{dueCount:Number(queue?.dueCount??0),staleCount:Number(queue?.staleCount??0),expiredLeaseCount:Number(queue?.expiredLeaseCount??0),actionable:queueActionable},
    notificationProblems:notificationProblems!,reconciliationTasks:reconciliationTasks!,alerts:{openCount:Number(alertCount?.openCount??0),recent:alerts.results}};
}

const alertCodes=['scheduler_missed','queue_stale','allocation_failed','notification_attention','reconciliation_attention'] as const;
/** Local database capture only. This module has no outbound delivery capability. */
export async function captureInstallerAlerts(db:D1Database,options:InstallerOperationsOptions={}) {
  const health=await getInstallerOperations(db,options),at=(options.now??new Date()).toISOString();
  const problems:Record<typeof alertCodes[number],Record<string,number>>={
    scheduler_missed:{count:['missed','never-run','stale'].includes(health.scheduler.state)?1:0},
    queue_stale:{count:health.queue.actionable?health.queue.staleCount:0},
    allocation_failed:{count:Number(health.failedAllocationCount??0)},
    notification_attention:{count:health.notificationProblems.failed+health.notificationProblems.actionRequired+health.notificationProblems.ambiguousSms+health.notificationProblems.cancelledAfterAcceptance},
    reconciliation_attention:{count:health.reconciliationTasks.failed+health.reconciliationTasks.manualAssociationRequired},
  };
  await db.batch(alertCodes.map(code=>problems[code].count>0?
    db.prepare(`INSERT INTO installer_operation_alerts(id,code,severity,status,counts_json,first_seen_at,last_seen_at) VALUES(?,?,?,'open',?,?,?)
      ON CONFLICT(code) WHERE status IN('open','acknowledged') DO UPDATE SET counts_json=excluded.counts_json,last_seen_at=excluded.last_seen_at`).bind(crypto.randomUUID(),code,code==='scheduler_missed'?'critical':'warning',JSON.stringify(problems[code]),at,at):
    db.prepare("UPDATE installer_operation_alerts SET status='resolved',resolved_at=?,last_seen_at=? WHERE code=? AND status IN('open','acknowledged')").bind(at,at,code)));
  return getInstallerOperations(db,options);
}
export async function acknowledgeInstallerAlert(db:D1Database,id:string,actor:string) {
  const row=await db.prepare("UPDATE installer_operation_alerts SET status='acknowledged',acknowledged_at=?,acknowledged_by=? WHERE id=? AND status='open' RETURNING id").bind(isoNow(),actor,id).first();
  if(!row)throw new Error('alert_acknowledgement_not_allowed');
  await db.prepare('INSERT INTO audit_events(id,actor_email,action,entity_type,entity_id) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),actor,'installer.ack-operation-alert','installer_platform',id).run();
}
