import { deliveryLocation } from './presentation';
import { parseJson, type Row } from './deliveries';
import { getPlatformSettings, installerTermsFor } from './settings';
import type { InstallerPortalData, InstallerDelivery } from './portal-contract';
import { getRuntimeEnv } from '@/lib/server/runtime';
import { enabledPaymentMethods } from './providers/payment';
export async function membership(db:D1Database,userId:string) {
  return db.prepare(`SELECT p.*,m.role FROM installer_memberships m JOIN solar_company_partners p ON p.id=m.company_id WHERE m.user_id=? AND p.archived_at IS NULL`).bind(userId).first<Row>();
}
export function deliveryProjection(row:Row):InstallerDelivery {
  const withdrawn=Number(row.withdrawal_suppressed??0)===1||Number(row.lead_suppressed??0)===1||!!row.enquiry_suppressed_at||!!row.consent_withdrawn_at||!!row.purged_at||!!row.deleted_at;
  const fields=parseJson<string[]>(row.fields_disclosed_json,[]);const allowed=(field:string)=>!withdrawn&&fields.includes(field);
  const answers=parseJson<Record<string,unknown>>(row.answers_json,{});
  const assessment:Record<string,unknown>={};
  const safeKeys=['propertyType','ownershipStatus','monthlyBillThb','daytimePattern','daytimeLoads','airConditionerCount','roofArea','roofMaterial','shade','planningTimeframe','projectType'];
  if(allowed('assessmentAnswers')) for(const key of safeKeys) if(answers[key]!==undefined) assessment[key]=answers[key];
  if(allowed('assessmentAnswers')&&answers.consumptionInput==='kwh') {
    delete assessment.monthlyBillThb;
    assessment.monthlyConsumptionKwh=answers.monthlyConsumptionKwh;
    assessment.billingPeriodDays=answers.billingPeriodDays??365/12;
    assessment.billInputStatus='not-supplied';
  }
  return {id:String(row.id),enquiryId:String(row.enquiry_id),reference:`SM-${String(row.id).slice(0,8).toUpperCase()}`,product:String(row.product),fundingSource:String(row.funding_source),creditCost:Number(row.credit_cost),deliveredAt:String(row.available_at),notificationStatus:String(row.notification_status),claimDeadline:String(row.claim_deadline),withdrawn,homeownerName:[allowed('legalFirstName')?row.legal_first_name:'',allowed('legalLastName')?row.legal_last_name:''].filter(Boolean).join(' '),phone:allowed('phone')?String(row.phone_e164??''):'',location:allowed('assessmentAnswers')?deliveryLocation({province:String(row.province??''),district:String(answers.district??''),customArea:String(row.custom_location??''),location:''},true):'',requestedAt:withdrawn?'':String(row.requested_at),assessment,qualification:'',province:allowed('assessmentAnswers')?String(row.province??''):'',district:allowed('assessmentAnswers')?String(answers.district??''):'',customArea:allowed('assessmentAnswers')?String(row.custom_location??''):'',teamNotes:!withdrawn?String(row.portal_team_notes??''):'',notesRevision:Number(row.portal_notes_revision??0),notesUpdatedAt:!withdrawn&&row.portal_notes_updated_at?String(row.portal_notes_updated_at):null,outcome:!withdrawn&&(row.portal_progress_stage||row.outcome_status)?String(row.portal_progress_stage||row.outcome_status):null};
}
export const deliverySelect=`SELECT d.*,l.legal_first_name,l.legal_last_name,l.phone_e164,l.province,l.custom_location,l.answers_json,l.created_at AS requested_at,l.hard_eligible,
 l.suppressed AS lead_suppressed,l.consent_withdrawn_at,l.purged_at,l.deleted_at,e.suppressed_at AS enquiry_suppressed_at
 FROM lead_recipient_deliveries d JOIN leads l ON l.id=d.lead_id JOIN installer_enquiries e ON e.id=d.enquiry_id`;
export const activeDelivery=`d.delivery_channel='portal' AND d.withdrawal_suppressed=0 AND e.suppressed_at IS NULL AND l.suppressed=0 AND l.consent_withdrawn_at IS NULL AND l.purged_at IS NULL AND l.deleted_at IS NULL`;
export async function getPortalData(db:D1Database,session:InstallerPortalData['session'],deliveryId?:string):Promise<InstallerPortalData> {
  const settings=await getPlatformSettings(db);const company=await membership(db,session.user.id);const id=String(company?.id??'');
  const installerTerms=installerTermsFor(settings);
  const [balance,deliveries,orders,ledger,claims]=await Promise.all([
    db.prepare('SELECT * FROM installer_credit_accounts WHERE company_id=?').bind(id).first<Row>(),
    db.prepare(`${deliverySelect} WHERE d.partner_id=? AND d.delivery_channel='portal'${deliveryId?' AND d.id=?':''} ORDER BY d.available_at DESC LIMIT 100`).bind(...(deliveryId?[id,deliveryId]:[id])).all<Row>(),
    db.prepare('SELECT * FROM installer_payment_orders WHERE company_id=? ORDER BY created_at DESC LIMIT 100').bind(id).all<Row>(),
    db.prepare('SELECT * FROM installer_credit_ledger WHERE company_id=? ORDER BY created_at DESC LIMIT 100').bind(id).all<Row>(),
    db.prepare(`SELECT c.*,NOT(${activeDelivery}) AS financial_only FROM installer_claims c
      JOIN lead_recipient_deliveries d ON d.id=c.delivery_id JOIN leads l ON l.id=d.lead_id
      JOIN installer_enquiries e ON e.id=d.enquiry_id WHERE c.company_id=? AND d.partner_id=?
      ORDER BY c.submitted_at DESC LIMIT 100`).bind(id,id).all<Row>(),
  ]);
  return {session,company:company?{id,name:String(company.trading_name||company.legal_name_en),approvalStatus:String(company.approval_status),contactName:String(company.portal_contact_name),phone:String(company.portal_phone),serviceAreas:parseJson(company.service_provinces_json,[]),supportedProducts:parseJson(company.supported_products_json,[]),dailyLimit:Number(company.daily_limit),paused:company.paused===1,lineLinked:!!company.line_user_id,termsAcceptedVersion:company.terms_version?String(company.terms_version):null}:null,
    products:[{id:'shared_residential',nameEn:'Shared residential enquiry',nameTh:'คำขอโซลาร์บ้านแบบแชร์',creditCost:settings.sharedCredits,enabled:true},{id:'exclusive_residential',nameEn:'Exclusive residential enquiry (unavailable)',nameTh:'คำขอโซลาร์บ้านแบบเฉพาะราย (ยังไม่เปิดให้บริการ)',creditCost:settings.exclusiveCredits,enabled:false}],
    packages:[{id:'credits-20',nameEn:`${settings.packageCredits} credits`,nameTh:`${settings.packageCredits} เครดิต`,credits:settings.packageCredits,amountMinor:settings.packageAmountMinor,currency:'THB',taxLabel:settings.taxLabel}],balance:{available:Number(balance?.available??0),reserved:Number(balance?.reserved??0),trialRemaining:Number(balance?.trial_remaining??0),debt:Number(balance?.debt??0)},deliveries:deliveries.results.map(deliveryProjection),
    orders:orders.results.map(r=>({id:String(r.id),status:String(r.status),amountMinor:Number(r.amount_minor),currency:String(r.currency),credits:Number(r.credits),createdAt:String(r.created_at),refundedMinor:Number(r.refunded_minor??0),reversedCredits:Number(r.reversed_credits??0),receiptReference:r.receipt_reference?String(r.receipt_reference):null})),
    ledger:ledger.results.map(r=>({id:String(r.id),kind:String(r.kind),units:Number(r.available_delta)-Number(r.debt_delta),sourceId:r.source_id?String(r.source_id):null,availableDelta:Number(r.available_delta),reservedDelta:Number(r.reserved_delta),trialDelta:Number(r.trial_delta),debtDelta:Number(r.debt_delta),reason:String(r.reason),createdAt:String(r.created_at)})),
    // Free-text reasons/decisions can themselves contain homeowner identity.
    // Keep them for protected adjudication, but never return them after withdrawal.
    claims:claims.results.map(r=>({id:String(r.id),deliveryId:String(r.delivery_id),reason:r.financial_only?'withdrawn-claim':String(r.reason),status:String(r.status),submittedAt:String(r.submitted_at),decision:!r.financial_only&&r.decision_notes?String(r.decision_notes):null})),
    terms:{version:settings.termsVersion,textEn:installerTerms.en,textTh:installerTerms.th,acceptedAt:company?.terms_version===settings.termsVersion&&company?.terms_accepted_at?String(company.terms_accepted_at):null},
    integrations:{paymentsEnabled:settings.paymentsEnabled,paymentMethods:enabledPaymentMethods({activatedMethods:settings.paymentMethods,activatedCardBrands:settings.paymentCardBrands}),lineConfigured:!!getRuntimeEnv().LINE_CHANNEL_ACCESS_TOKEN,mode:getRuntimeEnv().INSTALLER_PLATFORM_MODE??'off'},
    availability:{platformPaused:settings.platformPaused,allocationPaused:settings.deliveryPaused,notificationsEnabled:settings.notificationsEnabled,canManage:company?.role==='owner'},
    commercial:{creditValueMinor:settings.creditValueMinor,sharedCredits:settings.sharedCredits,claimDays:settings.claimDays,trialDeliveries:settings.trialDeliveries,recipientLimit:settings.recipientLimit},
  };
}
