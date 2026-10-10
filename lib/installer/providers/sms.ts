import { ProviderError, requireMode, requestJson, type ProviderMode } from './common';
export interface SmsConfig { mode: ProviderMode; outboundEnabled?: boolean; accountSid?: string; authToken?: string; credentialsAreTest?: boolean; fetch?: typeof fetch }
export interface SmsMessage { to: string; body: string; idempotencyKey: string }
export async function sendMessage(message: SmsMessage, config: SmsConfig) {
  requireMode(config.mode);
  if (!/^\+[1-9]\d{7,14}$/.test(message.to) || !message.body || message.body.length > 1600 || !message.idempotencyKey) throw new ProviderError('invalid_message');
  if (config.mode === 'local-test') return { providerMessageId: `local_${message.idempotencyKey}`, status: 'captured' as const, captured: { ...message } };
  if (!config.outboundEnabled || !config.credentialsAreTest) throw new ProviderError('outbound_disabled');
  if (!/^AC[0-9a-fA-F]{32}$/.test(config.accountSid ?? '') || !config.authToken) throw new ProviderError('missing_sms_test_credentials');
  // Twilio Messages does not promise application-level idempotency. The durable
  // outbox must prevent concurrent attempts and reconcile ambiguous timeouts.
  const result = await requestJson(`https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`, {
    method: 'POST', headers: { Authorization: `Basic ${btoa(`${config.accountSid}:${config.authToken}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: message.to, From: '+15005550006', Body: message.body }).toString(),
  }, config.fetch);
  if (typeof result.sid !== 'string') throw new ProviderError('invalid_provider_response');
  return { providerMessageId: result.sid, status: 'accepted' as const };
}
