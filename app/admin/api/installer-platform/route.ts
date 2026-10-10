import { z } from 'zod';
import { requireAdminRequest,isAdminError } from '@/lib/server/admin-api';
import { requireDatabase } from '@/lib/server/runtime';
import { assertPlatformRequest,platformBody,platformJson } from '@/lib/installer/platform';
import { getPlatformSettings,installerSettingsSchema,materialTermsChanged } from '@/lib/installer/settings';
import { allocateEnquiry,processQueue,grantTrial,decideClaim,suppressEnquiry,platformAudit,isoNow,type Row } from '@/lib/installer/deliveries';
import { processOutbox } from '@/lib/installer/jobs';
import { reconcileOrder } from '@/lib/installer/payments';
import {reviewEnquiry} from '@/lib/installer/review';
import {previewRetention} from '@/lib/installer/privacy';
export const dynamic='force-dynamic';
const input=z.object({action:z.enum(['approve-company','grant-trial','allocate','process-queue','retry-outbox','decide-claim','adjust-credit','save-settings','reconcile','pause-company','suppress-enquiry','record-ad-spend','acknowledge-privacy-notification','review-enquiry','preview-retention']),companyId:z.string().uuid().optional(),approve:z.boolean().optional(),enquiryId:z.string().max(100).optional(),companyIds:z.array(z.string().uuid()).max(3).optional(),claimId:z.string().uuid().optional(),decision:z.enum(['approved','rejected','needs-information','same-project','distinct-project','reject']).optional(),leadId:z.string().uuid().optional(),notes:z.string().trim().max(2000).optional(),units:z.number().int().min(-10000).max(10000).optional(),reason:z.string().trim().min(3).max(1000).optional(),settings:installerSettingsSchema.optional(),orderId:z.string().uuid().optional(),paused:z.boolean().optional(),amountMinor:z.number().int().positive().max(100000000).optional(),outboxId:z.string().max(100).optional()}).strict();
export async function GET(request:Request) {
  const identity=await requireAdminRequest(request);if(isAdminError(identity))return identity;
  try{assertPlatformRequest(request);const db=requireDatabase();const settings=await getPlatformSettings(db);
const queries={companies:'SELECT p.*,a.available,a.reserved,a.trial_remaining,a.debt FROM solar_company_partners p LEFT JOIN installer_credit_accounts a ON a.company_id=p.id ORDER BY p.created_at DESC LIMIT 200',enquiries:`SELECT e.*,(SELECT o.attribution_json FROM installer_operational_events o WHERE o.enquiry_id=e.id AND o.event_type='qualification-evaluated' AND json_extract(o.attribution_json,'$.sourceLeadId')=e.lead_id ORDER BY o.created_at DESC,o.rowid DESC LIMIT 1) AS qualification_snapshot FROM installer_enquiries e ORDER BY e.created_at DESC LIMIT 200`,deliveries:'SELECT * FROM lead_recipient_deliveries ORDER BY created_at DESC LIMIT 200',orders:'SELECT id,company_id,amount_minor,credits,status,created_at FROM installer_payment_orders ORDER BY created_at DESC LIMIT 200',claims:'SELECT * FROM installer_claims ORDER BY submitted_at DESC LIMIT 200',ledger:'SELECT * FROM installer_credit_ledger ORDER BY created_at DESC LIMIT 200',outbox:'SELECT id,delivery_id,company_id,kind,state,attempts,last_error,created_at FROM installer_outbox ORDER BY created_at DESC LIMIT 200'};
    const tables:Record<string,unknown>={};for(const [key,sql] of Object.entries(queries))tables[key]=(await db.prepare(sql).all()).results;
    const summary=await db.prepare(`SELECT (SELECT COUNT(*) FROM leads) AS rawSubmissionRecords,
      (SELECT COUNT(*) FROM leads WHERE quote_contact_requested=1) AS contactRequestSubmissions,
      (SELECT COUNT(*) FROM installer_enquiries) AS enquiries,
      (SELECT COUNT(*) FROM installer_enquiries WHERE verification_state='verified') AS verifiedEnquiries,
      (SELECT COUNT(*) FROM installer_enquiries WHERE qualification_state='eligible') AS eligibleEnquiries,
      (SELECT COUNT(*) FROM installer_enquiries WHERE qualification_state='review' OR status='review') AS reviewEnquiries,
      (SELECT COUNT(*) FROM installer_enquiries WHERE duplicate_state IN ('repeat','outside-window-review')) AS duplicateEnquiries,
      (SELECT COUNT(*) FROM installer_enquiries WHERE status='unmatched') AS unmatchedEnquiries,
      (SELECT COUNT(*) FROM lead_recipient_deliveries WHERE delivery_channel='portal') AS deliveries,
      (SELECT COUNT(*) FROM lead_recipient_deliveries WHERE delivery_channel='portal' AND funding_source='purchased') AS paidDeliveries,
      (SELECT COUNT(*) FROM lead_recipient_deliveries WHERE delivery_channel='portal' AND funding_source='trial') AS trialDeliveries,
      COALESCE(ROUND((SELECT COUNT(*)*1.0 FROM lead_recipient_deliveries WHERE delivery_channel='portal')/NULLIF((SELECT COUNT(*) FROM installer_enquiries),0),2),0) AS averageDeliveriesPerEnquiry,
      (SELECT COUNT(*) FROM installer_claims) AS submittedClaims,
      (SELECT COUNT(*) FROM installer_claims WHERE status='approved') AS approvedClaims,
      (SELECT COALESCE(SUM(available_delta),0) FROM installer_credit_ledger WHERE kind='claim-restoration') AS restoredPurchasedCredits,
      (SELECT COALESCE(SUM(trial_delta),0) FROM installer_credit_ledger WHERE kind='claim-restoration') AS restoredTrialEntitlements,
      (SELECT COUNT(*) FROM installer_payment_orders WHERE credited_at IS NOT NULL) AS fundedPurchaseOrders,
      (SELECT COUNT(*) FROM (SELECT company_id FROM installer_payment_orders WHERE credited_at IS NOT NULL GROUP BY company_id HAVING COUNT(*)>1)) AS repeatPurchasingCompanies,
      (SELECT COUNT(*) FROM lead_recipient_deliveries WHERE delivery_channel='portal' AND outcome_status='won') AS reportedWonOutcomes,
      (SELECT COUNT(*) FROM lead_recipient_deliveries WHERE delivery_channel='portal' AND quotation_status='provided') AS reportedQuotations,
      (SELECT COUNT(*) FROM installer_outbox WHERE state IN ('failed','needs-reconciliation')) AS notificationFailures,
      (SELECT COALESCE(SUM(amount_minor-refunded_minor),0) FROM installer_payment_orders WHERE credited_at IS NOT NULL) AS prepaidCashMinor,
      (SELECT COALESCE(SUM(price_minor),0) FROM lead_recipient_deliveries d WHERE delivery_channel='portal' AND funding_source='purchased' AND NOT EXISTS(SELECT 1 FROM installer_claims c WHERE c.delivery_id=d.id AND c.status='approved')) AS earnedServiceFeesMinor,
      (SELECT COALESCE(SUM(available*?),0) FROM installer_credit_accounts) AS nominalAvailableCreditValueMinor,
      NULL AS verifiedBankSettlementMinor,
      (SELECT COALESCE(SUM(amount_minor),0) FROM installer_operational_events WHERE event_type='ad-spend') AS adSpendMinor,
      (SELECT COUNT(*) FROM installer_outbox WHERE state IN ('failed','needs-reconciliation','action-required')) AS attentionRequired`).bind(settings.creditValueMinor).first();
    return platformJson({settings,...tables,summary});
  }catch{return platformJson({error:'installer_platform_unavailable'},503);}
}
export async function POST(request:Request) {
  const identity=await requireAdminRequest(request,{csrf:true});if(isAdminError(identity))return identity;
  try{const data=input.parse(await platformBody(request));const db=requireDatabase();const actor=identity.email;const now=isoNow();
    if(data.action==='save-settings'){
      if(data.settings){const previous=await getPlatformSettings(db);if(materialTermsChanged(previous,data.settings)&&previous.termsVersion===data.settings.termsVersion)throw new Error('new_terms_version_required');if(previous.termsVersion!==data.settings.termsVersion&&await db.prepare("SELECT id FROM installer_settings_revisions WHERE json_extract(config_json,'$.termsVersion')=? LIMIT 1").bind(data.settings.termsVersion).first())throw new Error('terms_version_already_used');}
      if(!data.settings)throw new Error('missing_settings');const json=JSON.stringify(data.settings);
      await db.batch([db.prepare('UPDATE installer_platform_settings SET config_json=?,version=version+1,updated_at=?,updated_by=? WHERE id=1').bind(json,now,actor),db.prepare('INSERT INTO installer_settings_revisions(id,config_json,actor,created_at) VALUES(?,?,?,?)').bind(crypto.randomUUID(),json,actor,now),platformAudit(db,actor,'settings-changed','1')]);
    }else if(data.action==='approve-company'){
      const company=await db.prepare('SELECT * FROM solar_company_partners WHERE id=?').bind(data.companyId??'').first<Row>();
      if(!company)throw new Error('company_missing');
      if(data.approve&&(!company.registration_number||!company.privacy_notice_url||company.contract_state!=='active'||!company.contract_effective_date||!company.contract_expiry_date))throw new Error('legal_identity_and_contract_required');
      await db.batch([db.prepare('UPDATE solar_company_partners SET approval_status=?,updated_at=?,updated_by=? WHERE id=?').bind(data.approve?'approved':'rejected',now,actor,company.id),db.prepare('INSERT OR IGNORE INTO installer_credit_accounts(company_id) VALUES(?)').bind(company.id),platformAudit(db,actor,'company-approval',String(company.id),{approved:!!data.approve})]);
    }else if(data.action==='grant-trial'){await grantTrial(db,data.companyId??'',actor);
    }else if(data.action==='allocate'){return platformJson(await allocateEnquiry(db,data.enquiryId??'',actor,data.companyIds));
    }else if(data.action==='process-queue'){return platformJson({results:await processQueue(db,actor)});
    }else if(data.action==='retry-outbox'){return platformJson(await processOutbox(db));
    }else if(data.action==='decide-claim'){
      if(!data.claimId||!data.decision||!['approved','rejected','needs-information'].includes(data.decision)||!data.notes)throw new Error('claim_decision_requires_reason');await decideClaim(db,data.claimId,data.decision,data.notes,actor);
    }else if(data.action==='adjust-credit'){
      if(!data.companyId||!data.units||!data.reason)throw new Error('adjustment_requires_reason');await db.batch([db.prepare(`INSERT INTO installer_credit_ledger(id,company_id,kind,available_delta,source_id,idempotency_key,reason,actor,created_at) VALUES(?,?,'manual-adjustment',?,?,?,?,?,?)`).bind(crypto.randomUUID(),data.companyId,data.units,crypto.randomUUID(),crypto.randomUUID(),data.reason,actor,now),platformAudit(db,actor,'credit-adjustment',data.companyId,{units:data.units,reason:data.reason})]);
    }else if(data.action==='reconcile'){
      const orders=data.orderId?[{id:data.orderId}]:(await db.prepare("SELECT id FROM installer_payment_orders WHERE status IN ('pending','paid','reconciliation-required') ORDER BY updated_at LIMIT 30").all<{id:string}>()).results;
      for(const order of orders)await reconcileOrder(db,null,order.id,request);
    }else if(data.action==='pause-company'){await db.batch([db.prepare('UPDATE solar_company_partners SET paused=? WHERE id=?').bind(data.paused?1:0,data.companyId??''),platformAudit(db,actor,'company-pause',data.companyId??'',{paused:data.paused})]);
    }else if(data.action==='suppress-enquiry'){await suppressEnquiry(db,data.enquiryId??'',data.reason??'privacy-request',actor);
    }else if(data.action==='review-enquiry'){
      if(!data.enquiryId||!data.reason||data.reason.length<20||!data.decision||!['same-project','distinct-project','reject'].includes(data.decision))throw new Error('document_review_reason');
      return platformJson(await reviewEnquiry(db,data.enquiryId,data.decision as 'same-project'|'distinct-project'|'reject',data.reason,actor,data.leadId));
    }else if(data.action==='preview-retention'){
      const settings=await getPlatformSettings(db);if(!settings.retentionDays)throw new Error('retention_policy_required');
      const preview=await previewRetention(db,request,settings.retentionDays);return platformJson({retentionDays:settings.retentionDays,preview:preview.results,previewOnly:true});
    }else if(data.action==='record-ad-spend'){
      if(!data.amountMinor||!data.reason)throw new Error('spend_requires_reason');await db.batch([db.prepare("INSERT INTO installer_operational_events(id,event_type,amount_minor,attribution_json,created_at) VALUES(?,'ad-spend',?,?,?)").bind(crypto.randomUUID(),data.amountMinor,JSON.stringify({campaign:data.reason}),now),platformAudit(db,actor,'ad-spend','manual',{amountMinor:data.amountMinor})]);
    }else if(data.action==='acknowledge-privacy-notification'){
      if(!data.outboxId||!data.notes)throw new Error('notification_evidence_required');await db.batch([db.prepare("UPDATE installer_outbox SET state='accepted',updated_at=? WHERE id=? AND kind='withdrawal' AND state='action-required'").bind(now,data.outboxId),platformAudit(db,actor,'privacy-recipient-notified',data.outboxId,{notes:data.notes})]);
    }
    return platformJson({ok:true});
  }catch{return platformJson({error:'operation_rejected_check_eligibility_and_required_fields'},409);}
}
