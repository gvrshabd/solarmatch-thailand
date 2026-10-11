import { getRuntimeEnv,type SolarMatchRuntimeEnv } from '@/lib/server/runtime';
import { getPlatformSettings,installerSettingsSchema,withinDeliveryHours } from './settings';
import { processQueue,type Row,parseJson } from './deliveries';
import { sendEnquiryNotification,type LineConfig } from './providers/line';
import { sendMessage } from './providers/sms';
import { ProviderError } from './providers/common';
import { beginJobRun,finishJobRun } from './operations';
import { reconcilePendingPayments } from './payments';
import { installerAllocationNow } from './test-clock';
import {acquireSchedulerLease,renewSchedulerLease,releaseSchedulerLease,schedulerLeaseCurrent} from './scheduler-lease';
import {stagingLineBudget} from './staging-line-budget';
export function assertInstallerJobEnvironment(env:SolarMatchRuntimeEnv) {
  let base:URL;try{base=new URL(env.INSTALLER_BASE_URL??'');}catch{throw new Error('platform_unavailable');}
  const loopback=['localhost','127.0.0.1','[::1]'].includes(base.hostname);
  if(base.username||base.password||base.search||base.hash||base.pathname!=='/')throw new Error('platform_unavailable');
  if(env.INSTALLER_PLATFORM_MODE==='local-test'&&loopback&&['http:','https:'].includes(base.protocol))return;
  if(['sandbox','production'].includes(env.INSTALLER_PLATFORM_MODE??'')&&!loopback&&base.protocol==='https:')return;
  throw new Error('platform_unavailable');
}

export function lineConfiguration(env:SolarMatchRuntimeEnv=getRuntimeEnv(),db?:D1Database):LineConfig {
  if(env.STAGING_LINE_MAX_MESSAGES&&!db)throw Error('staging_message_budget_requires_database');
  return {mode:env.INSTALLER_PLATFORM_MODE==='local-test'?'local-test':env.INSTALLER_PLATFORM_MODE==='sandbox'&&env.LINE_PROVIDER_MODE==='sandbox'?'sandbox':env.INSTALLER_PLATFORM_MODE==='production'&&env.LINE_PROVIDER_MODE==='live'?'live':'off',channelSecret:env.LINE_CHANNEL_SECRET,accessToken:env.LINE_CHANNEL_ACCESS_TOKEN,outboundEnabled:env.OUTBOUND_MESSAGES_ENABLED==='true',liveEnabled:env.LINE_LIVE_ENABLED==='true',sandboxRecipients:parseJson<string[]>(env.LINE_TEST_RECIPIENTS,[]),reserveMessage:db?stagingLineBudget(db,env):undefined,stagingLabel:!!env.STAGING_LINE_MAX_MESSAGES};
}
function notificationContextMatches(row:Row,env:SolarMatchRuntimeEnv) {
  const mode=env.INSTALLER_PLATFORM_MODE;
  if(mode==='production')return row.allocation_environment==='production'&&row.is_test_submission===0&&row.submission_environment==='production'&&(row.submission_mode===null||row.submission_mode==='production');
  if(mode==='sandbox')return row.allocation_environment==='sandbox'&&row.is_test_submission===1&&row.submission_mode==='sandbox'&&row.submission_environment==='private_development_preview';
  if(mode==='local-test'){
    const historical=row.submission_mode===null&&row.submission_environment==='private_development_preview';
    return row.is_test_submission===1&&(row.submission_mode==='local-test'||historical)&&(row.allocation_environment==='local-test'||(row.allocation_environment===null&&historical));
  }
  return false;
}
async function markNotificationContextMismatch(db:D1Database,itemId:string,state:string,leaseUntil:string|null,now:string) {
  await db.batch([
    db.prepare(`UPDATE installer_outbox SET state='action-required',last_error='notification_environment_mismatch',attempts=attempts-?,lease_until=NULL,updated_at=?
      WHERE id=? AND state=? AND (lease_until=? OR (? IS NULL AND lease_until IS NULL))`).bind(state==='sending'?1:0,now,itemId,state,leaseUntil,leaseUntil),
    db.prepare(`UPDATE lead_recipient_deliveries SET notification_status='action-required',updated_at=? WHERE id=(SELECT delivery_id FROM installer_outbox
      WHERE id=? AND kind='installer-delivery' AND state='action-required' AND last_error='notification_environment_mismatch')`).bind(now,itemId),
  ]);
}
function notificationSnapshotTime(row:Row,env:SolarMatchRuntimeEnv) {
  if(!row.notification_fixed_at)return new Date();
  if(env.INSTALLER_PLATFORM_MODE!=='local-test'||env.INSTALLER_TEST_CLOCK_ENABLED!=='true')throw new Error('test_clock_not_allowed');
  assertInstallerJobEnvironment(env);
  const date=new Date(String(row.notification_fixed_at));if(!Number.isFinite(date.getTime()))throw new Error('invalid_test_clock');return date;
}
export async function processOutbox(db:D1Database,env:SolarMatchRuntimeEnv=getRuntimeEnv(),schedulerToken?:string) {
  assertInstallerJobEnvironment(env);
  const runId=await beginJobRun(db,'notifications','notification-worker');
  try {
    const result=await processOutboxItems(db,env,schedulerToken);
    await finishJobRun(db,runId,result,result.failed?'notification_items_failed':undefined);
    return result;
  } catch(error) {
    await finishJobRun(db,runId,{processed:0},'notification_run_failed');throw error;
  }
}
async function processOutboxItems(db:D1Database,env:SolarMatchRuntimeEnv,schedulerToken?:string) {
  const settings=await getPlatformSettings(db);if(settings.platformPaused||!settings.notificationsEnabled)return {processed:0,failed:0};
  if(!['local-test','sandbox','production'].includes(env.INSTALLER_PLATFORM_MODE??''))throw new Error('platform_unavailable');
  if(env.INSTALLER_PLATFORM_MODE!=='local-test'&&env.OUTBOUND_MESSAGES_ENABLED!=='true')return {processed:0,failed:0};
  const dispatchTime=await installerAllocationNow(db),dispatchNow=dispatchTime.toISOString();
  if(!withinDeliveryHours(dispatchTime,settings))return {processed:0,failed:0};
  // Ambiguous SMS sends are never retried automatically. LINE has a persistent provider retry key.
  await db.prepare(`UPDATE installer_outbox SET state=CASE WHEN kind='installer-delivery' THEN 'pending' ELSE 'needs-reconciliation' END
    WHERE state='sending' AND julianday(lease_until)<julianday(?)`).bind(dispatchNow).run();
  const due=await db.prepare(`SELECT id FROM installer_outbox WHERE state IN ('pending','failed') AND attempts<8 AND julianday(next_attempt_at)<=julianday(?) ORDER BY created_at LIMIT 30`).bind(dispatchNow).all<{id:string}>();
  let processed=0,failed=0;
  for(const item of due.results){
    if(schedulerToken&&!await schedulerLeaseCurrent(db,schedulerToken))break;
    const dispatchTime=await installerAllocationNow(db),now=dispatchTime.toISOString(),leaseUntil=new Date(dispatchTime.getTime()+120000).toISOString();
    if(!withinDeliveryHours(dispatchTime,settings))break;
    const previous=await db.prepare(`SELECT o.state,d.allocation_environment,l.submission_mode,l.submission_environment,l.is_test_submission
      FROM installer_outbox o JOIN lead_recipient_deliveries d ON d.id=o.delivery_id JOIN leads l ON l.id=d.lead_id WHERE o.id=?`).bind(item.id).first<Row>();
    if(!previous||!['pending','failed'].includes(String(previous.state)))continue;
    if(!notificationContextMatches(previous,env)){await markNotificationContextMismatch(db,item.id,String(previous.state),null,now);continue;}
    const lease=await db.prepare(`UPDATE installer_outbox SET state='sending',attempts=attempts+1,lease_until=?,updated_at=?
      WHERE id=? AND state=? AND attempts<8 AND julianday(next_attempt_at)<=julianday(?) RETURNING *`).bind(leaseUntil,now,item.id,previous.state,now).first<Row>();
    if(!lease)continue;
    const row=await db.prepare(`SELECT d.*,p.line_user_id,p.trading_name,p.legal_name_en,l.phone_e164,l.suppressed,l.consent_withdrawn_at,e.suppressed_at
      FROM lead_recipient_deliveries d JOIN solar_company_partners p ON p.id=d.partner_id JOIN leads l ON l.id=d.lead_id JOIN installer_enquiries e ON e.id=d.enquiry_id WHERE d.id=?`).bind(lease.delivery_id).first<Row>();
    if(!row||((row.suppressed||row.suppressed_at||row.consent_withdrawn_at)&&lease.kind!=='withdrawal')){
      await db.prepare("UPDATE installer_outbox SET state='cancelled',lease_until=NULL,updated_at=? WHERE id=? AND state='sending' AND lease_until=?").bind(now,item.id,leaseUntil).run();continue;
    }
    try{
      // A pause applied while processing must take effect before the next provider call.
      const currentSettings=await getPlatformSettings(db);
      const releaseLease=async()=>{
        await db.prepare("UPDATE installer_outbox SET state=?,attempts=attempts-1,lease_until=NULL,updated_at=? WHERE id=? AND state='sending' AND lease_until=?").bind(previous.state,(await installerAllocationNow(db)).toISOString(),item.id,leaseUntil).run();
      };
      if(currentSettings.platformPaused||!currentSettings.notificationsEnabled){
        await releaseLease();break;
      }
      let providerReference:string;let captured:unknown;
      if(lease.kind==='installer-delivery'||lease.kind==='homeowner-confirmation'){
        // Both providers re-read consent, context, recipient and the active lease
        // after asynchronous settings work. Never send from a cancelled/stale row.
        const current=await db.prepare(`SELECT d.*,p.line_user_id,p.trading_name,p.legal_name_en,l.phone_e164,l.suppressed,l.consent_withdrawn_at,l.purged_at,l.deleted_at,
          l.submission_mode,l.submission_environment,l.is_test_submission,e.suppressed_at,
          (SELECT fixed_at FROM installer_test_clock WHERE id=1) AS notification_fixed_at,
          (SELECT config_json FROM installer_platform_settings WHERE id=1) AS notification_settings,
          (SELECT lease_until FROM installer_scheduler_leases WHERE name='scheduled' AND owner_token=?) AS scheduler_lease_until
          FROM installer_outbox o JOIN lead_recipient_deliveries d ON d.id=o.delivery_id JOIN solar_company_partners p ON p.id=d.partner_id
          JOIN leads l ON l.id=d.lead_id JOIN installer_enquiries e ON e.id=d.enquiry_id WHERE o.id=? AND o.state='sending' AND o.lease_until=?`).bind(schedulerToken??null,item.id,leaseUntil).first<Row>();
        if(!current)continue;
        if(current.withdrawal_suppressed||current.suppressed||current.suppressed_at||current.consent_withdrawn_at||current.purged_at||current.deleted_at){await db.prepare("UPDATE installer_outbox SET state='cancelled',lease_until=NULL,updated_at=? WHERE id=? AND state='sending' AND lease_until=?").bind(now,item.id,leaseUntil).run();continue;}
        if(!notificationContextMatches(current,env)){await markNotificationContextMismatch(db,item.id,'sending',leaseUntil,now);continue;}
        Object.assign(row,current);
        // No asynchronous work remains between the final lease/consent snapshot
        // and provider invocation. Use real time now (or the guarded local clock).
        const finalSettings=installerSettingsSchema.parse(JSON.parse(String(current.notification_settings)));
        if((schedulerToken&&(!current.scheduler_lease_until||Date.parse(String(current.scheduler_lease_until))<=Date.now()))||finalSettings.platformPaused||!finalSettings.notificationsEnabled||!withinDeliveryHours(notificationSnapshotTime(current,env),finalSettings)){await releaseLease();break;}
      }
      if(lease.kind==='installer-delivery'){
        if(!row.line_user_id)throw new Error('line_not_linked');
        const result=await sendEnquiryNotification({to:String(row.line_user_id),reference:`SM-${String(row.id).slice(0,8).toUpperCase()}`,product:'shared_residential',credits:Number(row.credit_cost),trial:row.funding_source==='trial',enquiryUrl:`${env.INSTALLER_BASE_URL}/installers/enquiry/${encodeURIComponent(String(row.id))}`,retryKey:String(row.id)},{...lineConfiguration(env,db),linkedRecipient:true});
        providerReference=result.providerMessageId;captured='captured' in result?result.captured:undefined;
      }else if(lease.kind==='homeowner-confirmation'){
        const company=String(row.trading_name||row.legal_name_en);
        const result=await sendMessage({to:String(row.phone_e164),body:`SolarMatch: คำขอของคุณพร้อมให้ ${company} ติดต่อกลับ / Your request is available to ${company}. การติดต่อหรือใบเสนอราคาไม่รับประกัน / Contact or a quote is not guaranteed.`,idempotencyKey:item.id},{mode:env.INSTALLER_PLATFORM_MODE==='local-test'?'local-test':env.INSTALLER_PLATFORM_MODE==='sandbox'&&env.SMS_PROVIDER_MODE==='sandbox'?'sandbox':env.INSTALLER_PLATFORM_MODE==='production'&&env.SMS_PROVIDER_MODE==='live'?'live':'off',outboundEnabled:env.OUTBOUND_MESSAGES_ENABLED==='true',liveEnabled:env.SMS_LIVE_ENABLED==='true',accountSid:env.SMS_ACCOUNT_SID,authToken:env.SMS_AUTH_TOKEN,credentialsAreTest:env.SMS_CREDENTIALS_ARE_TEST==='true',from:env.SMS_FROM,messagingServiceSid:env.SMS_MESSAGING_SERVICE_SID});
        providerReference=result.providerMessageId;captured='captured' in result?result.captured:undefined;
      }else{
        // Withdrawal needs an explicit responsible-person acknowledgement; never mark a task notified by opening it.
        await db.prepare("UPDATE installer_outbox SET state='action-required',last_error='recipient_privacy_notification_required',lease_until=NULL,updated_at=? WHERE id=? AND state='sending' AND lease_until=?").bind(now,item.id,leaseUntil).run();continue;
      }
      // The provider may accept a message while withdrawal cancels its lease. Keep
      // the cancellation and record the provider reference: an in-flight send cannot
      // be retracted, and "cancelled" must not be mistaken for proof of non-delivery.
      const statements=[db.prepare(`UPDATE installer_outbox SET
        state=CASE WHEN state='sending' THEN 'accepted' ELSE state END,
        provider_reference=?,last_error=CASE WHEN state='cancelled' THEN 'provider_accepted_after_cancellation' ELSE NULL END,
        lease_until=NULL,updated_at=?
        WHERE id=? AND (state='cancelled' OR (state='sending' AND lease_until=?)) RETURNING state`).bind(providerReference,now,item.id,leaseUntil)];
      if(lease.kind==='installer-delivery')statements.push(db.prepare(`UPDATE lead_recipient_deliveries SET notification_status='accepted',updated_at=? WHERE id=? AND withdrawal_suppressed=0
        AND EXISTS(SELECT 1 FROM installer_outbox WHERE id=? AND state='accepted')`).bind(now,row.id,item.id));
      if(captured)statements.push(db.prepare(`INSERT OR IGNORE INTO installer_test_messages(id,channel,recipient,body,created_at)
        SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM installer_outbox WHERE id=? AND provider_reference=?)`).bind(item.id,String(lease.kind),String(lease.kind==='installer-delivery'?row.line_user_id:row.phone_e164),JSON.stringify(captured),now,item.id,providerReference));
      const completed=await db.batch(statements);
      if(completed[0].results?.length)processed++;
    }catch(error){
      const code=error instanceof ProviderError?error.code:error instanceof Error&&error.message==='line_not_linked'?'line_not_linked':'provider_unavailable';
      const definitelyNotSent=['provider_disabled','outbound_disabled','invalid_message','missing_sms_test_credentials','missing_sms_credentials','missing_sms_sender','sms_credential_mode_mismatch'].includes(code);
      const persistent=['line_not_linked','line_recipient_not_linked','missing_line_token','missing_line_secret','invalid_line_user','provider_http_400','provider_http_401','provider_http_403','provider_http_404'].includes(code)||Number(lease.attempts)>=8;
      const state=lease.kind==='homeowner-confirmation'&&!definitelyNotSent?'needs-reconciliation':persistent?'action-required':'failed';
      const settled=await db.prepare(`UPDATE installer_outbox SET state=?,last_error=?,next_attempt_at=?,lease_until=NULL,updated_at=?
        WHERE id=? AND state='sending' AND lease_until=?`).bind(state,code,new Date(dispatchTime.getTime()+Math.min(86400000,2**Number(lease.attempts)*60000)).toISOString(),now,item.id,leaseUntil).run();
      if(settled.meta.changes)failed++;
    }
  }
  return {processed,failed};
}
export async function runInstallerJobs(env:SolarMatchRuntimeEnv=getRuntimeEnv()) {
  if(!env.DB||!['local-test','sandbox','production'].includes(env.INSTALLER_PLATFORM_MODE??''))return;
  assertInstallerJobEnvironment(env);
  const token=await acquireSchedulerLease(env.DB);
  if(!token)return {skipped:'already_running' as const};
  let runId:string|undefined;
  try {
  runId=await beginJobRun(env.DB,'scheduled','scheduled-worker');
  await renewSchedulerLease(env.DB,token);
  const allocation=await processQueue(env.DB,'scheduled-worker');
  await renewSchedulerLease(env.DB,token);
  const notifications=await processOutbox(env.DB,env,token);
  await renewSchedulerLease(env.DB,token);
  const reconciliation=await reconcilePendingPayments(env.DB,new Request(env.INSTALLER_BASE_URL!));
  await renewSchedulerLease(env.DB,token);
  const allocationFailures=allocation.filter(item=>item.reason==='allocation_failed').length;
  const allocationClock=(await installerAllocationNow(env.DB)).toISOString();
  await env.DB.batch([
    env.DB.prepare("UPDATE installer_enquiries SET status='expired' WHERE status IN ('queued','partially-delivered','unmatched') AND julianday(request_expires_at)<=julianday(?)").bind(allocationClock),
    env.DB.prepare("DELETE FROM installer_phone_challenges WHERE julianday(expires_at)<julianday('now','-1 day')"),
    env.DB.prepare("DELETE FROM installer_test_messages WHERE julianday(created_at)<julianday('now','-1 day')"),
    env.DB.prepare("DELETE FROM installer_auth_verification WHERE expiresAt<?").bind(Date.now()-86400000),
  ]);
  await finishJobRun(env.DB,runId,{completed:true,allocationItems:allocation.length,allocationFailures,notifications:notifications.processed,notificationFailures:notifications.failed,reconciled:reconciliation.reconciled,reconciliationFailures:reconciliation.failed},
    allocationFailures||notifications.failed||reconciliation.failed?'scheduled_items_require_attention':undefined);
  } catch(error) {
    if(runId)await finishJobRun(env.DB,runId,{completed:false},error instanceof Error&&error.message==='scheduler_lease_lost'?'scheduler_lease_lost':'scheduled_run_failed');throw error;
  } finally {
    await releaseSchedulerLease(env.DB,token);
  }
}
/** Controlled retry never resets an ambiguous SMS send or changes delivery billing. */
export async function retryNotification(db:D1Database,id:string,actor:string) {
  const now=(await installerAllocationNow(db)).toISOString();
  // Delivery has already happened. Its former allocation window must not make a
  // consented recipient notification permanently unretryable.
  const changed=await db.prepare(`UPDATE installer_outbox SET state='pending',attempts=0,next_attempt_at=?,lease_until=NULL,last_error=NULL,updated_at=?
    WHERE id=? AND kind IN('installer-delivery','homeowner-confirmation') AND state IN('failed','action-required')
    AND EXISTS(SELECT 1 FROM lead_recipient_deliveries d JOIN installer_enquiries e ON e.id=d.enquiry_id JOIN leads l ON l.id=d.lead_id
      WHERE d.id=installer_outbox.delivery_id AND d.enquiry_id=installer_outbox.enquiry_id AND d.withdrawal_suppressed=0 AND e.suppressed_at IS NULL
      AND l.suppressed=0 AND l.consent_withdrawn_at IS NULL AND l.purged_at IS NULL AND l.deleted_at IS NULL
      AND (installer_outbox.kind<>'installer-delivery' OR EXISTS(SELECT 1 FROM solar_company_partners p WHERE p.id=d.partner_id AND p.line_user_id IS NOT NULL)))
    RETURNING id`).bind(now,now,id).first();
  if(!changed)throw new Error('notification_retry_not_allowed');
  await db.prepare('INSERT INTO audit_events(id,actor_email,action,entity_type,entity_id) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),actor,'installer.retry-notification','installer_platform',id).run();
}
