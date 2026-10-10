const isoNow=()=>new Date().toISOString();
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
export async function getInstallerOperations(db:D1Database) {
  const [recent,lastSuccess,counts]=await Promise.all([
    db.prepare('SELECT * FROM installer_job_runs ORDER BY started_at DESC,rowid DESC LIMIT 20').all(),
    db.prepare("SELECT * FROM installer_job_runs WHERE status='succeeded' ORDER BY finished_at DESC,rowid DESC LIMIT 1").first(),
    db.prepare(`SELECT
      (SELECT MIN(created_at) FROM installer_enquiries WHERE status IN('queued','partially-delivered','unmatched') AND suppressed_at IS NULL) AS oldestQueuedAt,
      (SELECT COUNT(*) FROM installer_enquiries WHERE status='unmatched' AND suppressed_at IS NULL) AS unmatchedCount,
      (SELECT COUNT(*) FROM installer_enquiries WHERE allocation_error_code IS NOT NULL) AS failedAllocationCount,
      (SELECT COUNT(*) FROM installer_outbox WHERE state IN('failed','needs-reconciliation','action-required')) AS failedNotificationsCount,
      (SELECT COUNT(*) FROM installer_payment_orders WHERE status='reconciliation-required' OR reconciliation_error_code IS NOT NULL) AS failedReconciliationCount,
      (SELECT COUNT(*) FROM installer_job_runs WHERE status='running' AND julianday(started_at)<julianday('now','-10 minutes')) AS staleJobRuns`).first<OperationCounts>(),
  ]);
  const queueAgeMinutes=counts?.oldestQueuedAt?Math.max(0,Math.floor((Date.now()-Date.parse(String(counts.oldestQueuedAt)))/60000)):0;
  const attentionRequired=Number(counts?.failedAllocationCount??0)+Number(counts?.failedNotificationsCount??0)+Number(counts?.failedReconciliationCount??0)+Number(counts?.staleJobRuns??0);
  return {...counts,queueAgeMinutes,attentionRequired,lastRun:recent.results[0]??null,lastSuccessfulRun:lastSuccess,recentRuns:recent.results};
}
