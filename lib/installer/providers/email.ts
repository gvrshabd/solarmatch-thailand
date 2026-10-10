import { ProviderError, parseObject, safeUrl } from './common';

export interface AuthEmailConfig {
  mode: 'off' | 'sandbox' | 'live';
  outboundEnabled?: boolean;
  liveEnabled?: boolean;
  token?: string;
  from?: string;
  baseUrl?: string;
  fetch?: typeof fetch;
}
export interface AuthEmailMessage { to: string; kind: 'verification' | 'password-reset'; url: string }

export async function sendAuthEmail(message: AuthEmailMessage, config: AuthEmailConfig) {
  if (config.mode === 'off' || !config.outboundEnabled || (config.mode === 'live' && !config.liveEnabled)) throw new ProviderError('auth_email_disabled');
  if (!config.token || !config.from || !config.baseUrl) throw new ProviderError('auth_email_unconfigured');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(message.to) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.from)) throw new ProviderError('invalid_email_address');
  const base = safeUrl(config.baseUrl);
  const destination = safeUrl(message.url);
  if (destination.origin !== base.origin) throw new ProviderError('invalid_auth_email_link');
  const purpose = message.kind === 'verification' ? 'ยืนยันอีเมล / Verify your email' : 'ตั้งรหัสผ่านใหม่ / Reset your password';
  const payload = { from: config.from, to: [message.to], subject: `SolarMatch — ${purpose}`, text: `${purpose}\n\n${message.url}\n\nหากคุณไม่ได้ร้องขอ สามารถละเว้นอีเมลนี้ได้ / If you did not request this, ignore this email.` };
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${message.kind}:${message.url}`));
  const key = `auth-${Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2,'0')).join('')}`;
  try {
    const response = await (config.fetch ?? fetch)('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify(payload), redirect: 'error', signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new ProviderError(`auth_email_http_${response.status}`);
    const result = parseObject(await response.text());
    if (typeof result.id !== 'string' || !result.id) throw new ProviderError('invalid_auth_email_response');
    return { providerMessageId: result.id };
  } catch (error) { if (error instanceof ProviderError) throw error; throw new ProviderError('auth_email_unavailable'); }
}
