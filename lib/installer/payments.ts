import { getRuntimeEnv } from '@/lib/server/runtime';
import { assertPlatformRequest } from './platform';
import { getPlatformSettings } from './settings';
import { ProviderError } from './providers/common';
import { confirmPayment, createCharge, createHostedOrder, type PaymentConfig, type PaymentOrder, type ProviderPayment } from './providers/payment';

export interface StoredPaymentOrder { id: string; company_id: string; package_id: string; credits: number; amount_minor: number; currency: 'thb'; status: string; provider: string; provider_order_id: string | null; receipt_reference: string | null; refunded_minor: number; reversed_credits: number; credited_at: string | null; last_reconciliation_at: string | null; reconciliation_error_code: string | null; created_at: string; updated_at: string }
export async function paymentConfig(db: D1Database, request: Request): Promise<PaymentConfig> {
  const { mode } = assertPlatformRequest(request); const env = getRuntimeEnv(); const settings = await getPlatformSettings(db);
  const providerMode = mode === 'local-test' ? 'local-test' : env.OMISE_PROVIDER_MODE === 'live' && mode === 'production' ? 'live' : env.OMISE_PROVIDER_MODE === 'sandbox' && mode === 'sandbox' ? 'sandbox' : 'off';
  return { mode: providerMode, sandboxEnabled: settings.paymentsEnabled, liveEnabled: settings.paymentsEnabled && env.OMISE_LIVE_ENABLED === 'true', secretKey: env.OMISE_SECRET_KEY, publicKey: env.OMISE_PUBLIC_KEY, webhookSecret: env.OMISE_WEBHOOK_SECRET, activatedMethods: settings.paymentMethods, activatedCardBrands: settings.paymentCardBrands, localEventSecret: env.OMISE_WEBHOOK_SECRET };
}
async function orderFor(db: D1Database, companyId: string | null, orderId: string) {
  const row = await db.prepare(`SELECT * FROM installer_payment_orders WHERE id=? ${companyId ? 'AND company_id=?' : ''}`).bind(...(companyId ? [orderId,companyId] : [orderId])).first<StoredPaymentOrder>();
  if (!row) throw new Error('payment_order_not_found'); return row;
}
function providerOrder(row: StoredPaymentOrder, request: Request): PaymentOrder {
  return { orderId: row.id, amountMinor: row.amount_minor, currency: row.currency, description: `SolarMatch ${row.credits} credits`, returnUrl: new URL('/installers/purchases', request.url).href };
}
export async function createOrder(db: D1Database, companyId: string, request: Request) {
  const config = await paymentConfig(db,request); const settings = await getPlatformSettings(db);
  if (!settings.paymentsEnabled || settings.platformPaused) throw new Error('payments_disabled');
  const approved = await db.prepare("SELECT id FROM solar_company_partners WHERE id=? AND approval_status='approved'").bind(companyId).first();
  if (!approved) throw new Error('company_not_approved');
  const id=crypto.randomUUID(), now=new Date().toISOString();
  const row: StoredPaymentOrder = { id, company_id: companyId, package_id: 'credits-20', credits: settings.packageCredits, amount_minor: settings.packageAmountMinor, currency: 'thb', status: 'pending', provider: config.mode === 'local-test' ? 'local-test' : 'omise', provider_order_id:null, receipt_reference:null, refunded_minor:0, reversed_credits:0, credited_at:null,last_reconciliation_at:null,reconciliation_error_code:null,created_at:now,updated_at:now };
  const checkout = await createHostedOrder(providerOrder(row,request),config);
  await db.prepare('INSERT INTO installer_payment_orders (id,company_id,package_id,credits,amount_minor,currency,status,provider,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(id,companyId,row.package_id,row.credits,row.amount_minor,'thb','pending',row.provider,now,now).run();
  return { orderId:id, order:row, checkout:checkout.checkout, methods:checkout.methods, provider:checkout.provider };
}
export async function authorizeOrder(db:D1Database,companyId:string,orderId:string,tokenOrSourceId:string,request:Request) {
  const row=await orderFor(db,companyId,orderId); const config=await paymentConfig(db,request);
  if((await getPlatformSettings(db)).platformPaused)throw new Error('payments_disabled');
  if(!['sandbox','live'].includes(config.mode)||row.provider!=='omise')throw new Error('provider_payment_required');
  const now=new Date().toISOString(), nonce=crypto.randomUUID();
  const lock=await db.prepare("UPDATE installer_payment_orders SET status='authorizing', authorization_nonce=?,updated_at=? WHERE id=? AND company_id=? AND status='pending' AND provider_order_id IS NULL").bind(nonce,now,orderId,companyId).run();
  if(lock.meta.changes!==1)throw new Error('payment_attempt_already_started');
  try {
    const result=await createCharge(providerOrder(row,request),tokenOrSourceId,config);
    await db.prepare("UPDATE installer_payment_orders SET provider_order_id=?,updated_at=? WHERE id=? AND authorization_nonce=? AND status IN ('authorizing','reconciliation-required')").bind(result.payment.chargeId,new Date().toISOString(),orderId,nonce).run();
    await applyConfirmedPayment(db,await orderFor(db,companyId,orderId),result.payment);
    return { orderId,authorizationUrl:result.authorizationUrl,qrImageUrl:result.qrImageUrl,payment:result.payment };
  } catch(error) {
    // An ambiguous charge-creation timeout never authorizes automatic re-creation.
    await db.prepare("UPDATE installer_payment_orders SET status='reconciliation-required',updated_at=? WHERE id=? AND authorization_nonce=? AND status='authorizing'").bind(new Date().toISOString(),orderId,nonce).run();
    throw error;
  }
}
export function reversedCreditTarget(order: Pick<StoredPaymentOrder,'credits'|'amount_minor'>,payment:ProviderPayment) {
  if(payment.status==='reversed')return order.credits;
  // Integer units: a partial refund removes the proportional credits rounded up.
  return Math.min(order.credits, Math.ceil(payment.refundedMinor * order.credits / order.amount_minor));
}
export async function applyConfirmedPayment(db:D1Database,row:StoredPaymentOrder,payment:ProviderPayment,eventId?:string) {
  if(payment.provider!==row.provider||row.package_id!=='credits-20'||payment.providerOrderId!==row.provider_order_id||payment.chargeId!==row.provider_order_id||payment.amountMinor!==row.amount_minor||payment.currency!==row.currency||!Number.isSafeInteger(payment.refundedMinor)||payment.refundedMinor<0||payment.refundedMinor>row.amount_minor)throw new Error('payment_order_mismatch');
  const now=new Date().toISOString(); const statements:D1PreparedStatement[]=[];
  if(eventId)statements.push(db.prepare('INSERT OR IGNORE INTO installer_payment_events (id,order_id,provider_event_id,status,created_at) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(),row.id,eventId,payment.status,now));
  if(payment.status==='paid') {
    statements.push(db.prepare(`INSERT OR IGNORE INTO installer_credit_ledger (id,company_id,kind,available_delta,reserved_delta,trial_delta,debt_delta,source_id,idempotency_key,reason,actor,created_at)
      SELECT ?,o.company_id,'purchase',MAX(0,o.credits-a.debt),0,0,-MIN(o.credits,a.debt),o.id,?,'Confirmed provider payment','payment-provider',?
      FROM installer_payment_orders o JOIN installer_credit_accounts a ON a.company_id=o.company_id
      WHERE o.id=? AND o.credited_at IS NULL AND o.status NOT IN ('reversed','refunded') AND o.reversed_credits=0`).bind(crypto.randomUUID(),`payment:${row.id}`,now,row.id));
    statements.push(db.prepare(`UPDATE installer_payment_orders SET credited_at=COALESCE(credited_at,?), status='paid',receipt_reference=?,updated_at=? WHERE id=? AND status NOT IN ('reversed','refunded') AND EXISTS(SELECT 1 FROM installer_credit_ledger WHERE idempotency_key=?)`).bind(now,payment.receiptReference,now,row.id,`payment:${row.id}`));
  } else if(payment.status!=='reversed') statements.push(db.prepare("UPDATE installer_payment_orders SET status=?,updated_at=? WHERE id=? AND credited_at IS NULL AND status NOT IN ('reversed','refunded','paid')").bind(payment.status,now,row.id));
  const target=reversedCreditTarget(row,payment);
  if(target>0) {
    statements.push(db.prepare(`INSERT OR IGNORE INTO installer_credit_ledger (id,company_id,kind,available_delta,reserved_delta,trial_delta,debt_delta,source_id,idempotency_key,reason,actor,created_at)
      SELECT ?,o.company_id,'payment-reversal',-MIN(a.available,?-o.reversed_credits),0,0,MAX(0,?-o.reversed_credits-a.available),o.id,?,'Provider refund/reversal reconciliation','payment-provider',?
      FROM installer_payment_orders o JOIN installer_credit_accounts a ON a.company_id=o.company_id
      WHERE o.id=? AND o.credited_at IS NOT NULL AND o.reversed_credits<?`).bind(crypto.randomUUID(),target,target,`reversal:${row.id}:${target}`,now,row.id,target));
    statements.push(db.prepare(`UPDATE installer_payment_orders SET reversed_credits=MAX(reversed_credits,?),refunded_minor=MAX(refunded_minor,?),status=CASE WHEN MAX(reversed_credits,?)=credits THEN 'reversed' ELSE 'refunded' END,updated_at=? WHERE id=?`).bind(target,payment.status==='reversed'?row.amount_minor:payment.refundedMinor,target,now,row.id));
  }
  if(statements.length)await db.batch(statements);
  return orderFor(db,null,row.id);
}
export async function reconcileOrder(db:D1Database,companyId:string|null,orderId:string,request:Request) {
  const row=await orderFor(db,companyId,orderId); const config=await paymentConfig(db,request);
  if(row.provider==='local-test')return row;
  if(!row.provider_order_id)throw new Error('payment_attempt_requires_manual_reconciliation');
  const confirmed=await confirmPayment({orderId:row.id,providerOrderId:row.provider_order_id,amountMinor:row.amount_minor,currency:row.currency},row.provider_order_id,config);
  return applyConfirmedPayment(db,row,confirmed);
}
/** Scheduled, bounded provider reads. Never creates a charge or retries an ambiguous authorization. */
export async function reconcilePendingPayments(db:D1Database,request:Request) {
  const config=await paymentConfig(db,request);
  const manual=await db.prepare("SELECT COUNT(*) AS count FROM installer_payment_orders WHERE provider='omise' AND provider_order_id IS NULL AND status IN ('authorizing','reconciliation-required')").first<{count:number}>();
  const summary={scanned:0,reconciled:0,failed:0,failedOrderIds:[] as string[],manualAssociationRequired:Number(manual?.count??0),skipped:null as null|'provider_off'|'provider_unconfigured'};
  if(config.mode!=='sandbox'&&config.mode!=='live'){summary.skipped='provider_off';return summary;}
  const keyPattern=config.mode==='live'?/^skey_live_[A-Za-z0-9]+$/:/^skey_test_[A-Za-z0-9]+$/;
  if(!keyPattern.test(config.secretKey??'')){summary.skipped='provider_unconfigured';return summary;}
  const unsettled=await db.prepare(`SELECT * FROM installer_payment_orders WHERE provider='omise' AND provider_order_id IS NOT NULL
    AND status IN ('pending','authorizing','reconciliation-required','failed','cancelled')
    ORDER BY COALESCE(last_reconciliation_at,created_at),created_at,id LIMIT 20`).all<StoredPaymentOrder>();
  const settled=await db.prepare(`SELECT * FROM installer_payment_orders WHERE provider='omise' AND provider_order_id IS NOT NULL
    AND status IN ('paid','refunded') ORDER BY COALESCE(last_reconciliation_at,created_at),created_at,id LIMIT ?`)
    .bind(30-unsettled.results.length).all<StoredPaymentOrder>();
  const rows=[...unsettled.results,...settled.results];
  summary.scanned=rows.length;
  for(const row of rows){
    const checkedAt=new Date().toISOString();
    try {
      const payment=await confirmPayment({orderId:row.id,providerOrderId:row.provider_order_id!,amountMinor:row.amount_minor,currency:row.currency},row.provider_order_id!,config);
      await applyConfirmedPayment(db,row,payment);
      await db.prepare('UPDATE installer_payment_orders SET last_reconciliation_at=?,reconciliation_error_code=NULL WHERE id=?').bind(checkedAt,row.id).run();
      summary.reconciled++;
    } catch(error) {
      const code=error instanceof ProviderError && /^[a-z0-9_]+$/.test(error.code)?error.code:'reconciliation_failed';
      await db.prepare('UPDATE installer_payment_orders SET last_reconciliation_at=?,reconciliation_error_code=? WHERE id=?').bind(checkedAt,code,row.id).run();
      summary.failed++;summary.failedOrderIds.push(row.id);
    }
  }
  return summary;
}
/** Admin-only recovery for an ambiguous charge creation. The caller must authorize the actor. */
export async function associateProviderCharge(db:D1Database,orderId:string,chargeId:string,request:Request) {
  const row=await orderFor(db,null,orderId),config=await paymentConfig(db,request);
  if(row.provider!=='omise'||row.provider_order_id||!['authorizing','reconciliation-required'].includes(row.status))throw new Error('manual_association_unavailable');
  const payment=await confirmPayment({orderId:row.id,providerOrderId:chargeId,amountMinor:row.amount_minor,currency:row.currency},chargeId,config);
  const linked=await db.prepare("UPDATE installer_payment_orders SET provider_order_id=?,updated_at=? WHERE id=? AND provider_order_id IS NULL AND status IN ('authorizing','reconciliation-required') RETURNING id").bind(chargeId,new Date().toISOString(),orderId).first();
  if(!linked)throw new Error('manual_association_conflict');
  return applyConfirmedPayment(db,{...row,provider_order_id:chargeId},payment);
}
export async function recordLocalPayment(db:D1Database,orderId:string,status:'paid'|'failed'|'cancelled'|'reversed',request:Request) {
  if(assertPlatformRequest(request).mode!=='local-test')throw new Error('local_test_only');
  const row=await orderFor(db,null,orderId); if(row.provider!=='local-test')throw new Error('local_test_only');
  const providerId=`localcharge_test_${orderId.replaceAll('-','')}`;
  await db.prepare('UPDATE installer_payment_orders SET provider_order_id=COALESCE(provider_order_id,?) WHERE id=?').bind(providerId,orderId).run();
  return applyConfirmedPayment(db,{...row,provider_order_id:providerId},{provider:'local-test',chargeId:providerId,providerOrderId:providerId,amountMinor:row.amount_minor,currency:row.currency,status,refundedMinor:status==='reversed'?row.amount_minor:0,receiptReference:`fixture_${orderId}`},`local_${orderId}_${status}`);
}
