/** Internal review calculations only. No provider calls, approvals or money movement. */
export interface ShutdownAccount {company_id:string;available:number;reserved:number;trial_remaining:number;debt:number}
export interface ShutdownLedger {id:string;company_id:string;kind:string;available_delta:number;reserved_delta:number;trial_delta:number;debt_delta:number;source_id:string|null;idempotency_key:string}
export interface ShutdownOrder {id:string;company_id:string;credits:number;amount_minor:number;currency:string;status:string;provider:string;provider_order_id:string|null;refunded_minor:number;reversed_credits:number;credited_at:string|null}
export interface ShutdownClaim {id:string;company_id:string;status:string;funding_source:string;credit_cost:number}
export interface ShutdownSnapshot {accounts:ShutdownAccount[];ledger:ShutdownLedger[];orders:ShutdownOrder[];claims:ShutdownClaim[]}
export type ShutdownPaymentEvidence='live-recorded'|'test-only'|'mixed'|'none';
export interface ShutdownCompanyLiability {
  companyId:string;availableCredits:number;reservedCredits:number;debtCredits:number;trialEntitlements:number;
  paidPurchaseCredits:number;livePurchaseCredits:number;testPurchaseCredits:number;paidAmountMinor:number;previouslyRefundedMinor:number;
  reversedPurchasedCredits:number;purchasedRestoredCredits:number;promotionalCreditUnitsIssued:number;unpricedCreditUnitsIssued:number;syntheticCreditUnitsIssued:number;
  purchasedUnusedCredits:number|null;refundCalculationMinor:number|null;currency:'THB';
  calculationStatus:'calculated'|'review-required'|'no-unused-purchased-credits';paymentEvidence:ShutdownPaymentEvidence;
  refundApproval:'not-approved-by-report';moneyReturned:'not-established-by-report';pendingClaims:number;reviewReasons:string[];
  orders:Array<{id:string;status:string;provider:string;evidence:ShutdownPaymentEvidence;credits:number;amountMinor:number;providerRecordedRefundedMinor:number;reversedCredits:number;credited:boolean}>;
}
export interface ShutdownLiabilityReport {
  generatedAt:string;purpose:'review-only';valuation:'historical-confirmed-purchase-values';providerReconciliationRequired:true;
  companies:ShutdownCompanyLiability[];
  totals:{calculatedLiveLiabilityMinor:number;calculatedSyntheticLiabilityMinor:number;reviewRequiredCompanies:number;complete:boolean};
}

const economicUnits=(entry:ShutdownLedger)=>entry.available_delta+entry.reserved_delta-entry.debt_delta;
function evidence(order:ShutdownOrder):ShutdownPaymentEvidence {
  if(order.provider==='local-test'||order.provider==='omise'&&/^chrg_test_[A-Za-z0-9]+$/.test(order.provider_order_id??''))return 'test-only';
  if(order.provider==='omise'&&/^chrg_[A-Za-z0-9]+$/.test(order.provider_order_id??''))return 'live-recorded';
  return 'none';
}
const sum=(values:number[])=>values.reduce((total,value)=>total+value,0);
function safeUnits(...values:number[]) {return values.every(value=>Number.isSafeInteger(value)&&value>=0);}

/** No spend-to-purchase-lot allocation exists in the ledger. Never assume FIFO. */
export function calculateShutdownLiabilities(snapshot:ShutdownSnapshot,generatedAt=new Date().toISOString()):ShutdownLiabilityReport {
  const companies=snapshot.accounts.map(account=>{
    const ledger=snapshot.ledger.filter(entry=>entry.company_id===account.company_id);
    const orders=snapshot.orders.filter(order=>order.company_id===account.company_id);
    const claims=snapshot.claims.filter(claim=>claim.company_id===account.company_id);
    const reasons=new Set<string>();
    const add=(reason:string)=>reasons.add(reason);
    const pendingClaims=claims.filter(claim=>['submitted','needs-information'].includes(claim.status)).length;
    const recorded=orders.filter(order=>!!order.credited_at);
    const purchases:ShutdownOrder[]=[];
    let promotionalCreditUnitsIssued=0,unpricedCreditUnitsIssued=0,syntheticCreditUnitsIssued=0,purchasedRestoredCredits=0;
    if(!safeUnits(account.available,account.reserved,account.trial_remaining,account.debt))add('invalid-account-units');
    if(ledger.some(entry=>![entry.available_delta,entry.reserved_delta,entry.trial_delta,entry.debt_delta].every(Number.isSafeInteger)))add('invalid-ledger-units');
    const balanceFields=[['available_delta','available'],['reserved_delta','reserved'],['trial_delta','trial_remaining'],['debt_delta','debt']] as const;
    if(balanceFields.some(([delta,balance])=>sum(ledger.map(entry=>entry[delta]))!==account[balance]))add('account-ledger-mismatch');
    for(const order of recorded) {
      const matching=ledger.filter(entry=>entry.kind==='purchase'&&entry.source_id===order.id&&entry.idempotency_key===`payment:${order.id}`);
      if(!safeUnits(order.credits,order.amount_minor,order.refunded_minor,order.reversed_credits)||order.credits<1||order.amount_minor<1||order.refunded_minor>order.amount_minor||order.reversed_credits>order.credits){add('invalid-order-values');continue;}
      if(order.currency.toLowerCase()!=='thb'){add('unsupported-currency');continue;}
      if(!['paid','refunded','reversed'].includes(order.status)||matching.length!==1||economicUnits(matching[0])!==order.credits){add('purchase-order-ledger-mismatch');continue;}
      if(evidence(order)==='none'){add('purchase-payment-evidence-missing');continue;}
      purchases.push(order);
      const reversalUnits=sum(ledger.filter(entry=>entry.kind==='payment-reversal'&&entry.source_id===order.id).map(entry=>-economicUnits(entry)));
      if(reversalUnits!==order.reversed_credits)add('reversal-order-ledger-mismatch');
      if(BigInt(order.refunded_minor)*BigInt(order.credits)!==BigInt(order.reversed_credits)*BigInt(order.amount_minor))add('partial-refund-credit-rounding-requires-review');
    }
    if(orders.some(order=>!order.credited_at&&(['authorizing','reconciliation-required'].includes(order.status)||order.status==='pending'&&!!order.provider_order_id)))add('unreconciled-payment-attempts');
    for(const entry of ledger) {
      const units=economicUnits(entry);
      if(entry.kind==='purchase') {
        if(!purchases.some(order=>order.id===entry.source_id))add('purchase-ledger-without-confirmed-order');
      } else if(entry.kind==='payment-reversal') {
        if(!purchases.some(order=>order.id===entry.source_id))add('reversal-ledger-without-confirmed-order');
      } else if(entry.kind==='claim-restoration') {
        const claim=claims.find(value=>value.id===entry.source_id&&value.status==='approved');
        if(!claim){add('restoration-claim-evidence-missing');continue;}
        if(claim.funding_source==='purchased'&&units===claim.credit_cost&&entry.trial_delta===0)purchasedRestoredCredits+=units;
        else if(claim.funding_source==='trial'&&units===0&&entry.trial_delta===1){/* Separate entitlement, no cash value. */}
        else add('restoration-funding-mismatch');
      } else if(entry.kind==='trial-grant') {
        if(units!==0)add('trial-purchased-funding-mismatch');
      } else if(entry.kind==='delivery') {
        if(units>0)add('invalid-delivery-credit-entry');
      } else if(['reservation','release'].includes(entry.kind)&&units===0&&entry.trial_delta===0){/* No economic credit creation. */}
      else if(['promo-grant','promotional-grant','promotion'].includes(entry.kind)) {
        promotionalCreditUnitsIssued+=Math.max(0,units);if(units!==0)add('promotional-balance-allocation-unresolved');
      } else if(['fixture-purchase','local-test-fixture'].includes(entry.kind)) {
        syntheticCreditUnitsIssued+=Math.max(0,units);if(units!==0)add('synthetic-balance-allocation-unresolved');
      } else if(units!==0) {unpricedCreditUnitsIssued+=Math.max(0,units);add('unpriced-credit-adjustment');}
    }
    if(account.debt>0)add('existing-debt-requires-review');
    if(account.reserved>0)add('reserved-credits-require-review');
    if(pendingClaims>0)add('pending-claim-decisions');
    const live=purchases.filter(order=>evidence(order)==='live-recorded'),test=purchases.filter(order=>evidence(order)==='test-only');
    const paymentEvidence:ShutdownPaymentEvidence=live.length&&test.length?'mixed':live.length?'live-recorded':test.length?'test-only':'none';
    if(paymentEvidence==='mixed')add('test-live-balance-allocation-unresolved');
    const remaining=purchases.filter(order=>order.credits>order.reversed_credits);
    const netCredits=sum(remaining.map(order=>order.credits-order.reversed_credits));
    const unused=account.available+account.reserved;
    if(unused>netCredits)add('balance-exceeds-evidenced-purchased-credits');
    if(!Number.isSafeInteger(unused)||!Number.isSafeInteger(netCredits)||!Number.isSafeInteger(sum(purchases.map(order=>order.amount_minor))))add('unsafe-financial-total');
    let purchasedUnusedCredits:number|null=null,refundCalculationMinor:number|null=null;
    const unclassified=['account-ledger-mismatch','invalid-account-units','invalid-ledger-units','purchase-order-ledger-mismatch','purchase-payment-evidence-missing','purchase-ledger-without-confirmed-order','promotional-balance-allocation-unresolved','synthetic-balance-allocation-unresolved','unpriced-credit-adjustment','test-live-balance-allocation-unresolved','balance-exceeds-evidenced-purchased-credits'];
    if(unused===0)purchasedUnusedCredits=0;
    else if(!unclassified.some(reason=>reasons.has(reason)))purchasedUnusedCredits=unused;
    if(purchasedUnusedCredits!==null) {
      if(unused===0)refundCalculationMinor=0;
      else if(unused===netCredits)refundCalculationMinor=sum(remaining.map(order=>order.amount_minor-order.refunded_minor));
      else if(remaining.length) {
        const first=remaining[0];
        const uniform=remaining.every(order=>BigInt(order.amount_minor)*BigInt(first.credits)===BigInt(first.amount_minor)*BigInt(order.credits));
        if(!uniform)add('historical-purchase-price-allocation-unresolved');
        else {
          const numerator=BigInt(unused)*BigInt(first.amount_minor),denominator=BigInt(first.credits);
          if(numerator%denominator!==BigInt(0))add('fractional-minor-unit-rounding-requires-review');
          else refundCalculationMinor=Number(numerator/denominator);
        }
      }
    }
    if(refundCalculationMinor!==null&&(!Number.isSafeInteger(refundCalculationMinor)||refundCalculationMinor>sum(remaining.map(order=>order.amount_minor-order.refunded_minor))))add('refund-calculation-exceeds-retained-payment');
    // Unresolved accounting, outstanding claims and held/debt units block an exact
    // refund candidate, even if a provisional arithmetic result could be produced.
    if(reasons.size)refundCalculationMinor=null;
    return {companyId:account.company_id,availableCredits:account.available,reservedCredits:account.reserved,debtCredits:account.debt,trialEntitlements:account.trial_remaining,
      paidPurchaseCredits:sum(purchases.map(order=>order.credits)),livePurchaseCredits:sum(live.map(order=>order.credits)),testPurchaseCredits:sum(test.map(order=>order.credits)),
      paidAmountMinor:sum(purchases.map(order=>order.amount_minor)),previouslyRefundedMinor:sum(purchases.map(order=>order.refunded_minor)),reversedPurchasedCredits:sum(purchases.map(order=>order.reversed_credits)),
      purchasedRestoredCredits,promotionalCreditUnitsIssued,unpricedCreditUnitsIssued,syntheticCreditUnitsIssued,purchasedUnusedCredits,refundCalculationMinor,currency:'THB' as const,
      calculationStatus:reasons.size?'review-required' as const:unused===0?'no-unused-purchased-credits' as const:'calculated' as const,paymentEvidence,
      refundApproval:'not-approved-by-report' as const,moneyReturned:'not-established-by-report' as const,pendingClaims,reviewReasons:[...reasons].sort(),
      orders:orders.map(order=>({id:order.id,status:order.status,provider:order.provider,evidence:evidence(order),credits:order.credits,amountMinor:order.amount_minor,providerRecordedRefundedMinor:order.refunded_minor,reversedCredits:order.reversed_credits,credited:!!order.credited_at})),
    };
  });
  const reviewRequiredCompanies=companies.filter(company=>company.calculationStatus==='review-required').length;
  return {generatedAt,purpose:'review-only',valuation:'historical-confirmed-purchase-values',providerReconciliationRequired:true,companies,
    totals:{calculatedLiveLiabilityMinor:sum(companies.filter(company=>company.paymentEvidence==='live-recorded').map(company=>company.refundCalculationMinor??0)),
      calculatedSyntheticLiabilityMinor:sum(companies.filter(company=>company.paymentEvidence==='test-only').map(company=>company.refundCalculationMinor??0)),reviewRequiredCompanies,complete:reviewRequiredCompanies===0}};
}

/** SELECT-only D1 batch supplies one consistent financial snapshot. Caller authenticates admin access. */
export async function getShutdownLiabilityReport(db:D1Database):Promise<ShutdownLiabilityReport> {
  const results=await db.batch([
    db.prepare('SELECT company_id,available,reserved,trial_remaining,debt FROM installer_credit_accounts ORDER BY company_id'),
    db.prepare('SELECT id,company_id,kind,available_delta,reserved_delta,trial_delta,debt_delta,source_id,idempotency_key FROM installer_credit_ledger ORDER BY company_id,created_at,id'),
    db.prepare('SELECT id,company_id,credits,amount_minor,currency,status,provider,provider_order_id,refunded_minor,reversed_credits,credited_at FROM installer_payment_orders ORDER BY company_id,created_at,id'),
    db.prepare('SELECT c.id,c.company_id,c.status,d.funding_source,d.credit_cost FROM installer_claims c JOIN lead_recipient_deliveries d ON d.id=c.delivery_id ORDER BY c.company_id,c.id'),
  ]);
  return calculateShutdownLiabilities({accounts:results[0].results as unknown as ShutdownAccount[],ledger:results[1].results as unknown as ShutdownLedger[],orders:results[2].results as unknown as ShutdownOrder[],claims:results[3].results as unknown as ShutdownClaim[]});
}

export const shutdownLiabilityCsvColumns=['generated_at','purpose','provider_reconciliation_required','company_id','currency','payment_evidence','available_credits','reserved_credits','debt_credits','trial_entitlements','paid_purchase_credits','live_purchase_credits','test_purchase_credits','paid_amount_minor','provider_recorded_refunded_minor','reversed_purchased_credits','purchased_restored_credits','promotional_credit_units_issued','unpriced_credit_units_issued','synthetic_credit_units_issued','purchased_unused_credits','refund_calculation_minor','calculation_status','refund_approval','money_returned','pending_claims','review_reasons','order_ids'] as const;
function csvCell(value:string|number|null) {
  let text=value===null?'':String(value);
  if(typeof value==='string'&&/^(?:[\s\u0000-\u001f]*[=+\-@]|[\t\r\n])/.test(text))text="'"+text;
  return '"'+text.replaceAll('"','""')+'"';
}
export function shutdownLiabilityCsv(report:ShutdownLiabilityReport) {
  const rows=report.companies.map(row=>[report.generatedAt,report.purpose,'true',row.companyId,row.currency,row.paymentEvidence,row.availableCredits,row.reservedCredits,row.debtCredits,row.trialEntitlements,row.paidPurchaseCredits,row.livePurchaseCredits,row.testPurchaseCredits,row.paidAmountMinor,row.previouslyRefundedMinor,row.reversedPurchasedCredits,row.purchasedRestoredCredits,row.promotionalCreditUnitsIssued,row.unpricedCreditUnitsIssued,row.syntheticCreditUnitsIssued,row.purchasedUnusedCredits,row.refundCalculationMinor,row.calculationStatus,row.refundApproval,row.moneyReturned,row.pendingClaims,row.reviewReasons.join('|'),row.orders.map(order=>order.id).join('|')]);
  return [shutdownLiabilityCsvColumns,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';
}
