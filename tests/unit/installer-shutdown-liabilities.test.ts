import { afterEach, describe, expect, it, vi } from 'vitest';
import { calculateShutdownLiabilities, getShutdownLiabilityReport, shutdownLiabilityCsv, type ShutdownLedger, type ShutdownOrder, type ShutdownSnapshot } from '@/lib/installer/shutdown-liabilities';
import { FixtureDatabase } from '../installer/fixtures';

const company='synthetic-company';
function payment(id='purchase',amount=400000,credits=20,mode:'live'|'test'|'local'='live'):ShutdownOrder {
  return {id,company_id:company,credits,amount_minor:amount,currency:'thb',status:'paid',provider:mode==='local'?'local-test':'omise',provider_order_id:mode==='live'?`chrg_${id}`:mode==='test'?`chrg_test_${id}`:`localcharge_test_${id}`,refunded_minor:0,reversed_credits:0,credited_at:'2026-10-11T03:00:00.000Z'};
}
function entry(kind:string,available:number,options:Partial<ShutdownLedger>={}):ShutdownLedger {
  return {id:`${kind}-${Math.random()}`,company_id:company,kind,available_delta:available,reserved_delta:0,trial_delta:0,debt_delta:0,source_id:null,idempotency_key:`fixture-${Math.random()}`,...options};
}
function purchase(order:ShutdownOrder) {return entry('purchase',order.credits,{source_id:order.id,idempotency_key:`payment:${order.id}`});}
function snapshot(orders=[payment()],other:ShutdownLedger[]=[]):ShutdownSnapshot {
  const ledger=[...orders.map(purchase),...other];
  const total=(field:'available_delta'|'reserved_delta'|'trial_delta'|'debt_delta')=>ledger.reduce((value,row)=>value+row[field],0);
  return {accounts:[{company_id:company,available:total('available_delta'),reserved:total('reserved_delta'),trial_remaining:total('trial_delta'),debt:total('debt_delta')}],orders,ledger,claims:[]};
}
function report(data:ShutdownSnapshot) {return calculateShutdownLiabilities(data,'2026-10-11T03:00:00.000Z');}
const row=(data:ShutdownSnapshot)=>report(data).companies[0];
afterEach(()=>vi.unstubAllGlobals());

describe('read-only shutdown purchased-credit reconciliation',()=>{
  it('calculates unused purchased credits at their evidenced historical paid price',()=>{
    const result=row(snapshot([payment('historical',300000)], [entry('delivery',-2)]));
    expect(result).toMatchObject({availableCredits:18,purchasedUnusedCredits:18,refundCalculationMinor:270000,paidAmountMinor:300000,paymentEvidence:'live-recorded',calculationStatus:'calculated',refundApproval:'not-approved-by-report',moneyReturned:'not-established-by-report'});
    expect(result.reviewReasons).toEqual([]);
  });
  it('separates trial entitlement and trial restoration from refundable credit',()=>{
    const data=snapshot([payment()],[entry('trial-grant',0,{trial_delta:2}),entry('delivery',0,{trial_delta:-1}),entry('claim-restoration',0,{trial_delta:1,source_id:'trial-claim'})]);
    data.claims=[{id:'trial-claim',company_id:company,status:'approved',funding_source:'trial',credit_cost:2}];
    expect(row(data)).toMatchObject({trialEntitlements:2,purchasedUnusedCredits:20,refundCalculationMinor:400000,purchasedRestoredCredits:0});
  });
  it('accounts for prior proportional refunds and ledger reversals without refunding them twice',()=>{
    const order={...payment(),status:'refunded',refunded_minor:80000,reversed_credits:4};
    const data=snapshot([order],[entry('payment-reversal',-4,{source_id:order.id})]);
    const result=report(data);
    expect(result.companies[0]).toMatchObject({previouslyRefundedMinor:80000,reversedPurchasedCredits:4,purchasedUnusedCredits:16,refundCalculationMinor:320000,calculationStatus:'calculated'});
    expect(result.totals.calculatedLiveLiabilityMinor).toBe(320000);
  });
  it('flags nonproportional partial-refund credit rounding for review instead of inventing policy',()=>{
    const order={...payment(),status:'refunded',refunded_minor:1000,reversed_credits:1};
    const result=row(snapshot([order],[entry('payment-reversal',-1,{source_id:order.id})]));
    expect(result.refundCalculationMinor).toBeNull();expect(result.reviewReasons).toContain('partial-refund-credit-rounding-requires-review');
    expect(result.previouslyRefundedMinor).toBe(1000);
  });
  it('shows existing reversal debt separately and never treats it as an automatic cash offset',()=>{
    const order={...payment(),status:'reversed',refunded_minor:400000,reversed_credits:20};
    const result=row(snapshot([order],[entry('delivery',-2),entry('payment-reversal',-18,{debt_delta:2,source_id:order.id})]));
    expect(result).toMatchObject({availableCredits:0,debtCredits:2,purchasedUnusedCredits:0,refundCalculationMinor:null,reversedPurchasedCredits:20});
    expect(result.reviewReasons).toContain('existing-debt-requires-review');
  });
  it('has no unused-credit liability after a full, fully evidenced reversal with no debt',()=>{
    const order={...payment(),status:'reversed',refunded_minor:400000,reversed_credits:20};
    const result=row(snapshot([order],[entry('payment-reversal',-20,{source_id:order.id})]));
    expect(result).toMatchObject({availableCredits:0,debtCredits:0,purchasedUnusedCredits:0,refundCalculationMinor:0,previouslyRefundedMinor:400000,calculationStatus:'no-unused-purchased-credits'});
  });
  it('recognizes an evidenced approved purchased restoration while keeping claim approval distinct from refund approval',()=>{
    const data=snapshot([payment()],[entry('delivery',-2),entry('claim-restoration',2,{source_id:'approved-claim'})]);
    data.claims=[{id:'approved-claim',company_id:company,status:'approved',funding_source:'purchased',credit_cost:2}];
    expect(row(data)).toMatchObject({purchasedRestoredCredits:2,refundCalculationMinor:400000,refundApproval:'not-approved-by-report'});
    data.claims[0].status='submitted';
    expect(row(data).reviewReasons).toContain('restoration-claim-evidence-missing');
    expect(row(data).refundCalculationMinor).toBeNull();
  });
  it('flags outstanding claims and reservations for review',()=>{
    const data=snapshot([payment()],[entry('reservation',-2,{reserved_delta:2})]);
    data.claims=[{id:'pending',company_id:company,status:'submitted',funding_source:'purchased',credit_cost:2}];
    expect(row(data)).toMatchObject({availableCredits:18,reservedCredits:2,purchasedUnusedCredits:20,pendingClaims:1,refundCalculationMinor:null});
    expect(row(data).reviewReasons).toContain('pending-claim-decisions');expect(row(data).reviewReasons).toContain('reserved-credits-require-review');
  });
  it.each(['manual-adjustment','promo-grant','local-test-fixture'])('does not invent a paid value or remaining purchase allocation for %s credits',kind=>{
    const result=row(snapshot([payment()],[entry(kind,2),entry('delivery',-4)]));
    expect(result).toMatchObject({availableCredits:18,purchasedUnusedCredits:null,refundCalculationMinor:null,calculationStatus:'review-required'});
    if(kind==='manual-adjustment')expect(result.unpricedCreditUnitsIssued).toBe(2);
    if(kind==='promo-grant')expect(result.promotionalCreditUnitsIssued).toBe(2);
    if(kind==='local-test-fixture')expect(result.syntheticCreditUnitsIssued).toBe(2);
  });
  it('flags heterogeneous consumed purchase prices because the ledger has no purchase-lot allocation',()=>{
    const result=row(snapshot([payment('first'),payment('second',100000,10)],[entry('delivery',-2)]));
    expect(result).toMatchObject({purchasedUnusedCredits:28,refundCalculationMinor:null,calculationStatus:'review-required'});
    expect(result.reviewReasons).toContain('historical-purchase-price-allocation-unresolved');
  });
  it('can value all unused evidenced purchases at different historic prices without assuming any spending order',()=>{
    expect(row(snapshot([payment('first'),payment('second',100000,10)]))).toMatchObject({purchasedUnusedCredits:30,refundCalculationMinor:500000,calculationStatus:'calculated'});
  });
  it('never rounds fractional minor units into a policy decision',()=>{
    const result=row(snapshot([payment('fraction',10001,3)],[entry('delivery',-1)]));
    expect(result.refundCalculationMinor).toBeNull();expect(result.reviewReasons).toContain('fractional-minor-unit-rounding-requires-review');
  });
  it.each(['test','local'] as const)('keeps %s payment evidence outside live money totals',mode=>{
    const result=report(snapshot([payment('testorder',400000,20,mode)]));
    expect(result.companies[0].paymentEvidence).toBe('test-only');
    expect(result.totals).toMatchObject({calculatedLiveLiabilityMinor:0,calculatedSyntheticLiabilityMinor:400000});
  });
  it('flags mixed live and test funding rather than applying synthetic money to a real liability',()=>{
    const result=report(snapshot([payment('live'),payment('test',400000,20,'test')]));
    expect(result.companies[0]).toMatchObject({paymentEvidence:'mixed',purchasedUnusedCredits:null,refundCalculationMinor:null});
    expect(result.companies[0].reviewReasons).toContain('test-live-balance-allocation-unresolved');
    expect(result.totals).toMatchObject({calculatedLiveLiabilityMinor:0,calculatedSyntheticLiabilityMinor:0,complete:false});
  });
  it('rejects ledger/order discrepancies and missing provider evidence',()=>{
    const data=snapshot();data.accounts[0].available=21;
    expect(row(data).reviewReasons).toContain('account-ledger-mismatch');expect(row(data).refundCalculationMinor).toBeNull();
    const missing=snapshot([{...payment(),provider_order_id:null}]);
    expect(row(missing).reviewReasons).toContain('purchase-payment-evidence-missing');expect(row(missing).refundCalculationMinor).toBeNull();
  });
  it('flags a charge attempt requiring reconciliation before calculating a refund for the company',()=>{
    const data=snapshot();
    data.orders.push({...payment('ambiguous'),credited_at:null,status:'reconciliation-required',provider_order_id:null});
    const result=row(data);
    expect(result.refundCalculationMinor).toBeNull();expect(result.reviewReasons).toContain('unreconciled-payment-attempts');
    expect(result.paidAmountMinor).toBe(400000);
  });
  it('does not count an abandoned unassociated checkout as payment or a cash liability',()=>{
    const data=snapshot([]);data.orders=[{...payment('abandoned'),credited_at:null,status:'pending',provider_order_id:null}];
    expect(row(data)).toMatchObject({paidAmountMinor:0,refundCalculationMinor:0,calculationStatus:'no-unused-purchased-credits'});
  });
  it('returns an empty/zero liability without treating trial-only entitlements as cash',()=>{
    const result=row(snapshot([], [entry('trial-grant',0,{trial_delta:2})]));
    expect(result).toMatchObject({trialEntitlements:2,purchasedUnusedCredits:0,refundCalculationMinor:0,calculationStatus:'no-unused-purchased-credits',paymentEvidence:'none'});
  });
  it('protects CSV cells from spreadsheet formulas and does not include free-text ledger or claim notes',()=>{
    const result=report(snapshot());result.companies[0].companyId='=HYPERLINK("https://example.test")';result.companies[0].orders[0].id='\t@malicious';
    const csv=shutdownLiabilityCsv(result);
    expect(csv).toContain('"\'=HYPERLINK(""https://example.test"")"');expect(csv).toContain('"\'\t@malicious"');
    expect(csv).toContain('"not-approved-by-report"');expect(csv).toContain('"not-established-by-report"');
    expect(csv).not.toContain('reason,actor');
  });
  it('reads a transactionally consistent database snapshot without writes or provider calls',async()=>{
    const fixture=new FixtureDatabase();
    const network=vi.fn(()=>{throw new Error('Provider access prohibited in report');});vi.stubGlobal('fetch',network);
    try {
      fixture.sqlite.prepare("INSERT INTO solar_company_partners(id,legal_name_en,legal_name_th,privacy_notice_url,created_by,updated_by) VALUES(?,'Synthetic','ทดสอบ','','fixture','fixture')").run(company);
      fixture.sqlite.prepare('UPDATE solar_company_partners SET archived_at=? WHERE id=?').run('2026-10-11',company);
      fixture.sqlite.prepare('INSERT INTO installer_credit_accounts(company_id) VALUES(?)').run(company);
      fixture.sqlite.prepare("INSERT INTO installer_payment_orders(id,company_id,package_id,credits,amount_minor,currency,status,provider,provider_order_id,credited_at,created_at,updated_at) VALUES('purchase',?,'credits-20',20,300000,'thb','paid','omise','chrg_purchase','now','now','now')").run(company);
      fixture.sqlite.prepare("INSERT INTO installer_credit_ledger(id,company_id,kind,available_delta,source_id,idempotency_key,reason,actor,created_at) VALUES('purchase-entry',?,'purchase',20,'purchase','payment:purchase','DO-NOT-EXPORT-SYNTHETIC-NOTE','fixture','now')").run(company);
      const account=fixture.sqlite.prepare('SELECT * FROM installer_credit_accounts').all(),ledger=fixture.sqlite.prepare('SELECT * FROM installer_credit_ledger').all();
      const result=await getShutdownLiabilityReport(fixture.d1());
      expect(result.companies[0].refundCalculationMinor).toBe(300000);
      expect(fixture.sqlite.prepare('SELECT * FROM installer_credit_accounts').all()).toEqual(account);
      expect(fixture.sqlite.prepare('SELECT * FROM installer_credit_ledger').all()).toEqual(ledger);
      expect(JSON.stringify(result)+shutdownLiabilityCsv(result)).not.toContain('DO-NOT-EXPORT-SYNTHETIC-NOTE');
      expect(network).not.toHaveBeenCalled();
    } finally {fixture.close();}
  });
});
