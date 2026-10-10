import { ProviderError, requireMode, requestJson, type ProviderMode } from './common';
export interface SmsConfig { mode: ProviderMode; outboundEnabled?: boolean; liveEnabled?: boolean; accountSid?: string; authToken?: string; credentialsAreTest?: boolean; from?: string; messagingServiceSid?: string; fetch?: typeof fetch }
export interface SmsMessage { to: string; body: string; idempotencyKey: string }
export async function sendMessage(message: SmsMessage, config: SmsConfig) {
  requireMode(config.mode);
  if (!/^\+[1-9]\d{7,14}$/.test(message.to) || !message.body || message.body.length > 1600 || !message.idempotencyKey) throw new ProviderError('invalid_message');
  if (config.mode === 'local-test') return { providerMessageId: `local_${message.idempotencyKey}`, status: 'captured' as const, captured: { ...message } };
  if (!config.outboundEnabled || (config.mode === 'live' && !config.liveEnabled)) throw new ProviderError('outbound_disabled');
  if (config.mode === 'sandbox' && !config.credentialsAreTest) throw new ProviderError('missing_sms_test_credentials');
  if (config.mode === 'live' && config.credentialsAreTest !== false) throw new ProviderError('sms_credential_mode_mismatch');
  if (!/^AC[0-9a-fA-F]{32}$/.test(config.accountSid ?? '') || !config.authToken) throw new ProviderError('missing_sms_credentials');
  const sender = new URLSearchParams({ To: message.to, Body: message.body });
  if (config.mode === 'sandbox') sender.set('From', '+15005550006');
  else if (config.messagingServiceSid) sender.set('MessagingServiceSid', config.messagingServiceSid);
  else sender.set('From', config.from ?? '');
  if (config.mode === 'live' && !(config.messagingServiceSid ? /^MG[0-9a-fA-F]{32}$/.test(config.messagingServiceSid) : /^\+[1-9]\d{7,14}$/.test(config.from ?? '') || /^[A-Za-z0-9 ]{1,11}$/.test(config.from ?? ''))) throw new ProviderError('missing_sms_sender');
  // Twilio Messages does not promise application-level idempotency. The durable
  // outbox must prevent concurrent attempts and reconcile ambiguous timeouts.
  const result = await requestJson(`https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`, {
    method: 'POST', headers: { Authorization: `Basic ${btoa(`${config.accountSid}:${config.authToken}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: sender.toString(),
  }, config.fetch);
  if (typeof result.sid !== 'string' || !/^SM[0-9a-fA-F]{32}$/.test(result.sid) || result.to !== message.to || ['failed','undelivered','canceled'].includes(String(result.status))) throw new ProviderError('invalid_provider_response');
  return { providerMessageId: result.sid, status: 'accepted' as const };
}
