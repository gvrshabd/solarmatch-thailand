import { getRuntimeEnv,type SolarMatchRuntimeEnv } from '@/lib/server/runtime';
import { getPlatformSettings } from './settings';
import { processQueue,isoNow,type Row,parseJson } from './deliveries';
import { sendEnquiryNotification,type LineConfig } from './providers/line';
import { sendMessage } from './providers/sms';
import { ProviderError } from './providers/common';
export function assertInstallerJobEnvironment(env:SolarMatchRuntimeEnv) {
  let base:URL;try{base=new URL(env.INSTALLER_BASE_URL??'');}catch{throw new Error('platform_unavailable');}
  const loopback=['localhost','127.0.0.1','[::1]'].includes(base.hostname);
  if(base.username||base.password||base.search||base.hash||base.pathname!=='/')throw new Error('platform_unavailable');
  if(env.INSTALLER_PLATFORM_MODE==='local-test'&&loopback&&['http:','https:'].includes(base.protocol))return;
  if(env.INSTALLER_PLATFORM_MODE==='sandbox'&&!loopback&&base.protocol==='https:')return;
  throw new Error('platform_unavailable');
}

export function lineConfiguration(env:SolarMatchRuntimeEnv=getRuntimeEnv()):LineConfig {
  return {mode:env.INSTALLER_PLATFORM_MODE==='local-test'?'local-test':env.INSTALLER_PLATFORM_MODE==='sandbox'?'sandbox':'off',channelSecret:env.LINE_CHANNEL_SECRET,accessToken:env.LINE_CHANNEL_ACCESS_TOKEN,outboundEnabled:env.OUTBOUND_MESSAGES_ENABLED==='true',sandboxRecipients:parseJson<string[]>(env.LINE_TEST_RECIPIENTS,[])};
}
export async function processOutbox(db:D1Database,env:SolarMatchRuntimeEnv=getRuntimeEnv()) {
  assertInstallerJobEnvironment(env);
  const settings=await getPlatformSettings(db);if(!settings.notificationsEnabled)return {processed:0};
  if(!['local-test','sandbox'].includes(env.INSTALLER_PLATFORM_MODE??''))throw new Error('platform_unavailable');
  // Ambiguous SMS sends are never retried automatically. LINE has a persistent provider retry key.
  await db.prepare(`UPDATE installer_outbox SET state=CASE WHEN kind='installer-delivery' THEN 'pending' ELSE 'needs-reconciliation' END
    WHERE state='sending' AND julianday(lease_until)<julianday('now')`).run();
  const due=await db.prepare(`SELECT id FROM installer_outbox WHERE state IN ('pending','failed') AND attempts<8 AND julianday(next_attempt_at)<=julianday('now') ORDER BY created_at LIMIT 30`).all<{id:string}>();
  let processed=0;
  for(const item of due.results){
    const now=isoNow();const lease=await db.prepare(`UPDATE installer_outbox SET state='sending',attempts=attempts+1,lease_until=?,updated_at=? WHERE id=? AND state IN ('pending','failed') RETURNING *`).bind(new Date(Date.now()+120000).toISOString(),now,item.id).first<Row>();
    if(!lease)continue;
    const row=await db.prepare(`SELECT d.*,p.line_user_id,p.trading_name,p.legal_name_en,l.phone_e164,l.suppressed,l.consent_withdrawn_at,e.suppressed_at
      FROM lead_recipient_deliveries d JOIN solar_company_partners p ON p.id=d.partner_id JOIN leads l ON l.id=d.lead_id JOIN installer_enquiries e ON e.id=d.enquiry_id WHERE d.id=?`).bind(lease.delivery_id).first<Row>();
    if(!row||((row.suppressed||row.suppressed_at||row.consent_withdrawn_at)&&lease.kind!=='withdrawal')){
      await db.prepare("UPDATE installer_outbox SET state='cancelled',updated_at=? WHERE id=?").bind(now,item.id).run();continue;
    }
    try{
      let providerReference:string;let captured:unknown;
      if(lease.kind==='installer-delivery'){
        if(!row.line_user_id)throw new Error('line_not_linked');
        const result=await sendEnquiryNotification({to:String(row.line_user_id),reference:`SM-${String(row.id).slice(0,8).toUpperCase()}`,product:'shared_residential',credits:Number(row.credit_cost),trial:row.funding_source==='trial',enquiryUrl:`${env.INSTALLER_BASE_URL}/installers/enquiry/${encodeURIComponent(String(row.id))}`,retryKey:String(row.id)},lineConfiguration(env));
        providerReference=result.providerMessageId;captured='captured' in result?result.captured:undefined;
      }else if(lease.kind==='homeowner-confirmation'){
        const company=String(row.trading_name||row.legal_name_en);
        const result=await sendMessage({to:String(row.phone_e164),body:`SolarMatch: คำขอของคุณพร้อมให้ ${company} ติดต่อกลับ / Your request is available to ${company}. การติดต่อหรือใบเสนอราคาไม่รับประกัน / Contact or a quote is not guaranteed.`,idempotencyKey:item.id},{mode:env.INSTALLER_PLATFORM_MODE as 'local-test'|'sandbox',outboundEnabled:env.OUTBOUND_MESSAGES_ENABLED==='true',accountSid:env.SMS_ACCOUNT_SID,authToken:env.SMS_AUTH_TOKEN,credentialsAreTest:env.SMS_CREDENTIALS_ARE_TEST==='true'});
        providerReference=result.providerMessageId;captured='captured' in result?result.captured:undefined;
      }else{
        // Withdrawal needs an explicit responsible-person acknowledgement; never mark a task notified by opening it.
        await db.prepare("UPDATE installer_outbox SET state='action-required',last_error='recipient_privacy_notification_required',updated_at=? WHERE id=?").bind(now,item.id).run();continue;
      }
      const statements=[db.prepare("UPDATE installer_outbox SET state='accepted',provider_reference=?,last_error=NULL,lease_until=NULL,updated_at=? WHERE id=?").bind(providerReference,now,item.id)];
      if(lease.kind==='installer-delivery')statements.push(db.prepare("UPDATE lead_recipient_deliveries SET notification_status='accepted',updated_at=? WHERE id=?").bind(now,row.id));
      if(captured)statements.push(db.prepare('INSERT OR IGNORE INTO installer_test_messages(id,channel,recipient,body,created_at) VALUES(?,?,?,?,?)').bind(item.id,String(lease.kind),String(lease.kind==='installer-delivery'?row.line_user_id:row.phone_e164),JSON.stringify(captured),now));
      await db.batch(statements);processed++;
    }catch(error){
      const code=error instanceof ProviderError?error.code:error instanceof Error&&error.message==='line_not_linked'?'line_not_linked':'provider_unavailable';
      const definitelyNotSent=['provider_disabled','outbound_disabled','invalid_message','missing_sms_test_credentials'].includes(code);
      const state=lease.kind==='homeowner-confirmation'&&!definitelyNotSent?'needs-reconciliation':'failed';
      await db.prepare('UPDATE installer_outbox SET state=?,last_error=?,next_attempt_at=?,lease_until=NULL,updated_at=? WHERE id=?').bind(state,code,new Date(Date.now()+Math.min(86400000,2**Number(lease.attempts)*60000)).toISOString(),now,item.id).run();
    }
  }
  return {processed};
}
export async function runInstallerJobs(env:SolarMatchRuntimeEnv=getRuntimeEnv()) {
  if(!env.DB||!['local-test','sandbox'].includes(env.INSTALLER_PLATFORM_MODE??''))return;
  assertInstallerJobEnvironment(env);
  await processQueue(env.DB,'scheduled-worker');await processOutbox(env.DB,env);
  await env.DB.batch([
    env.DB.prepare("UPDATE installer_enquiries SET status='expired' WHERE status IN ('queued','partially-delivered','unmatched') AND julianday(request_expires_at)<=julianday('now')"),
    env.DB.prepare("DELETE FROM installer_phone_challenges WHERE julianday(expires_at)<julianday('now','-1 day')"),
    env.DB.prepare("DELETE FROM installer_test_messages WHERE julianday(created_at)<julianday('now','-1 day')"),
    env.DB.prepare("DELETE FROM installer_auth_verification WHERE expiresAt<?").bind(Date.now()-86400000),
  ]);
}
