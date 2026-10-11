import { ProviderError, constantEqual, hmac, parseObject, requireMode, requestJson, safeUrl, unbase64, type ProviderMode } from './common';
export type PaymentMethod = 'credit_card' | 'promptpay' | 'mobile_banking_bbl' | 'mobile_banking_kbank' | 'mobile_banking_ktb' | 'mobile_banking_bay' | 'mobile_banking_scb' | 'truemoney_jumpapp';
export interface PaymentConfig { mode: ProviderMode; sandboxEnabled?: boolean; liveEnabled?: boolean; secretKey?: string; publicKey?: string; webhookSecret?: string; activatedMethods?: PaymentMethod[]; activatedCardBrands?: ('Visa' | 'MasterCard')[]; fetch?: typeof fetch; now?: () => number; localEventSecret?: string }
export interface PaymentOrder { orderId: string; amountMinor: number; currency: 'thb'; description: string; returnUrl: string; method?: PaymentMethod }
export interface ExpectedPayment { orderId: string; providerOrderId: string; amountMinor: number; currency: 'thb' }
export interface ProviderPayment { provider: 'omise' | 'local-test'; chargeId: string; providerOrderId: string; amountMinor: number; currency: 'thb'; status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'reversed'; refundedMinor: number; receiptReference: string | null }
function configured(config: PaymentConfig, write = false) {
  requireMode(config.mode);
  if (config.mode !== 'sandbox' && config.mode !== 'live') throw new ProviderError('payment_mode_invalid');
  if (write && !(config.mode === 'sandbox' ? config.sandboxEnabled : config.liveEnabled)) throw new ProviderError('payments_disabled');
  const prefix = config.mode === 'sandbox' ? 'skey_test_' : 'skey_live_';
  if (!new RegExp(`^${prefix}[A-Za-z0-9]+$`).test(config.secretKey ?? '')) throw new ProviderError(config.mode === 'sandbox' ? 'missing_test_payment_key' : 'missing_live_payment_key');
}
function omise(path: string, config: PaymentConfig, init: RequestInit = {}, write = false) {
  configured(config, write);
  return requestJson(`https://api.omise.co${path}`, { ...init, headers: { Authorization: `Basic ${btoa(`${config.secretKey}:`)}`, 'Omise-Version': '2019-05-29', 'Content-Type': 'application/x-www-form-urlencoded' } }, config.fetch);
}
/** Merchant configuration, with cards usable only after card-brand approval. */
export function enabledPaymentMethods(config: Pick<PaymentConfig,'activatedMethods'|'activatedCardBrands'>): PaymentMethod[] {
  return [...new Set(config.activatedMethods ?? [])].filter(method => method !== 'credit_card' || !!config.activatedCardBrands?.length);
}
export async function createHostedOrder(order: PaymentOrder, config: PaymentConfig) {
  requireMode(config.mode);
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(order.orderId) || !Number.isSafeInteger(order.amountMinor) || order.amountMinor < 100 || order.currency !== 'thb') throw new ProviderError('invalid_order');
  safeUrl(order.returnUrl, config.mode === 'local-test');
  const methods = enabledPaymentMethods(config);
  if (order.method && !methods.includes(order.method)) throw new ProviderError('payment_method_unavailable');
  if (config.mode === 'local-test') return { providerOrderId: `local_${order.orderId}`, checkout: null, methods: [] as PaymentMethod[], provider: 'local-test' as const };
  configured(config, true);
  const publicPrefix = config.mode === 'sandbox' ? 'pkey_test_' : 'pkey_live_';
  if (!new RegExp(`^${publicPrefix}[A-Za-z0-9]+$`).test(config.publicKey ?? '')) throw new ProviderError('missing_payment_public_key');
  if (!methods.length) throw new ProviderError('payment_methods_unconfigured');
  const selected = order.method ?? methods[0];
  return { providerOrderId: order.orderId, checkout: { publicKey: config.publicKey!, amount: order.amountMinor, currency: 'THB', defaultPaymentMethod: selected, otherPaymentMethods: methods.filter(method => method !== selected).join(',') }, methods, provider: 'omise' as const };
}
export async function createCharge(order: PaymentOrder, tokenOrSourceId: string, config: PaymentConfig) {
  await createHostedOrder(order, config);
  configured(config, true);
  const isToken = resourceIdPattern('tokn', config.mode).test(tokenOrSourceId);
  if (isToken) {
    if (!config.activatedMethods?.includes('credit_card') || !config.activatedCardBrands?.length) throw new ProviderError('payment_method_unavailable');
    const token = await requestJson(`https://vault.omise.co/tokens/${tokenOrSourceId}`, { headers: { Authorization: `Basic ${btoa(`${config.secretKey}:`)}`, 'Omise-Version': '2019-05-29' } }, config.fetch);
    const brand = (token.card as { brand?: string } | undefined)?.brand;
    if (token.livemode !== (config.mode === 'live') || !config.activatedCardBrands.some(value => value === brand)) throw new ProviderError('card_brand_unavailable');
  } else {
    resourceId(tokenOrSourceId, 'src', config.mode);
    const source = await omise(`/sources/${tokenOrSourceId}`, config);
    if (source.livemode !== (config.mode === 'live') || source.amount !== order.amountMinor || String(source.currency).toLowerCase() !== order.currency || !config.activatedMethods?.includes(source.type as PaymentMethod)) throw new ProviderError('payment_source_mismatch');
  }
  const body = new URLSearchParams({ amount: String(order.amountMinor), currency: order.currency, description: order.description.slice(0,255), return_uri: order.returnUrl, 'metadata[solarmatch_order_id]': order.orderId, [isToken ? 'card' : 'source']: tokenOrSourceId });
  const charge = await omise('/charges', config, { method: 'POST', body: body.toString() }, true);
  const chargeId = resourceId(charge.id, 'chrg', config.mode);
  const payment = normalizePayment(charge, { ...order, providerOrderId: chargeId }, 'omise');
  const authorizationUrl = typeof charge.authorize_uri === 'string' ? safeUrl(charge.authorize_uri).href : null;
  const source = charge.source as { scannable_code?: { image?: { download_uri?: string } } } | undefined;
  const qr = source?.scannable_code?.image?.download_uri;
  return { payment, authorizationUrl, qrImageUrl: qr ? safeUrl(qr).href : null };
}
async function verifySignature(raw: string, headers: Headers, secret: string, now: number) {
  const timestamp = headers.get('omise-signature-timestamp') ?? '';
  const signatures = (headers.get('omise-signature') ?? '').split(',').map(value => value.trim());
  if (!/^\d+$/.test(timestamp) || Math.abs(now / 1000 - Number(timestamp)) > 300) throw new ProviderError('invalid_payment_signature');
  const digest = await hmac(unbase64(secret), `${timestamp}.${raw}`);
  const expected = Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
  if (!signatures.some(value => /^[a-f0-9]{64}$/.test(value) && constantEqual(value, expected))) throw new ProviderError('invalid_payment_signature');
}
export async function verifyPaymentEvent(raw: string, headers: Headers, config: PaymentConfig) {
  requireMode(config.mode);
  if (raw.length > 100000) throw new ProviderError('payload_too_large');
  if (config.mode === 'local-test') {
    if (!config.localEventSecret) throw new ProviderError('missing_local_event_secret');
    await verifySignature(raw, headers, config.localEventSecret, (config.now ?? Date.now)());
  } else if (config.webhookSecret) await verifySignature(raw, headers, config.webhookSecret, (config.now ?? Date.now)());
  const input = parseObject(raw);
  if (config.mode === 'live' && !config.webhookSecret) throw new ProviderError('missing_payment_webhook_secret');
  const event = config.mode === 'local-test' ? input : await omise(`/events/${resourceId(input.id, 'evnt', config.mode)}`, config);
  if (event.id !== input.id || event.livemode !== (config.mode === 'live') || typeof event.key !== 'string') throw new ProviderError('invalid_payment_event');
  const data = event.data as Record<string, unknown>;
  if (!data || !['charge','refund','dispute'].includes(String(data.object))) throw new ProviderError('unsupported_payment_event');
  const chargeId = data.object === 'charge' ? data.id : typeof data.charge === 'string' ? data.charge : (data.charge as {id?:string} | undefined)?.id;
  return { eventId: String(event.id), eventType: event.key, chargeId: resourceId(chargeId, config.mode === 'local-test' ? 'localcharge' : 'chrg', config.mode) };
}
function resourceIdPattern(prefix: string, mode: ProviderMode) { return new RegExp(`^${prefix}${mode === 'live' ? '' : '_test'}_[A-Za-z0-9]+$`); }
function resourceId(value: unknown, prefix: string, mode: ProviderMode) {
  if (typeof value !== 'string' || !resourceIdPattern(prefix, mode).test(value)) throw new ProviderError(mode === 'live' ? 'invalid_live_resource' : 'invalid_test_resource');
  return value;
}
export function normalizePayment(charge: Record<string, unknown>, expected: ExpectedPayment, provider: ProviderPayment['provider']): ProviderPayment {
  const metadata = charge.metadata as Record<string, unknown> | undefined;
  const live = /^chrg_[A-Za-z0-9]+$/.test(expected.providerOrderId);
  if (charge.object !== 'charge' || charge.livemode !== live || charge.id !== expected.providerOrderId || metadata?.solarmatch_order_id !== expected.orderId || charge.amount !== expected.amountMinor || String(charge.currency).toLowerCase() !== expected.currency) throw new ProviderError('payment_order_mismatch');
  const refunded = charge.refunded_amount ?? 0;
  if (!Number.isSafeInteger(refunded) || Number(refunded) < 0 || Number(refunded) > expected.amountMinor) throw new ProviderError('invalid_refund_amount');
  const status = charge.reversed === true ? 'reversed' : charge.status === 'successful' && charge.paid === true && charge.capture === true ? 'paid' : charge.status === 'failed' ? 'failed' : charge.expired === true ? 'cancelled' : 'pending';
  return { provider, chargeId: String(charge.id), providerOrderId: expected.providerOrderId, amountMinor: expected.amountMinor, currency: expected.currency, status, refundedMinor: Number(refunded), receiptReference: typeof charge.transaction === 'string' ? charge.transaction : null };
}
export async function confirmPayment(expected: ExpectedPayment, chargeId: string, config: PaymentConfig): Promise<ProviderPayment> {
  configured(config);
  const charge = await omise(`/charges/${resourceId(chargeId, 'chrg', config.mode)}`, config);
  if (charge.id !== chargeId) throw new ProviderError('payment_order_mismatch');
  return normalizePayment(charge, expected, 'omise');
}
