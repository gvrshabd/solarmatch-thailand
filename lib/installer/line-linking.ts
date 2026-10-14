import { getRuntimeEnv } from '@/lib/server/runtime';
import { encodeBase64Url,hmacSha256,sha256 } from '@/lib/server/crypto';
import { assertPlatformRequest } from './platform';
import { getPlatformSettings } from './settings';
import { platformAudit } from './deliveries';
import {stagingLineBudget} from './staging-line-budget';
import { lineAccountLinkUrl,requestLinkToken,sendAccountLinkInvitation,verifyLineWebhook,type LineConfig,type LineEvent } from './providers/line';
import {ProviderError} from './providers/common';
async function configFor(db:D1Database,request:Request):Promise<LineConfig>{const {mode}=assertPlatformRequest(request);const env=getRuntimeEnv(),settings=await getPlatformSettings(db);let recipients:string[]=[];try{const value=JSON.parse(env.LINE_TEST_RECIPIENTS??'[]');if(Array.isArray(value)&&value.every(item=>typeof item==='string'))recipients=value;}catch{/* fail closed */}const providerMode=mode==='local-test'?'local-test':env.LINE_PROVIDER_MODE==='live'&&String(mode)==='production'?'live':env.LINE_PROVIDER_MODE==='sandbox'&&mode==='sandbox'?'sandbox':'off';return {mode:providerMode,channelSecret:env.LINE_CHANNEL_SECRET,accessToken:env.LINE_CHANNEL_ACCESS_TOKEN,outboundEnabled:!settings.platformPaused&&settings.notificationsEnabled&&env.OUTBOUND_MESSAGES_ENABLED==='true',liveEnabled:env.LINE_LIVE_ENABLED==='true',sandboxRecipients:recipients,reserveMessage:stagingLineBudget(db,env),countLinkTokenAttempts:!!env.STAGING_LINE_TEST_SESSION,stagingLabel:!!env.STAGING_LINE_MAX_MESSAGES};}
export async function beginLineLink(db:D1Database,companyId:string,request:Request,linkRequest?:string){
  const config=await configFor(db,request);
  const company=await db.prepare("SELECT id,line_user_id,line_link_generation FROM solar_company_partners WHERE id=? AND approval_status='approved'").bind(companyId).first<{id:string;line_user_id:string|null;line_link_generation:number}>();if(!company)throw new Error('company_not_approved');
  if(!linkRequest)return {status:company.line_user_id?'connected':'not-connected',instructions:'เพิ่ม SolarMatch Official Account เป็นเพื่อน แล้วส่งข้อความ LINK เพื่อรับลิงก์เชื่อมต่อ / Add the SolarMatch Official Account and send LINK to receive a secure connection link.'};
  if(!/^[A-Za-z0-9_-]{43}$/.test(linkRequest))throw new Error('invalid_line_invitation');
  const hash=await sha256(linkRequest),now=new Date().toISOString();
  const invitation=await db.prepare('SELECT * FROM installer_line_invitations WHERE token_hash=? AND consumed_at IS NULL AND expires_at>?').bind(hash,now).first<{id:string;line_user_id:string}>();if(!invitation)throw new Error('line_invitation_expired');
  const nonce=encodeBase64Url(crypto.getRandomValues(new Uint8Array(32))),nonceHash=await sha256(nonce),id=crypto.randomUUID();
  // Persist cancellable state before provider work. The generation guard also
  // handles unlink during any earlier asynchronous hashing or invitation reads.
  const results=await db.batch([
    db.prepare('UPDATE installer_line_invitations SET consumed_at=? WHERE id=? AND consumed_at IS NULL AND expires_at>?').bind(now,invitation.id,now),
    db.prepare(`INSERT INTO installer_line_links(id,company_id,nonce_hash,line_user_id,expires_at,created_at) SELECT ?,?,?,?,?,? WHERE changes()=1
      AND EXISTS(SELECT 1 FROM solar_company_partners WHERE id=? AND approval_status='approved' AND line_link_generation=?)`)
      .bind(id,companyId,nonceHash,invitation.line_user_id,new Date(Date.now()+600000).toISOString(),now,companyId,company.line_link_generation),
  ]);
  if(results[0].meta.changes!==1)throw new Error('line_invitation_already_claimed');
  if(results[1].meta.changes!==1)throw new Error('line_link_cancelled');
  try {
    const token=await requestLinkToken(invitation.line_user_id,config);
    const active=await db.prepare(`SELECT link.id FROM installer_line_links link JOIN solar_company_partners p ON p.id=link.company_id
      WHERE link.id=? AND link.company_id=? AND link.consumed_at IS NULL AND link.expires_at>? AND p.approval_status='approved' AND p.line_link_generation=?`)
      .bind(id,companyId,new Date().toISOString(),company.line_link_generation).first();
    if(!active)throw new Error('line_link_cancelled');
    return {status:'confirmation-pending',authorizationUrl:lineAccountLinkUrl(token.linkToken,nonce)};
  } catch(error) {
    await db.prepare('UPDATE installer_line_links SET consumed_at=COALESCE(consumed_at,?) WHERE id=? AND company_id=?').bind(new Date().toISOString(),id,companyId).run();
    throw error;
  }
}
/** Called only after the portal authenticates and scopes a company owner. */
export async function unlinkLine(db:D1Database,companyId:string,actor:string){
  const now=new Date().toISOString();
  const results=await db.batch([
    // Invalidate unused invitations for both the current connection and any
    // unfinished company challenge before clearing either source of identity.
    db.prepare(`UPDATE installer_line_invitations SET consumed_at=? WHERE consumed_at IS NULL AND line_user_id IN
      (SELECT line_user_id FROM solar_company_partners WHERE id=? AND line_user_id IS NOT NULL UNION SELECT line_user_id FROM installer_line_links WHERE company_id=? AND consumed_at IS NULL)`).bind(now,companyId,companyId),
    db.prepare('UPDATE installer_line_links SET consumed_at=? WHERE company_id=? AND consumed_at IS NULL').bind(now,companyId),
    db.prepare(`UPDATE installer_outbox SET state=CASE WHEN state='sending' THEN 'cancelled' ELSE 'action-required' END,
      last_error='line_unlinked',lease_until=NULL,updated_at=? WHERE kind='installer-delivery' AND state IN('pending','failed','sending','action-required')
      AND delivery_id IN(SELECT id FROM lead_recipient_deliveries WHERE partner_id=?) RETURNING id`).bind(now,companyId),
    db.prepare(`UPDATE lead_recipient_deliveries SET notification_status='action-required',updated_at=? WHERE partner_id=?
      AND withdrawal_suppressed=0 AND EXISTS(SELECT 1 FROM installer_outbox o WHERE o.delivery_id=lead_recipient_deliveries.id AND o.last_error='line_unlinked')`).bind(now,companyId),
    db.prepare('UPDATE solar_company_partners SET line_user_id=NULL,line_link_generation=line_link_generation+1,updated_at=?,updated_by=? WHERE id=?').bind(now,actor,companyId),
    platformAudit(db,actor,'line-unlinked',companyId),
  ]);
  return {status:'not-connected' as const,notificationsRequireAction:results[2].results.length};
}
async function applyAccountLink(db:D1Database,event:LineEvent){
  if(event.link?.result!=='ok'||!event.source.userId)return;
  const hash=await sha256(event.link.nonce),now=new Date().toISOString();
  // Insert/link/consume form one transaction. The company update is conditional
  // on the exact signed source user, nonce, expiry and unconsumed challenge.
  await db.batch([
    db.prepare(`UPDATE solar_company_partners SET line_user_id=?,updated_at=? WHERE approval_status='approved' AND id=(SELECT company_id FROM installer_line_links WHERE nonce_hash=? AND line_user_id=? AND consumed_at IS NULL AND expires_at>?) AND NOT EXISTS(SELECT 1 FROM installer_webhook_events WHERE id=?)`).bind(event.source.userId,now,hash,event.source.userId,now,`line:${event.webhookEventId}`),
    db.prepare('UPDATE installer_line_links SET consumed_at=? WHERE nonce_hash=? AND line_user_id=? AND consumed_at IS NULL AND expires_at>? AND changes()=1').bind(now,hash,event.source.userId,now),
    db.prepare("INSERT OR IGNORE INTO installer_webhook_events(id,provider,created_at) VALUES(?,'line',?)").bind(`line:${event.webhookEventId}`,now),
  ]);
}
export async function processLineWebhook(db:D1Database,request:Request,raw:string){
  const config=await configFor(db,request),events=await verifyLineWebhook(raw,request.headers,config);
  for(const event of events){
    const eventId=`line:${event.webhookEventId}`;
    // This staging exercise must not even persist invitations/links for another
    // real OA visitor. Verify the signature first, then restrict event identity.
    if(config.stagingLabel&&(!event.source.userId||!config.sandboxRecipients?.includes(event.source.userId)))continue;
    // Controlled staging exercise: adding the OA does not spend a push slot.
    // The owner deliberately sends LINK; reconnection then fits the three-message cap.
    if(config.stagingLabel&&event.type==='follow')continue;
    if(await db.prepare('SELECT id FROM installer_webhook_events WHERE id=?').bind(eventId).first())continue;
    if(event.type==='accountLink'){await applyAccountLink(db,event);continue;}
    if(event.type==='unfollow'&&event.source.type==='user'&&event.source.userId){
      const now=new Date().toISOString();
      await db.batch([
        db.prepare(`UPDATE installer_outbox SET state='cancelled',last_error='line_unfollowed',updated_at=? WHERE kind='installer-delivery' AND state IN ('pending','failed') AND delivery_id IN
          (SELECT d.id FROM lead_recipient_deliveries d JOIN solar_company_partners p ON p.id=d.partner_id WHERE p.line_user_id=?)`).bind(now,event.source.userId),
        db.prepare('UPDATE solar_company_partners SET line_user_id=NULL,updated_at=? WHERE line_user_id=?').bind(now,event.source.userId),
        db.prepare("INSERT OR IGNORE INTO installer_webhook_events(id,provider,created_at) VALUES(?,'line',?)").bind(eventId,now),
      ]);
      continue;
    }
    if((event.type!=='follow'&&event.type!=='message')||event.source.type!=='user'||!event.source.userId)continue;
    if(event.type==='message'&&(event as LineEvent&{message?:{type?:string;text?:string}}).message?.text?.trim().toUpperCase()!=='LINK')continue;
    if(!config.channelSecret)throw new Error('missing_line_secret');
    // Domain-separated HMAC permits deterministic provider retry without storing
    // recoverable invitation tokens. Signed event IDs are not identity claims.
    const token=encodeBase64Url(await hmacSha256(`solarmatch-line-invitation:${event.webhookEventId}`,config.channelSecret));const tokenHash=await sha256(token),now=new Date().toISOString();
    const retryBytes=(await hmacSha256(`solarmatch-line-retry:${event.webhookEventId}`,config.channelSecret)).slice(0,16);
    // A formatted HMAC alone is not an RFC UUID: set version and variant bits.
    // The same signed event still produces the same provider idempotency key.
    retryBytes[6]=(retryBytes[6]&0x0f)|0x40;retryBytes[8]=(retryBytes[8]&0x3f)|0x80;
    const retryHex=Array.from(retryBytes,byte=>byte.toString(16).padStart(2,'0')).join('');const retryKey=`${retryHex.slice(0,8)}-${retryHex.slice(8,12)}-${retryHex.slice(12,16)}-${retryHex.slice(16,20)}-${retryHex.slice(20)}`;
    // Check and insert in one SQLite statement, not a racing count-then-insert.
    // Retrying the same event keeps its original token/expiry and provider key.
    await db.prepare(`INSERT OR IGNORE INTO installer_line_invitations(id,line_user_id,token_hash,expires_at,created_at)
      SELECT ?,?,?,?,? WHERE (SELECT COUNT(*) FROM installer_line_invitations WHERE line_user_id=? AND created_at>?)<3`)
      .bind(eventId,event.source.userId,tokenHash,new Date(Date.now()+600000).toISOString(),now,event.source.userId,new Date(Date.now()-600000).toISOString()).run();
    if(!await db.prepare('SELECT id FROM installer_line_invitations WHERE id=? AND consumed_at IS NULL AND expires_at>?').bind(eventId,now).first())continue;
    const url=new URL('/installers',request.url);url.searchParams.set('linkRequest',token);
    let result:Awaited<ReturnType<typeof sendAccountLinkInvitation>>;
    try{result=await sendAccountLinkInvitation(event.source.userId,url.href,retryKey,config);}
    catch(error){
      // Keep actionable, private failure evidence without message text, tokens,
      // recipient IDs, invitation URLs or raw provider response bodies.
      const code=error instanceof ProviderError?error.code:'invitation_send_failed';
      await db.prepare(`INSERT OR REPLACE INTO installer_operational_events(id,event_type,attribution_json,created_at)
        VALUES(?,'line-invitation-provider-failure',?,?)`).bind(`line-invitation-failure:${event.webhookEventId}`,JSON.stringify({code}),now).run();
      throw error;
    }
    const statements=[db.prepare("INSERT OR IGNORE INTO installer_webhook_events(id,provider,created_at) VALUES(?,'line',?)").bind(eventId,now)];
    if(result.status==='captured')statements.push(db.prepare("INSERT INTO installer_test_messages(id,channel,recipient,body,created_at) VALUES(?,'line',?,?,?)").bind(crypto.randomUUID(),event.source.userId,JSON.stringify(result.captured),now));
    await db.batch(statements);
  }
  return {received:true};
}
