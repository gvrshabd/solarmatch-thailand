import { getRuntimeEnv, requireDatabase } from '@/lib/server/runtime';
import { sendAuthEmail } from './providers/email';

export function isLocalAuthPreview(mode: string | undefined, request?: Request) {
  if (mode !== 'local-test' || !request) return false;
  const url = new URL(request.url);
  return ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
}

/** Contains private recovery URLs: inspect only in an isolated loopback test database. */
export async function queueInstallerAuthEmail(message: { to: string; userId: string; kind: 'verification' | 'password-reset'; url: string }, request?: Request) {
  const env = getRuntimeEnv();
  if (!isLocalAuthPreview(env.INSTALLER_PLATFORM_MODE, request)) {
    // Recovery links stay in memory only. The provider receives them only after
    // deliberate configuration, and no URL or API error body enters logs.
    const mode = env.AUTH_EMAIL_PROVIDER_MODE === 'live' && env.INSTALLER_PLATFORM_MODE === 'production' ? 'live' : env.AUTH_EMAIL_PROVIDER_MODE === 'sandbox' && env.INSTALLER_PLATFORM_MODE === 'sandbox' ? 'sandbox' : 'off';
    await sendAuthEmail(message,{mode,outboundEnabled:env.OUTBOUND_MESSAGES_ENABLED==='true',liveEnabled:env.AUTH_EMAIL_LIVE_ENABLED==='true',token:env.AUTH_EMAIL_PROVIDER_TOKEN,from:env.AUTH_EMAIL_FROM,baseUrl:env.INSTALLER_BASE_URL});
    return;
  }
  await requireDatabase().prepare('INSERT INTO installer_test_messages (id, channel, recipient, body, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), 'email', message.to, JSON.stringify({ kind: message.kind, url: message.url, userId: message.userId }), new Date().toISOString()).run();
}
