// Wall-clock worker ownership is separate from the guarded local allocation clock.
// An already in-flight provider request cannot be recalled by a lease expiry.
export const schedulerLeaseMilliseconds=10*60*1000;
export async function acquireSchedulerLease(db:D1Database,now=new Date()) {
  const token=crypto.randomUUID(),at=now.toISOString(),until=new Date(now.getTime()+schedulerLeaseMilliseconds).toISOString();
  const row=await db.prepare(`INSERT INTO installer_scheduler_leases(name,owner_token,acquired_at,heartbeat_at,lease_until) VALUES('scheduled',?,?,?,?)
    ON CONFLICT(name) DO UPDATE SET owner_token=excluded.owner_token,acquired_at=excluded.acquired_at,heartbeat_at=excluded.heartbeat_at,lease_until=excluded.lease_until
    WHERE julianday(installer_scheduler_leases.lease_until)<=julianday(?) RETURNING owner_token`).bind(token,at,at,until,at).first();
  return row?token:null;
}
export async function renewSchedulerLease(db:D1Database,token:string,now=new Date()) {
  const row=await db.prepare(`UPDATE installer_scheduler_leases SET heartbeat_at=?,lease_until=? WHERE name='scheduled' AND owner_token=?
    AND julianday(lease_until)>julianday(?) RETURNING owner_token`).bind(now.toISOString(),new Date(now.getTime()+schedulerLeaseMilliseconds).toISOString(),token,now.toISOString()).first();
  if(!row)throw new Error('scheduler_lease_lost');
}
export async function schedulerLeaseCurrent(db:D1Database,token:string,now=new Date()) {
  return Boolean(await db.prepare("SELECT owner_token FROM installer_scheduler_leases WHERE name='scheduled' AND owner_token=? AND julianday(lease_until)>julianday(?)").bind(token,now.toISOString()).first());
}
export async function releaseSchedulerLease(db:D1Database,token:string) {
  await db.prepare("DELETE FROM installer_scheduler_leases WHERE name='scheduled' AND owner_token=?").bind(token).run();
}
