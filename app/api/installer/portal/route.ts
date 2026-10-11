import { z } from 'zod';
import { getInstallerSession } from '@/lib/installer/auth';
import { assertPlatformRequest,platformBody,platformJson } from '@/lib/installer/platform';
import { requireDatabase } from '@/lib/server/runtime';
import { activeDelivery,getPortalData,membership } from '@/lib/installer/portal-data';
import { getPlatformSettings } from '@/lib/installer/settings';
import { createClaim,isoNow,platformAudit } from '@/lib/installer/deliveries';
import { rotateShareLink } from '@/lib/installer/share';
import { createOrder,authorizeOrder,reconcileOrder } from '@/lib/installer/payments';
import { beginLineLink,unlinkLine } from '@/lib/installer/line-linking';
import {allowInstallerRequest} from '@/lib/installer/rate-limit';
import {normalizeServiceArea} from '@/lib/installer/service-areas';

export const dynamic='force-dynamic';
const companySchema=z.object({name:z.string().trim().min(2).max(160),contactName:z.string().trim().min(1).max(160),phone:z.string().trim().min(6).max(40),serviceAreas:z.array(z.string().trim().min(1).max(100).transform(normalizeServiceArea)).min(1).max(100).transform(areas=>[...new Set(areas)]),supportedProducts:z.array(z.literal('shared_residential')).min(1).max(1),dailyLimit:z.number().int().min(0).max(100),paused:z.boolean()});
const actionSchema=z.object({action:z.enum(['create-company','update-company','accept-terms','checkout','authorize-payment','reconcile-order','create-claim','rotate-share-link','revoke-share-link','report-outcome','link-line','unlink-line']),name:z.unknown().optional(),contactName:z.unknown().optional(),phone:z.unknown().optional(),serviceAreas:z.unknown().optional(),supportedProducts:z.unknown().optional(),dailyLimit:z.unknown().optional(),paused:z.unknown().optional(),version:z.string().max(100).optional(),packageId:z.string().max(100).optional(),method:z.string().max(60).optional(),orderId:z.string().uuid().optional(),tokenOrSourceId:z.string().max(100).optional(),deliveryId:z.string().uuid().optional(),reason:z.string().trim().min(3).max(200).optional(),notes:z.string().max(2000).optional(),outcome:z.enum(['open','won','lost','not-suitable']).optional(),linkRequest:z.string().max(200).optional()}).strict();
export async function GET(request:Request) {
  try{assertPlatformRequest(request);const session=await getInstallerSession(request);if(!session)return platformJson({error:'unauthorized'},401);const deliveryId=new URL(request.url).searchParams.get('deliveryId');if(deliveryId&&!z.string().uuid().safeParse(deliveryId).success)return platformJson({error:'invalid_delivery'},400);return platformJson(await getPortalData(requireDatabase(),session,deliveryId??undefined));}
  catch{return platformJson({error:'portal_unavailable'},503);}
}
export async function POST(request:Request) {
  try{
    const data=actionSchema.parse(await platformBody(request));const session=await getInstallerSession(request);
    if(!session||!session.user.emailVerified)return platformJson({error:'verified_account_required'},401);
    const db=requireDatabase();if(!await allowInstallerRequest(db,`portal:${session.user.id}`,30,60))return platformJson({error:'too_many_requests'},429);const company=await membership(db,session.user.id);const actor=session.user.email;const now=isoNow();
    if(data.action==='create-company'){
      if(company)throw new Error('company_already_exists');const profile=companySchema.parse(data);const id=crypto.randomUUID();
      await db.batch([
        db.prepare(`INSERT INTO solar_company_partners(id,legal_name_en,legal_name_th,trading_name,registration_number,privacy_notice_url,service_provinces_json,created_by,updated_by,created_at,updated_at,portal_contact_name,portal_phone,supported_products_json,daily_limit,paused)
        VALUES(?,?,?,?,?,'',?,?,?,?,?,?,?,?,?,1)`).bind(id,profile.name,profile.name,profile.name,'',JSON.stringify(profile.serviceAreas),actor,actor,now,now,profile.contactName,profile.phone,JSON.stringify(profile.supportedProducts),profile.dailyLimit),
        db.prepare("INSERT INTO installer_memberships(id,company_id,user_id,role) VALUES(?,?,?,'owner')").bind(crypto.randomUUID(),id,session.user.id),
        db.prepare('INSERT INTO installer_credit_accounts(company_id) VALUES(?)').bind(id),platformAudit(db,actor,'company-created',id),
      ]);return platformJson({ok:true,companyId:id},201);
    }
    if(!company||company.role!=='owner')return platformJson({error:'company_owner_required'},403);const companyId=String(company.id);
    if(data.action==='update-company'){
      const profile=companySchema.parse(data);await db.batch([db.prepare(`UPDATE solar_company_partners SET trading_name=?,portal_contact_name=?,portal_phone=?,service_provinces_json=?,supported_products_json=?,daily_limit=?,paused=?,updated_at=?,updated_by=? WHERE id=?`).bind(profile.name,profile.contactName,profile.phone,JSON.stringify(profile.serviceAreas),JSON.stringify(profile.supportedProducts),profile.dailyLimit,profile.paused?1:0,now,actor,companyId),platformAudit(db,actor,'company-updated',companyId)]);
    }else if(data.action==='accept-terms'){
      const settings=await getPlatformSettings(db);if(data.version!==settings.termsVersion)throw new Error('terms_changed');await db.batch([db.prepare('UPDATE solar_company_partners SET terms_version=?,terms_accepted_at=? WHERE id=?').bind(settings.termsVersion,now,companyId),platformAudit(db,actor,'terms-accepted',companyId,{version:settings.termsVersion})]);
    }else if(data.action==='checkout'){
      if(data.packageId!=='credits-20')throw new Error('package_unavailable');return platformJson(await createOrder(db,companyId,request,data.method));
    }else if(data.action==='authorize-payment'){
      if(!data.orderId||!data.tokenOrSourceId)throw new Error('invalid_payment');return platformJson(await authorizeOrder(db,companyId,data.orderId,data.tokenOrSourceId,request));
    }else if(data.action==='reconcile-order'){
      if(!data.orderId)throw new Error('invalid_order');return platformJson(await reconcileOrder(db,companyId,data.orderId,request));
    }else if(data.action==='create-claim'){
      if(!data.deliveryId||!data.reason)throw new Error('invalid_claim');return platformJson(await createClaim(db,companyId,data.deliveryId,data.reason,data.notes??''),201);
    }else if(data.action==='rotate-share-link'){
      if(!data.deliveryId)throw new Error('invalid_delivery');return platformJson(await rotateShareLink(db,companyId,data.deliveryId,actor,new URL(request.url).origin));
    }else if(data.action==='revoke-share-link'){
      await db.batch([db.prepare('UPDATE installer_share_tokens SET revoked_at=? WHERE delivery_id IN (SELECT id FROM lead_recipient_deliveries WHERE id=? AND partner_id=?) AND revoked_at IS NULL').bind(now,data.deliveryId??'',companyId),platformAudit(db,actor,'revoke-share-link',data.deliveryId??'')]);
    }else if(data.action==='report-outcome'){
      if(!data.outcome||!data.deliveryId)throw new Error('invalid_outcome');
      // Enforce contact availability in the write itself so a withdrawal between
      // authentication and commit cannot update the outcome or create a false audit.
      const results=await db.batch([
        db.prepare(`UPDATE lead_recipient_deliveries SET outcome_status=?,updated_at=? WHERE id=? AND partner_id=? AND id IN
          (SELECT d.id FROM lead_recipient_deliveries d JOIN leads l ON l.id=d.lead_id JOIN installer_enquiries e ON e.id=d.enquiry_id
          WHERE ${activeDelivery} AND l.archived_at IS NULL AND d.delivery_status IN ('delivered','accepted'))`).bind(data.outcome,now,data.deliveryId,companyId),
        db.prepare(`INSERT INTO audit_events(id,actor_email,action,entity_type,entity_id,next_json)
          SELECT ?,?,'installer.outcome','installer_platform',?,? WHERE changes()=1`).bind(crypto.randomUUID(),actor,data.deliveryId,JSON.stringify({outcome:data.outcome})),
      ]);
      if(results[0].meta.changes!==1)return platformJson({error:'delivery_unavailable'},400);
    }else if(data.action==='link-line')return platformJson(await beginLineLink(db,companyId,request,data.linkRequest));
    else if(data.action==='unlink-line')return platformJson(await unlinkLine(db,companyId,actor));
    return platformJson({ok:true});
  }catch{return platformJson({error:'request_could_not_be_completed'},400);}
}
