import {z} from 'zod';
import {ATTRIBUTION_CATALOG} from './attribution';
import {auditStatement} from '@/lib/server/audit';
import type {SubmissionMode} from '@/lib/installer/enquiries';

export const submissionModeSchema=z.enum(['production','sandbox','local-test','restricted-preview']);
export const bangkokDaySchema=z.string().regex(/^\d{4}-\d{2}-\d{2}$/u).refine(value=>{
  const time=new Date(`${value}T00:00:00Z`);
  return Number.isFinite(time.getTime())&&time.toISOString().slice(0,10)===value;
},{message:'valid_bangkok_day_required'});
export const campaignSpendSchema=z.object({
  campaignCode:z.enum(['direct','unknown','pilot-search','pilot-social','pilot-line']),
  spendDay:bangkokDaySchema,
  amountMinor:z.number().int().positive().max(100000000),
  submissionMode:submissionModeSchema.default('production'),
}).strict();
export type CampaignSpendInput=z.input<typeof campaignSpendSchema>;
/** Caller must authenticate an administrator and require CSRF; append to their batch. */
export function campaignSpendStatements(db:D1Database,input:CampaignSpendInput,actor:string):D1PreparedStatement[] {
  const data=campaignSpendSchema.parse(input);
  if(!actor)throw new Error('administrator_required');
  const id=crypto.randomUUID(),now=new Date().toISOString();
  return [db.prepare(`INSERT INTO campaign_ad_spend(id,campaign_code,spend_day,submission_mode,amount_minor,recorded_at,recorded_by) VALUES(?,?,?,?,?,?,?)`)
    .bind(id,data.campaignCode,data.spendDay,data.submissionMode,data.amountMinor,now,actor),
    auditStatement(db,{actorEmail:actor,action:'campaign.ad-spend-recorded',entityType:'campaign_ad_spend',entityId:id,next:data})];
}
export const campaignReportSchema=z.object({fromDay:bangkokDaySchema,toDay:bangkokDaySchema,submissionMode:submissionModeSchema.default('production')})
  .strict().refine(value=>value.fromDay<=value.toDay&&Date.parse(value.toDay)-Date.parse(value.fromDay)<=365*86400000,{message:'ordered_period_maximum_366_days'});
export type CampaignReportInput=z.input<typeof campaignReportSchema>;
const metricNames=['incomingRequests','repeatedSubmissions','qualifiedEnquiries','rejectedRequests','qualificationUnknownRequests','unsoldEnquiries','unattributedRequests','redactedRequests',
  'paidDeliveries','paidDeliveryFeeMinor','trialDeliveries','claimRestoredPurchasedCredits','claimRestoredFeeMinorEstimate','trialRestorations','adSpendMinor','adSpendRecordCount'] as const;
export type CampaignMetrics=Record<typeof metricNames[number],number>&{estimatedContributionMinor:number};
export type CampaignReportRow=CampaignMetrics&{day:string;campaignCode:string;sourceCode:string;mediumCode:string};
const blankMetrics=():CampaignMetrics=>({...Object.fromEntries(metricNames.map(name=>[name,0])),estimatedContributionMinor:0}) as CampaignMetrics;

/** Unknown historical environments never enter a production/synthetic bucket by guessing. */
function modePredicate(alias:string,mode:SubmissionMode) {
  if(mode==='production')return `${alias}.is_test_submission=0 AND ${alias}.submission_environment='production' AND COALESCE(${alias}.submission_mode,'production')='production'`;
  if(mode==='local-test')return `${alias}.is_test_submission=1 AND (${alias}.submission_mode='local-test' OR (${alias}.submission_mode IS NULL AND ${alias}.submission_environment='private_development_preview'))`;
  if(mode==='restricted-preview')return `${alias}.is_test_submission=1 AND (${alias}.submission_mode='restricted-preview' OR (${alias}.submission_mode IS NULL AND ${alias}.submission_environment='restricted_site_operational'))`;
  return `${alias}.is_test_submission=1 AND ${alias}.submission_mode='sandbox'`;
}
/** Read-only aggregate: never returns names, phones, lead IDs, notes, answers or URLs. */
export async function campaignReport(db:D1Database,input:CampaignReportInput) {
  const scope=campaignReportSchema.parse(input),mode=modePredicate('l',scope.submissionMode);
  const period=[scope.fromDay,scope.toDay];
  const campaign="COALESCE(a.campaign_code,'unknown')";
  const original='(e.id IS NULL OR e.lead_id=l.id)';
  const acquisition=await db.prepare(`SELECT date(l.created_at,'+7 hours') day,${campaign} campaignCode,
    SUM(CASE WHEN ${original} THEN 1 ELSE 0 END) incomingRequests,
    SUM(CASE WHEN e.id IS NOT NULL AND e.lead_id<>l.id THEN 1 ELSE 0 END) repeatedSubmissions,
    SUM(CASE WHEN e.lead_id=l.id AND a.original_qualified=1 THEN 1 ELSE 0 END) qualifiedEnquiries,
    SUM(CASE WHEN ${original} AND a.original_qualified=0 THEN 1 ELSE 0 END) rejectedRequests,
    SUM(CASE WHEN ${original} AND a.lead_id IS NULL THEN 1 ELSE 0 END) qualificationUnknownRequests,
    SUM(CASE WHEN e.lead_id=l.id AND NOT EXISTS(SELECT 1 FROM lead_recipient_deliveries d WHERE d.enquiry_id=e.id AND d.delivery_channel='portal') THEN 1 ELSE 0 END) unsoldEnquiries,
    SUM(CASE WHEN ${original} AND (a.campaign_code IS NULL OR a.campaign_code='unknown') THEN 1 ELSE 0 END) unattributedRequests,
    SUM(CASE WHEN ${original} AND a.capture_state='redacted' THEN 1 ELSE 0 END) redactedRequests
    FROM leads l LEFT JOIN lead_campaign_attribution a ON a.lead_id=l.id
    LEFT JOIN installer_enquiry_leads el ON el.lead_id=l.id LEFT JOIN installer_enquiries e ON e.id=el.enquiry_id
    WHERE ${mode} AND date(l.created_at,'+7 hours') BETWEEN ? AND ? GROUP BY day,campaignCode`).bind(...period).all<Record<string,string|number>>();
  const deliveries=await db.prepare(`SELECT date(d.available_at,'+7 hours') day,${campaign} campaignCode,
    SUM(CASE WHEN d.funding_source='purchased' THEN 1 ELSE 0 END) paidDeliveries,
    SUM(CASE WHEN d.funding_source='purchased' THEN d.price_minor ELSE 0 END) paidDeliveryFeeMinor,
    SUM(CASE WHEN d.funding_source='trial' THEN 1 ELSE 0 END) trialDeliveries
    FROM lead_recipient_deliveries d JOIN leads l ON l.id=d.lead_id LEFT JOIN lead_campaign_attribution a ON a.lead_id=l.id
    WHERE d.delivery_channel='portal' AND ${mode} AND date(d.available_at,'+7 hours') BETWEEN ? AND ? GROUP BY day,campaignCode`).bind(...period).all<Record<string,string|number>>();
  const restorations=await db.prepare(`SELECT date(k.created_at,'+7 hours') day,${campaign} campaignCode,
    SUM(CASE WHEN d.funding_source='purchased' THEN k.available_delta-k.debt_delta ELSE 0 END) claimRestoredPurchasedCredits,
    SUM(CASE WHEN d.funding_source='purchased' AND d.credit_cost>0 THEN (k.available_delta-k.debt_delta)*1.0*d.price_minor/d.credit_cost ELSE 0 END) claimRestoredFeeMinorEstimate,
    SUM(k.trial_delta) trialRestorations
    FROM installer_credit_ledger k JOIN installer_claims c ON c.id=k.source_id JOIN lead_recipient_deliveries d ON d.id=c.delivery_id
    JOIN leads l ON l.id=d.lead_id LEFT JOIN lead_campaign_attribution a ON a.lead_id=l.id
    WHERE k.kind='claim-restoration' AND d.delivery_channel='portal' AND ${mode} AND date(k.created_at,'+7 hours') BETWEEN ? AND ? GROUP BY day,campaignCode`).bind(...period).all<Record<string,string|number>>();
  const spend=await db.prepare(`SELECT spend_day day,campaign_code campaignCode,SUM(amount_minor) adSpendMinor,COUNT(*) adSpendRecordCount FROM campaign_ad_spend
    WHERE submission_mode=? AND spend_day BETWEEN ? AND ? GROUP BY day,campaignCode`).bind(scope.submissionMode,...period).all<Record<string,string|number>>();
  // Legacy notes have no safe code/environment association. Do not parse or expose them.
  const legacy=await db.prepare(`SELECT COALESCE(SUM(amount_minor),0) amount FROM installer_operational_events
    WHERE event_type='ad-spend' AND date(created_at,'+7 hours') BETWEEN ? AND ?`).bind(...period).first<{amount:number}>();
  // Company-level payment reversals cannot truthfully be allocated to a homeowner campaign/mode.
  const reversals=await db.prepare(`SELECT COALESCE(SUM(debt_delta-available_delta),0) credits FROM installer_credit_ledger
    WHERE kind='payment-reversal' AND date(created_at,'+7 hours') BETWEEN ? AND ?`).bind(...period).first<{credits:number}>();
  const buckets=new Map<string,CampaignReportRow>();
  for(const results of [acquisition,deliveries,restorations,spend])for(const raw of results.results) {
    const codes=ATTRIBUTION_CATALOG.find(row=>row.campaign===raw.campaignCode)??ATTRIBUTION_CATALOG[1];
    const day=String(raw.day),key=`${day}:${codes.campaign}`;
    const row=buckets.get(key)??{day,campaignCode:codes.campaign,sourceCode:codes.source,mediumCode:codes.medium,...blankMetrics()};
    for(const metric of metricNames)row[metric]+=Number(raw[metric]??0);
    buckets.set(key,row);
  }
  const rows=[...buckets.values()].sort((a,b)=>a.day.localeCompare(b.day)||a.campaignCode.localeCompare(b.campaignCode));
  const totals=blankMetrics();
  for(const row of rows) {
    row.estimatedContributionMinor=row.paidDeliveryFeeMinor-row.claimRestoredFeeMinorEstimate-row.adSpendMinor;
    for(const metric of metricNames)totals[metric]+=row[metric];
  }
  totals.estimatedContributionMinor=totals.paidDeliveryFeeMinor-totals.claimRestoredFeeMinorEstimate-totals.adSpendMinor;
  return {scope,rows,totals,unallocatedAllEnvironments:{legacyAdSpendMinor:legacy?.amount??0,paymentReversalCredits:reversals?.credits??0},
    basis:'Asia/Bangkok event day. Incoming requests count canonical original or unlinked requests, including rejected/unknown. Repeated submissions are separate, not new acquisitions. Deliveries/restorations use the canonical original submission campaign.',
    qualificationBasis:'Original installer eligibility snapshot when capture enabled; missing snapshots are reported separately, not guessed from mutable rescoring.',
    unsoldBasis:'Original canonical enquiries submitted in this period with no portal delivery as of report time (not a historical end-of-period cohort).',
    missingCostNotice:'No spend record means advertising cost is unknown, not proven zero. Contribution subtracts only recorded spend and may overstate the result when costs are missing.',
    estimateNotice:'Estimated contribution, not profit or cash settlement. Excludes unallocated legacy spend, payment reversals, provider/SMS/LINE/hosting costs, taxes and overhead. Trial delivery is zero earned fee; credit purchases are not earned delivery income.'};
}
export type CampaignReport=Awaited<ReturnType<typeof campaignReport>>;
export function safeCsvCell(value:string|number) {
  const numeric=typeof value==='number';
  let text=String(value);
  if(!numeric&&(/^[\s\u0000-\u001f]*[=+\-@]/u.test(text)||/^[\t\r\n]/u.test(text)))text=`'${text}`;
  return `"${text.replace(/"/gu,'""')}"`;
}
export function campaignReportCsv(report:CampaignReport) {
  const columns=['day','campaignCode','sourceCode','mediumCode',...metricNames,'estimatedContributionMinor'] as const;
  return [[safeCsvCell('submissionMode'),...columns.map(safeCsvCell)].join(','),
    ...report.rows.map(row=>[safeCsvCell(report.scope.submissionMode),...columns.map(column=>safeCsvCell(row[column]))].join(','))].join('\r\n')+'\r\n';
}
