import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
const runtime=vi.hoisted(()=>({INSTALLER_PLATFORM_MODE:'local-test',INSTALLER_BASE_URL:'http://localhost:3000',INSTALLER_TEST_CLOCK_ENABLED:'true',PHONE_VERIFICATION_SECRET:'synthetic-operations-secret-more-than-thirty-two',DB:undefined as D1Database|undefined}));
vi.mock('@/lib/server/runtime',()=>({getRuntimeEnv:()=>runtime}));
import {FixtureDatabase,seedFixture,seedLead} from '../installer/fixtures';
import {processOutbox,runInstallerJobs} from '@/lib/installer/jobs';
import * as operations from '@/lib/installer/operations';
import {getPlatformSettings} from '@/lib/installer/settings';
import {allocateEnquiry} from '@/lib/installer/deliveries';
import {acquireSchedulerLease,renewSchedulerLease,releaseSchedulerLease,schedulerLeaseMilliseconds} from '@/lib/installer/scheduler-lease';
import {reportInstallerLaunchPreflight} from '@/lib/installer/launch-preflight';
let fixture:FixtureDatabase;
beforeEach(async()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-11T03:00:00.000Z'));fixture=new FixtureDatabase();runtime.DB=fixture.d1();await seedFixture(runtime.DB);vi.spyOn(globalThis,'fetch').mockRejectedValue(new Error('No external calls permitted'));});
afterEach(()=>{fixture.close();runtime.DB=undefined;vi.restoreAllMocks();vi.useRealTimers();});
describe('scheduled job health and overlap preparation',()=>{
  it('a second scheduled invocation skips work while the first holds the scheduler lease',async()=>{
    const original=fixture.prepare.bind(fixture);let release=()=>{},signal=()=>{},held=false;
    const blocker=new Promise<void>(resolve=>{release=resolve;});const started=new Promise<void>(resolve=>{signal=resolve;});
    fixture.prepare=((sql:string)=>{const statement=original(sql);if(sql.includes('INSERT INTO installer_job_runs'))return {...statement,bind:(...params:Parameters<typeof statement.bind>)=>{const bound=statement.bind(...params);if(params[1]!=='scheduled'||held)return bound;held=true;return {...bound,run:async()=>{signal();await blocker;return bound.run();}};}};return statement;}) as typeof fixture.prepare;
    const first=runInstallerJobs(runtime);await started;
    try {expect(await runInstallerJobs(runtime)).toMatchObject({skipped:'already_running'});}finally{release();await first;}
    expect(fixture.sqlite.prepare("SELECT count(*) n FROM installer_job_runs WHERE job_name='scheduled'").get()?.n).toBe(1);expect(fetch).not.toHaveBeenCalled();
  });
  it('does not let successful manual notifications conceal a missed expected scheduler',async()=>{
    fixture.sqlite.prepare("INSERT INTO installer_job_runs(id,job_name,actor,started_at,finished_at,status) VALUES('old','scheduled','fixture','2026-10-11T02:20:00.000Z','2026-10-11T02:21:00.000Z','succeeded'),('manual','notifications','fixture','2026-10-11T03:00:00.000Z','2026-10-11T03:00:00.000Z','succeeded')").run();
    const result=await operations.getInstallerOperations(fixture.d1(),{schedulerExpected:true});expect(result.scheduler).toMatchObject({state:'missed',lastCompletedAt:'2026-10-11T02:21:00.000Z'});
  });
  it('shows a due stale queue and captures one alert per active problem without provider calls',async()=>{
    await seedLead(fixture.d1());fixture.sqlite.prepare("UPDATE installer_enquiries SET created_at='2026-10-11T02:00:00.000Z'").run();
    expect(typeof operations.captureInstallerAlerts).toBe('function');await operations.captureInstallerAlerts(fixture.d1(),{schedulerExpected:false});await operations.captureInstallerAlerts(fixture.d1(),{schedulerExpected:false});
    const result=await operations.getInstallerOperations(fixture.d1());expect(result.queue).toMatchObject({dueCount:1,staleCount:1});expect(result.alerts.openCount).toBe(1);
    expect(fixture.sqlite.prepare('SELECT count(*) n FROM installer_operation_alerts').get()?.n).toBe(1);expect(fetch).not.toHaveBeenCalled();
    const settings=await getPlatformSettings(fixture.d1());fixture.sqlite.prepare('UPDATE installer_platform_settings SET config_json=? WHERE id=1').run(JSON.stringify({...settings,platformPaused:true}));
    await operations.captureInstallerAlerts(fixture.d1());expect((await operations.getInstallerOperations(fixture.d1())).alerts.openCount).toBe(0);
  });
  it('retains acknowledgement while a problem persists, resolves it and creates a fresh record only if it recurs',async()=>{
    await seedLead(fixture.d1());fixture.sqlite.prepare("UPDATE installer_enquiries SET created_at='2026-10-11T02:00:00.000Z'").run();
    await operations.captureInstallerAlerts(fixture.d1());const alert=fixture.sqlite.prepare('SELECT id FROM installer_operation_alerts').get()!;
    await operations.acknowledgeInstallerAlert(fixture.d1(),String(alert.id),'synthetic-admin@example.test');await operations.captureInstallerAlerts(fixture.d1());
    expect(fixture.sqlite.prepare('SELECT status FROM installer_operation_alerts WHERE id=?').get(alert.id)).toMatchObject({status:'acknowledged'});
    await expect(operations.acknowledgeInstallerAlert(fixture.d1(),String(alert.id),'fixture')).rejects.toThrow('alert_acknowledgement_not_allowed');
    fixture.sqlite.prepare("UPDATE installer_enquiries SET created_at='2026-10-11T03:00:00.000Z'").run();await operations.captureInstallerAlerts(fixture.d1());
    expect(fixture.sqlite.prepare('SELECT status FROM installer_operation_alerts WHERE id=?').get(alert.id)).toMatchObject({status:'resolved'});
    fixture.sqlite.prepare("UPDATE installer_enquiries SET created_at='2026-10-11T02:00:00.000Z'").run();await operations.captureInstallerAlerts(fixture.d1());
    expect(fixture.sqlite.prepare('SELECT COUNT(*) n FROM installer_operation_alerts').get()?.n).toBe(2);expect(fetch).not.toHaveBeenCalled();
  });
  it('does not raise missed-run or queue alerts for an intentionally paused or off-hours scheduler',async()=>{
    await seedLead(fixture.d1());fixture.sqlite.prepare("UPDATE installer_enquiries SET created_at='2026-10-11T02:00:00.000Z'").run();
    const settings=await getPlatformSettings(fixture.d1());fixture.sqlite.prepare('UPDATE installer_platform_settings SET config_json=? WHERE id=1').run(JSON.stringify({...settings,platformPaused:true}));
    expect((await operations.captureInstallerAlerts(fixture.d1(),{schedulerExpected:true})).scheduler.state).toBe('paused');
    fixture.sqlite.prepare('UPDATE installer_platform_settings SET config_json=? WHERE id=1').run(JSON.stringify(settings));
    const result=await operations.captureInstallerAlerts(fixture.d1(),{schedulerExpected:true,now:new Date('2026-10-11T10:00:00.000Z')});expect(result.scheduler.state).toBe('outside-hours');expect(result.alerts.openCount).toBe(0);
    expect((await operations.getInstallerOperations(fixture.d1(),{schedulerExpected:true,now:new Date('2026-10-12T02:00:00.000Z')})).scheduler.state).toBe('never-run');
  });
  it('allows only expired-lease takeover and fences a former owner from renewing or releasing the replacement',async()=>{
    const first=await acquireSchedulerLease(fixture.d1());expect(first).toBeTruthy();expect(await acquireSchedulerLease(fixture.d1())).toBeNull();
    vi.setSystemTime(new Date(Date.now()+schedulerLeaseMilliseconds));const next=await acquireSchedulerLease(fixture.d1());expect(next).toBeTruthy();expect(next).not.toBe(first);
    await expect(renewSchedulerLease(fixture.d1(),first!)).rejects.toThrow('scheduler_lease_lost');await releaseSchedulerLease(fixture.d1(),first!);
    expect(fixture.sqlite.prepare('SELECT owner_token FROM installer_scheduler_leases').get()?.owner_token).toBe(next);await releaseSchedulerLease(fixture.d1(),next!);
  });
  it('does not let the local allocation test clock extend scheduler ownership',async()=>{
    fixture.sqlite.prepare("UPDATE installer_test_clock SET fixed_at='2026-10-11T03:00:00.000Z' WHERE id=1").run();const token=await acquireSchedulerLease(fixture.d1());
    vi.setSystemTime(new Date('2026-10-11T03:10:00.000Z'));await expect(renewSchedulerLease(fixture.d1(),token!)).rejects.toThrow('scheduler_lease_lost');expect(await acquireSchedulerLease(fixture.d1())).toBeTruthy();
  });
  it('releases the global lease and records a safe error if scheduled initialization fails',async()=>{
    const original=fixture.prepare.bind(fixture);fixture.prepare=((sql:string)=>{const statement=original(sql);if(sql.includes('INSERT INTO installer_job_runs'))return {...statement,bind:()=>({...statement,run:async()=>{throw new Error('synthetic failure');}})};return statement;}) as typeof fixture.prepare;
    await expect(runInstallerJobs(runtime)).rejects.toThrow('synthetic failure');expect(fixture.sqlite.prepare('SELECT COUNT(*) n FROM installer_scheduler_leases').get()?.n).toBe(0);expect(fetch).not.toHaveBeenCalled();
  });
  it('stops provider dispatch if scheduler ownership is lost during the final asynchronous snapshot, without consuming attempts',async()=>{
    const settings=await getPlatformSettings(fixture.d1());fixture.sqlite.prepare('UPDATE installer_platform_settings SET config_json=? WHERE id=1').run(JSON.stringify({...settings,notificationsEnabled:true}));
    const lead=await seedLead(fixture.d1());fixture.sqlite.prepare('UPDATE solar_company_partners SET line_user_id=? WHERE id=?').run(`U${'a'.repeat(32)}`,'synthetic-company-1');await allocateEnquiry(fixture.d1(),lead.enquiryId,'fixture',['synthetic-company-1']);
    const token=await acquireSchedulerLease(fixture.d1());const original=fixture.prepare.bind(fixture);
    fixture.prepare=((sql:string)=>{const statement=original(sql);if(sql.includes('AS scheduler_lease_until'))return {...statement,bind:(...params:Parameters<typeof statement.bind>)=>{const bound=statement.bind(...params);return {...bound,first:async<T>()=>{fixture.sqlite.prepare('DELETE FROM installer_scheduler_leases').run();return bound.first<T>();}};}};return statement;}) as typeof fixture.prepare;
    expect(await processOutbox(fixture.d1(),runtime,token!)).toEqual({processed:0,failed:0});
    expect(fixture.sqlite.prepare('SELECT state,attempts FROM installer_outbox').all().every(row=>row.state==='pending'&&row.attempts===0)).toBe(true);expect(fixture.sqlite.prepare('SELECT COUNT(*) n FROM installer_test_messages').get()?.n).toBe(0);expect(fetch).not.toHaveBeenCalled();
  });
  it('stops the next scheduler stage after wall-clock lease expiry',async()=>{
    const original=fixture.prepare.bind(fixture);let renewals=0;
    fixture.prepare=((sql:string)=>{const statement=original(sql);if(sql.includes('UPDATE installer_scheduler_leases SET heartbeat_at'))return {...statement,bind:(...params:Parameters<typeof statement.bind>)=>{const bound=statement.bind(...params);return {...bound,first:async<T>()=>{if(++renewals===2)fixture.sqlite.prepare("UPDATE installer_scheduler_leases SET lease_until='2026-10-11T03:00:00.000Z'").run();return bound.first<T>();}};}};return statement;}) as typeof fixture.prepare;
    await expect(runInstallerJobs(runtime)).rejects.toThrow('scheduler_lease_lost');expect(fixture.sqlite.prepare("SELECT error_code FROM installer_job_runs WHERE job_name='scheduled'").get()?.error_code).toBe('scheduler_lease_lost');
    expect(fixture.sqlite.prepare("SELECT COUNT(*) n FROM installer_job_runs WHERE job_name='notifications'").get()?.n).toBe(0);expect(fetch).not.toHaveBeenCalled();
  });
  it('reports ambiguous SMS and context/unlink privacy work separately without embedding contacts or stored provider secrets',async()=>{
    const settings=await getPlatformSettings(fixture.d1());fixture.sqlite.prepare('UPDATE installer_platform_settings SET config_json=? WHERE id=1').run(JSON.stringify({...settings,notificationsEnabled:true}));
    const lead=await seedLead(fixture.d1());await allocateEnquiry(fixture.d1(),lead.enquiryId,'fixture',['synthetic-company-1']);
    fixture.sqlite.prepare("UPDATE installer_outbox SET state='needs-reconciliation',last_error='synthetic-secret-NEVER-IN-SUMMARY' WHERE kind='homeowner-confirmation'").run();fixture.sqlite.prepare("UPDATE installer_outbox SET state='action-required',last_error='line_unlinked' WHERE kind='installer-delivery'").run();
    const result=await operations.captureInstallerAlerts(fixture.d1());expect(result.notificationProblems).toMatchObject({ambiguousSms:1,actionRequired:1});expect(result.alerts.openCount).toBe(1);
    const encoded=JSON.stringify(result);expect(encoded).not.toContain('+66812345678');expect(encoded).not.toContain('synthetic-secret-NEVER-IN-SUMMARY');expect(fetch).not.toHaveBeenCalled();
  });
  it('keeps unknown-charge association and known-charge provider failures visible as separate reconciliation work',async()=>{
    fixture.sqlite.prepare(`INSERT INTO installer_payment_orders(id,company_id,package_id,credits,amount_minor,currency,status,provider,provider_order_id,reconciliation_error_code,created_at,updated_at)
      VALUES('unknown','synthetic-company-1','fixture',20,400000,'thb','authorizing','omise',NULL,NULL,?,?),
      ('known','synthetic-company-1','fixture',20,400000,'thb','pending','omise','synthetic-known-charge','reconciliation_failed',?,?)`).run(...Array(4).fill(new Date().toISOString()));
    const result=await operations.captureInstallerAlerts(fixture.d1());expect(result.reconciliationTasks).toEqual({failed:1,manualAssociationRequired:1});
    expect(result.alerts.recent).toHaveLength(1);expect(result.alerts.recent[0]).toMatchObject({code:'reconciliation_attention',counts_json:'{"count":2}'});expect(fetch).not.toHaveBeenCalled();
  });
  it('keeps launch approval blocked even with configuration present and never exposes configured values',async()=>{
    const marker='PRIVATE-PREFLIGHT-MARKER';const settings=await getPlatformSettings(fixture.d1());
    const result=reportInstallerLaunchPreflight({...runtime,INSTALLER_AUTH_SECRET:marker.repeat(3),AUTH_EMAIL_PROVIDER_TOKEN:marker,INSTALLER_BASE_URL:'https://installer.example.invalid'},settings);
    expect(result.ready).toBe(false);expect(result.ownerReviewRequired).toBe(true);expect(result.localSafetyHeld).toBe(true);expect(JSON.stringify(result)).not.toContain(marker);
    expect(result.checks.find(check=>check.id==='production-origin')?.status).toBe('blocked');expect(result.checks.find(check=>check.id==='company-tax-and-contract-facts')?.status).toBe('blocked');expect(fetch).not.toHaveBeenCalled();
  });
});
