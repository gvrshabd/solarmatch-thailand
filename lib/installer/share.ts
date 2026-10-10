import { encodeBase64Url,sha256 } from '@/lib/server/crypto';
import { getPlatformSettings } from './settings';
import { activeDelivery,deliverySelect,deliveryProjection } from './portal-data';
import { platformAudit,isoNow,type Row } from './deliveries';
export async function rotateShareLink(db:D1Database,companyId:string,deliveryId:string,actor:string,origin:string) {
  const row=await db.prepare(`${deliverySelect} WHERE d.id=? AND d.partner_id=? AND ${activeDelivery}`).bind(deliveryId,companyId).first<Row>();
  if(!row) throw new Error('delivery_unavailable');
  const settings=await getPlatformSettings(db);const now=isoNow();const token=encodeBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const expiry=new Date(Date.now()+settings.shareLinkHours*3600000).toISOString();
  const results=await db.batch([db.prepare('UPDATE installer_share_tokens SET revoked_at=? WHERE delivery_id=? AND revoked_at IS NULL').bind(now,deliveryId),
    db.prepare(`INSERT INTO installer_share_tokens(id,delivery_id,token_hash,expires_at,created_at,created_by) SELECT ?,d.id,?,?,?,? FROM lead_recipient_deliveries d JOIN leads l ON l.id=d.lead_id JOIN installer_enquiries e ON e.id=d.enquiry_id WHERE d.id=? AND d.partner_id=? AND ${activeDelivery}`).bind(crypto.randomUUID(),await sha256(token),expiry,now,actor,deliveryId,companyId),platformAudit(db,actor,'rotate-share-link',deliveryId)]);
  if(results[1].meta.changes!==1)throw new Error('delivery_unavailable');
  return {url:`${origin}/enquiry#token=${token}`,expiresAt:expiry};
}
export async function readShareLink(db:D1Database,token:string) {
  const hash=await sha256(token);
  const row=await db.prepare(`${deliverySelect} JOIN installer_share_tokens t ON t.delivery_id=d.id WHERE t.token_hash=? AND t.revoked_at IS NULL AND julianday(t.expires_at)>julianday('now') AND ${activeDelivery}`).bind(hash).first<Row>();
  if(!row) return null;
  const now=isoNow();await db.batch([db.prepare('UPDATE lead_recipient_deliveries SET viewed_at=COALESCE(viewed_at,?) WHERE id=?').bind(now,row.id),
    db.prepare("INSERT INTO installer_operational_events(id,event_type,delivery_id,company_id,created_at) VALUES(?,'enquiry-viewed',?,?,?)").bind(crypto.randomUUID(),row.id,row.partner_id,now)]);
  const expiry=await db.prepare('SELECT expires_at FROM installer_share_tokens WHERE token_hash=?').bind(hash).first<{expires_at:string}>();
  return {delivery:deliveryProjection(row),expiresAt:expiry?.expires_at};
}
