import { ProviderError, base64, constantEqual, hmac, parseObject, requireMode, requestJson, safeUrl, type ProviderMode } from './common';
export interface LineConfig { mode: ProviderMode; channelSecret?: string; accessToken?: string; outboundEnabled?: boolean; liveEnabled?: boolean; linkedRecipient?: boolean; sandboxRecipients?: string[]; fetch?: typeof fetch }
export interface LineEvent { type: string; webhookEventId: string; timestamp: number; source: { type: string; userId?: string }; link?: { result: 'ok' | 'failed'; nonce: string }; deliveryContext?: { isRedelivery: boolean } }
export async function verifyLineWebhook(raw: string, headers: Headers, config: LineConfig): Promise<LineEvent[]> {
  requireMode(config.mode);
  if (!config.channelSecret) throw new ProviderError('missing_line_secret');
  if (raw.length > 1000000) throw new ProviderError('payload_too_large');
  const signature = headers.get('x-line-signature') ?? '';
  const expected = base64(await hmac(new TextEncoder().encode(config.channelSecret), raw));
  if (!constantEqual(signature, expected)) throw new ProviderError('invalid_line_signature');
  const body = parseObject(raw);
  if (!Array.isArray(body.events)) throw new ProviderError('invalid_line_events');
  for (const event of body.events) {
    if (!event || typeof event.type !== 'string' || typeof event.webhookEventId !== 'string' || typeof event.timestamp !== 'number' || !event.source) throw new ProviderError('invalid_line_event');
  }
  // Caller inserts webhookEventId under UNIQUE constraint before account linking.
  return body.events as LineEvent[];
}
function userId(value: string) { if (!/^U[0-9a-f]{32}$/i.test(value)) throw new ProviderError('invalid_line_user'); }
function outbound(config: LineConfig, to: string) {
  requireMode(config.mode); userId(to);
  if (!config.outboundEnabled || (config.mode === 'live' && !config.liveEnabled) || (config.mode === 'sandbox' && !config.sandboxRecipients?.includes(to))) throw new ProviderError('outbound_disabled');
  if (!config.accessToken) throw new ProviderError('missing_line_token');
}
export async function requestLinkToken(to: string, config: LineConfig) {
  requireMode(config.mode); userId(to);
  if (config.mode === 'local-test') return { linkToken: `local_${crypto.randomUUID()}`, expiresInSeconds: 600 };
  outbound(config, to);
  const result = await requestJson(`https://api.line.me/v2/bot/user/${to}/linkToken`, { method: 'POST', headers: { Authorization: `Bearer ${config.accessToken}` } }, config.fetch);
  if (typeof result.linkToken !== 'string') throw new ProviderError('invalid_provider_response');
  return { linkToken: result.linkToken, expiresInSeconds: 600 };
}
export function lineAccountLinkUrl(linkToken: string, nonce: string) {
  if (!linkToken || nonce.length < 16 || nonce.length > 255) throw new ProviderError('invalid_link_nonce');
  return `https://access.line.me/dialog/bot/accountLink?${new URLSearchParams({ linkToken, nonce })}`;
}
export interface EnquiryNotification { to: string; reference: string; product: 'shared_residential' | 'exclusive_residential'; credits: number; trial: boolean; enquiryUrl: string; retryKey: string; language?: 'th' | 'en' }
export function enquiryNotificationText(input: EnquiryNotification) {
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(input.reference) || !Number.isSafeInteger(input.credits) || input.credits < 0) throw new ProviderError('invalid_notification');
  const url = safeUrl(input.enquiryUrl, true);
  if (url.search || url.hash) throw new ProviderError('notification_url_must_be_token_free');
  const shared = input.product === 'shared_residential';
  return input.language === 'en' ? `SolarMatch enquiry ${input.reference}\n${shared ? 'Shared residential enquiry' : 'Exclusive residential enquiry'}\n${input.trial ? 'Free trial' : `${input.credits} credits`}\n${url.href}` : `SolarMatch มีคำขอ ${input.reference}\n${shared ? 'คำขอโซลาร์บ้านแบบแชร์' : 'คำขอโซลาร์บ้านแบบเฉพาะราย'}\n${input.trial ? 'สิทธิ์ทดลองฟรี' : `${input.credits} เครดิต`}\n${url.href}`;
}
export async function sendEnquiryNotification(input: EnquiryNotification, config: LineConfig) {
  requireMode(config.mode); userId(input.to);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.retryKey)) throw new ProviderError('invalid_retry_key');
  const captured = { to: input.to, messages: [{ type: 'text', text: enquiryNotificationText(input) }] };
  if (config.mode === 'local-test') return { status: 'captured' as const, providerMessageId: `local_${input.retryKey}`, captured };
  outbound(config, input.to);
  if (config.mode === 'live' && !config.linkedRecipient) throw new ProviderError('line_recipient_not_linked');
  // Keep this UUID fixed on every retry of this outbox record. LINE accepts a
  // duplicate retry key with 409 and X-Line-Accepted-Request-Id.
  try {
    const result = await (config.fetch ?? fetch)('https://api.line.me/v2/bot/message/push', { method: 'POST', headers: { Authorization: `Bearer ${config.accessToken}`, 'Content-Type': 'application/json', 'X-Line-Retry-Key': input.retryKey }, body: JSON.stringify(captured), redirect: 'error', signal: AbortSignal.timeout(15000) });
    const id = result.headers.get('x-line-accepted-request-id') ?? result.headers.get('x-line-request-id');
    if (!(result.ok || (result.status === 409 && result.headers.has('x-line-accepted-request-id')))) throw new ProviderError(`provider_http_${result.status}`);
    return { status: 'accepted' as const, providerMessageId: id ?? input.retryKey };
  } catch (error) { if (error instanceof ProviderError) throw error; throw new ProviderError('provider_unavailable'); }
}
export async function sendAccountLinkInvitation(to: string, invitationUrl: string, retryKey: string, config: LineConfig) {
  requireMode(config.mode); userId(to);
  const url=safeUrl(invitationUrl,config.mode==='local-test');
  const text=`เชื่อมต่อ LINE กับบริษัทของคุณ / Link LINE to your installer company\n${url.href}\nคุณสามารถยกเลิกการเชื่อมต่อได้ในพอร์ทัล / You can unlink in the portal.`;
  const captured={to,messages:[{type:'text',text}]};
  if(config.mode==='local-test')return {status:'captured' as const,providerMessageId:`local_${retryKey}`,captured};
  outbound(config,to);
  try {
    const response=await(config.fetch??fetch)('https://api.line.me/v2/bot/message/push',{method:'POST',headers:{Authorization:`Bearer ${config.accessToken}`,'Content-Type':'application/json','X-Line-Retry-Key':retryKey},body:JSON.stringify(captured),redirect:'error',signal:AbortSignal.timeout(15000)});
    const id=response.headers.get('x-line-accepted-request-id')??response.headers.get('x-line-request-id');
    if(!(response.ok||(response.status===409&&response.headers.has('x-line-accepted-request-id'))))throw new ProviderError(`provider_http_${response.status}`);
    return {status:'accepted' as const,providerMessageId:id??retryKey};
  }catch(error){if(error instanceof ProviderError)throw error;throw new ProviderError('provider_unavailable');}
}
