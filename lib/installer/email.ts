import { getRuntimeEnv, requireDatabase } from '@/lib/server/runtime';

export function isLocalAuthPreview(mode: string | undefined, request?: Request) {
  if (mode !== 'local-test' || !request) return false;
  const url = new URL(request.url);
  return ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
}

/** Contains private recovery URLs: inspect only in an isolated loopback test database. */
export async function queueInstallerAuthEmail(message: { to: string; userId: string; kind: 'verification' | 'password-reset'; url: string }, request?: Request) {
  const env = getRuntimeEnv() as ReturnType<typeof getRuntimeEnv> & { AUTH_EMAIL_FROM?: string; AUTH_EMAIL_PROVIDER_TOKEN?: string; OUTBOUND_MESSAGES_ENABLED?: string };
  if (!isLocalAuthPreview(env.INSTALLER_PLATFORM_MODE, request)) {
    // Never persist recoverable reset links in a general-purpose delivery outbox.
    if (env.INSTALLER_PLATFORM_MODE !== 'sandbox' || env.OUTBOUND_MESSAGES_ENABLED !== 'true' || !env.AUTH_EMAIL_PROVIDER_TOKEN || !env.AUTH_EMAIL_FROM) throw new Error('Installer authentication email delivery is not configured.');
    const purpose = message.kind === 'verification' ? 'ยืนยันอีเมล / Verify your email' : 'ตั้งรหัสผ่านใหม่ / Reset your password';
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: 'Bearer ' + env.AUTH_EMAIL_PROVIDER_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.AUTH_EMAIL_FROM, to: [message.to], subject: 'SolarMatch — ' + purpose, text: purpose + '\n\n' + message.url + '\n\nหากคุณไม่ได้ร้องขอ สามารถละเว้นอีเมลนี้ได้ / If you did not request this, ignore this email.' }),
    });
    if (!response.ok) throw new Error('Installer authentication email delivery failed.');
    return;
  }
  await requireDatabase().prepare('INSERT INTO installer_test_messages (id, channel, recipient, body, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), 'email', message.to, JSON.stringify({ kind: message.kind, url: message.url, userId: message.userId }), new Date().toISOString()).run();
}
