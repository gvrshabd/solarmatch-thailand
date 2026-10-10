import { getRuntimeEnv } from '@/lib/server/runtime';
import { encodeBase64Url,hmacSha256,sha256 } from '@/lib/server/crypto';
import { assertPlatformRequest } from './platform';
import { getPlatformSettings } from './settings';
import { lineAccountLinkUrl,requestLinkToken,sendAccountLinkInvitation,verifyLineWebhook,type LineConfig,type LineEvent } from './providers/line';
async function configFor(db:D1Database,request:Request):Promise<LineConfig>{const {mode}=assertPlatformRequest(request);const env=getRuntimeEnv(),settings=await getPlatformSettings(db);let recipients:string[]=[];try{const value=JSON.parse(env.LINE_TEST_RECIPIENTS??'[]');if(Array.isArray(value)&&value.every(item=>typeof item==='string'))recipients=value;}catch{/* fail closed */}return {mode:mode==='local-test'?'local-test':'sandbox',channelSecret:env.LINE_CHANNEL_SECRET,accessToken:env.LINE_CHANNEL_ACCESS_TOKEN,outboundEnabled:settings.notificationsEnabled&&env.OUTBOUND_MESSAGES_ENABLED==='true',sandboxRecipients:recipients};}
export async function beginLineLink(db:D1Database,companyId:string,request:Request,linkRequest?:string){
  const config=await configFor(db,request);
  const company=await db.prepare("SELECT id,line_user_id FROM solar_company_partners WHERE id=? AND approval_status='approved'").bind(companyId).first<{id:string;line_user_id:string|null}>();if(!company)throw new Error('company_not_approved');
  if(!linkRequest)return {status:company.line_user_id?'connected':'not-connected',instructions:'เพิ่ม SolarMatch Official Account เป็นเพื่อน แล้วส่งข้อความ LINK เพื่อรับลิงก์เชื่อมต่อ / Add the SolarMatch Official Account and send LINK to receive a secure connection link.'};
  if(!/^[A-Za-z0-9_-]{43}$/.test(linkRequest))throw new Error('invalid_line_invitation');
  const hash=await sha256(linkRequest),now=new Date().toISOString();
  const invitation=await db.prepare('SELECT * FROM installer_line_invitations WHERE token_hash=? AND consumed_at IS NULL AND expires_at>?').bind(hash,now).first<{id:string;line_user_id:string}>();if(!invitation)throw new Error('line_invitation_expired');
  const token=await requestLinkToken(invitation.line_user_id,config);
  const nonce=encodeBase64Url(crypto.getRandomValues(new Uint8Array(32))),nonceHash=await sha256(nonce),id=crypto.randomUUID();
  const results=await db.batch([
    db.prepare('UPDATE installer_line_invitations SET consumed_at=? WHERE id=? AND consumed_at IS NULL AND expires_at>?').bind(now,invitation.id,now),
    db.prepare('INSERT INTO installer_line_links(id,company_id,nonce_hash,line_user_id,expires_at,created_at) SELECT ?,?,?,?,?,? WHERE changes()=1').bind(id,companyId,nonceHash,invitation.line_user_id,new Date(Date.now()+600000).toISOString(),now),
  ]);
  if(results[1].meta.changes!==1)throw new Error('line_invitation_already_claimed');
  return {status:'confirmation-pending',authorizationUrl:lineAccountLinkUrl(token.linkToken,nonce)};
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
    if(await db.prepare('SELECT id FROM installer_webhook_events WHERE id=?').bind(eventId).first())continue;
    if(event.type==='accountLink'){await applyAccountLink(db,event);continue;}
    if((event.type!=='follow'&&event.type!=='message')||event.source.type!=='user'||!event.source.userId)continue;
    if(event.type==='message'&&(event as LineEvent&{message?:{type?:string;text?:string}}).message?.text?.trim().toUpperCase()!=='LINK')continue;
    if(!config.channelSecret)throw new Error('missing_line_secret');
    // Domain-separated HMAC permits deterministic provider retry without storing
    // recoverable invitation tokens. Signed event IDs are not identity claims.
    const token=encodeBase64Url(await hmacSha256(`solarmatch-line-invitation:${event.webhookEventId}`,config.channelSecret));const tokenHash=await sha256(token),now=new Date().toISOString();
    const retryHex=Array.from(await hmacSha256(`solarmatch-line-retry:${event.webhookEventId}`,config.channelSecret),byte=>byte.toString(16).padStart(2,'0')).join('').slice(0,32);const retryKey=`${retryHex.slice(0,8)}-${retryHex.slice(8,12)}-${retryHex.slice(12,16)}-${retryHex.slice(16,20)}-${retryHex.slice(20)}`;
    // Check and insert in one SQLite statement, not a racing count-then-insert.
    // Retrying the same event keeps its original token/expiry and provider key.
    await db.prepare(`INSERT OR IGNORE INTO installer_line_invitations(id,line_user_id,token_hash,expires_at,created_at)
      SELECT ?,?,?,?,? WHERE (SELECT COUNT(*) FROM installer_line_invitations WHERE line_user_id=? AND created_at>?)<3`)
      .bind(eventId,event.source.userId,tokenHash,new Date(Date.now()+600000).toISOString(),now,event.source.userId,new Date(Date.now()-600000).toISOString()).run();
    if(!await db.prepare('SELECT id FROM installer_line_invitations WHERE id=? AND consumed_at IS NULL AND expires_at>?').bind(eventId,now).first())continue;
    const url=new URL('/installers',request.url);url.searchParams.set('linkRequest',token);
    const result=await sendAccountLinkInvitation(event.source.userId,url.href,retryKey,config);
    const statements=[db.prepare("INSERT OR IGNORE INTO installer_webhook_events(id,provider,created_at) VALUES(?,'line',?)").bind(eventId,now)];
    if(result.status==='captured')statements.push(db.prepare("INSERT INTO installer_test_messages(id,channel,recipient,body,created_at) VALUES(?,'line',?,?,?)").bind(crypto.randomUUID(),event.source.userId,JSON.stringify(result.captured),now));
    await db.batch(statements);
  }
  return {received:true};
}
