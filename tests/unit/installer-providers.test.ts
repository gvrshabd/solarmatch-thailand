import { describe, expect, it, vi } from 'vitest';
import { base64, hmac } from '../../lib/installer/providers/common';
import { confirmPayment, createCharge, createHostedOrder, normalizePayment, verifyPaymentEvent } from '../../lib/installer/providers/payment';
import { enquiryNotificationText, sendEnquiryNotification, verifyLineWebhook } from '../../lib/installer/providers/line';
import { sendMessage } from '../../lib/installer/providers/sms';

const order = { orderId: 'order_fixture', amountMinor: 400000, currency: 'thb' as const, description: '20 credits', returnUrl: 'https://example.test/installers/purchases' };
const charge = { id: 'chrg_test_fixture', object: 'charge', livemode: false, amount: 400000, currency: 'THB', paid: true, capture: true, status: 'successful', refunded_amount: 0, metadata: { solarmatch_order_id: order.orderId }, transaction: 'trxn_test_fixture' };
const expected = { ...order, providerOrderId: charge.id };
const config = { mode: 'sandbox' as const, sandboxEnabled: true, secretKey: 'skey_test_fixture', publicKey: 'pkey_test_fixture', activatedMethods: ['promptpay'] as const };
function json(value: unknown) { return new Response(JSON.stringify(value), { status: 200 }); }
describe('installer provider boundaries', () => {
  it('does not fall back to network or live keys when disabled/misconfigured', async () => {
    const transport = vi.fn();
    await expect(createHostedOrder(order, { mode: 'off', fetch: transport })).rejects.toThrow('provider_disabled');
    await expect(createHostedOrder(order, { ...config, activatedMethods: ['promptpay'], secretKey: 'skey_live_anything', fetch: transport })).rejects.toThrow('missing_test_payment_key');
    expect(transport).not.toHaveBeenCalled();
  });
  it('confirms authoritative charge and rejects a foreign order or wrong amount', async () => {
    const transport = vi.fn(async () => json(charge));
    expect((await confirmPayment(expected, charge.id, { ...config, activatedMethods: ['promptpay'], fetch: transport })).status).toBe('paid');
    expect(() => normalizePayment({ ...charge, amount: 1 }, expected, 'omise')).toThrow('payment_order_mismatch');
    expect(() => normalizePayment({ ...charge, metadata: { solarmatch_order_id: 'other' } }, expected, 'omise')).toThrow('payment_order_mismatch');
    expect(normalizePayment({ ...charge, capture: false }, expected, 'omise').status).toBe('pending');
    expect(normalizePayment({ ...charge, reversed: true }, expected, 'omise').status).toBe('reversed');
  });
  it('uses authenticated event retrieval, ignoring forged embedded charge data', async () => {
    const authoritative = { id: 'evnt_test_fixture', livemode: false, key: 'charge.complete', data: charge };
    const transport = vi.fn(async () => json(authoritative));
    const event = await verifyPaymentEvent(JSON.stringify({ ...authoritative, data: { ...charge, id: 'chrg_test_forged', amount: 1 } }), new Headers(), { ...config, activatedMethods: ['promptpay'], fetch: transport });
    expect(event.chargeId).toBe(charge.id);
    await expect(verifyPaymentEvent(JSON.stringify({ id: 'evnt_live_fake' }), new Headers(), { ...config, activatedMethods: ['promptpay'], fetch: transport })).rejects.toThrow('invalid_test_resource');
  });
  it('checks exact Omise raw body timestamp signature and rejects replay/tampering', async () => {
    const secret = base64(new TextEncoder().encode('fixture-signing-secret'));
    const raw = JSON.stringify({ id: 'evnt_test_fixture', livemode: false, key: 'charge.complete', data: { ...charge, id: 'localcharge_test_fixture' } });
    const timestamp = '1800000000';
    const digest = await hmac(new TextEncoder().encode('fixture-signing-secret'), `${timestamp}.${raw}`);
    const signature = Array.from(digest, byte => byte.toString(16).padStart(2,'0')).join('');
    const headers = new Headers({ 'Omise-Signature': signature, 'Omise-Signature-Timestamp': timestamp });
    const local = { mode: 'local-test' as const, localEventSecret: secret, now: () => 1800000000000 };
    expect((await verifyPaymentEvent(raw, headers, local)).eventId).toBe('evnt_test_fixture');
    await expect(verifyPaymentEvent(`${raw} `, headers, local)).rejects.toThrow('invalid_payment_signature');
    await expect(verifyPaymentEvent(raw, headers, { ...local, now: () => 1800000600000 })).rejects.toThrow('invalid_payment_signature');
  });
  it('creates only configured source methods for the persisted price', async () => {
    const transport = vi.fn(async (url: string | URL | Request) => String(url).includes('/sources/') ? json({ livemode: false, type: 'promptpay', amount: 1, currency: 'THB' }) : json(charge));
    await expect(createCharge(order, 'src_test_fixture', { ...config, activatedMethods: ['promptpay'], fetch: transport })).rejects.toThrow('payment_source_mismatch');
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it('posts immutable order metadata and price after authenticated source verification',async()=>{
    const transport=vi.fn(async(url:string|URL|Request,init?:RequestInit)=>{
      if(String(url).includes('/sources/'))return json({livemode:false,type:'promptpay',amount:order.amountMinor,currency:'THB'});
      const submitted=new URLSearchParams(String(init?.body));expect(submitted.get('amount')).toBe('400000');expect(submitted.get('metadata[solarmatch_order_id]')).toBe(order.orderId);expect(submitted.get('source')).toBe('src_test_fixture');expect(submitted.has('card[number]')).toBe(false);
      return json({...charge,status:'pending',paid:false,authorize_uri:'https://api.omise.co/payments/paym_test_fixture/authorize'});
    });
    const result=await createCharge(order,'src_test_fixture',{...config,activatedMethods:['promptpay'],fetch:transport});expect(result.payment.status).toBe('pending');expect(result.authorizationUrl).toContain('https://api.omise.co/');expect(transport).toHaveBeenCalledTimes(2);
  });
  it('rejects a token brand not declared active before any charge creation',async()=>{
    const transport=vi.fn(async(url:string|URL|Request)=>{expect(String(url)).toBe('https://vault.omise.co/tokens/tokn_test_fixture');return json({livemode:false,card:{brand:'JCB'}});});
    await expect(createCharge(order,'tokn_test_fixture',{...config,activatedMethods:['credit_card'],activatedCardBrands:['Visa','MasterCard'],fetch:transport})).rejects.toThrow('card_brand_unavailable');expect(transport).toHaveBeenCalledTimes(1);
  });
  it('verifies LINE HMAC over unmodified body before exposing events', async () => {
    const raw = JSON.stringify({ events: [{ type: 'accountLink', webhookEventId: 'event-one', timestamp: 1, source: { type: 'user', userId: `U${'a'.repeat(32)}` }, link: { result: 'ok', nonce: 'random-fixture-nonce' } }] });
    const secret = 'fixture-line-secret';
    const headers = new Headers({ 'x-line-signature': base64(await hmac(new TextEncoder().encode(secret), raw)) });
    expect((await verifyLineWebhook(raw, headers, { mode: 'local-test', channelSecret: secret }))[0].webhookEventId).toBe('event-one');
    await expect(verifyLineWebhook(raw + ' ', headers, { mode: 'local-test', channelSecret: secret })).rejects.toThrow('invalid_line_signature');
  });
  it('captures local messages without sending; sandbox requires explicit gates', async () => {
    const transport = vi.fn();
    const message = { to: '+66800000000', body: 'Fixture OTP only', idempotencyKey: 'one' };
    expect((await sendMessage(message, { mode: 'local-test', fetch: transport })).captured).toEqual(message);
    await expect(sendMessage(message, { mode: 'sandbox', fetch: transport })).rejects.toThrow('outbound_disabled');
    const notification = { to: `U${'a'.repeat(32)}`, reference: 'SM-1', product: 'shared_residential' as const, trial: true, credits: 2, enquiryUrl: 'https://example.test/installers/enquiries/SM-1', retryKey: '00000000-0000-4000-8000-000000000001' };
    expect((await sendEnquiryNotification(notification, { mode: 'local-test', fetch: transport })).status).toBe('captured');
    expect(enquiryNotificationText(notification)).toContain('สิทธิ์ทดลองฟรี');
    await expect(sendEnquiryNotification(notification, { mode: 'sandbox', fetch: transport })).rejects.toThrow('outbound_disabled');
    expect(transport).not.toHaveBeenCalled();
  });
});
