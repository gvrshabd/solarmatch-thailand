import type { SolarMatchRuntimeEnv } from '@/lib/server/runtime';

/** Presence/mode checks, not proof of provider delivery or approval. No values escape. */
export function phoneCollectionReady(env: SolarMatchRuntimeEnv) {
  if (env.INSTALLER_PLATFORM_MODE === 'local-test') return true; // loopback authorization remains request-scoped
  if (env.OUTBOUND_MESSAGES_ENABLED !== 'true') return false;
  if (!/^AC[0-9a-f]{32}$/iu.test(env.SMS_ACCOUNT_SID ?? '') || !env.SMS_AUTH_TOKEN) return false;
  if (env.INSTALLER_PLATFORM_MODE === 'sandbox') {
    return env.SMS_PROVIDER_MODE === 'sandbox' && env.SMS_CREDENTIALS_ARE_TEST === 'true';
  }
  if (env.INSTALLER_PLATFORM_MODE !== 'production' || env.SMS_PROVIDER_MODE !== 'live'
    || env.SMS_LIVE_ENABLED !== 'true' || env.SMS_CREDENTIALS_ARE_TEST === 'true') return false;
  return env.SMS_MESSAGING_SERVICE_SID
    ? /^MG[0-9a-f]{32}$/iu.test(env.SMS_MESSAGING_SERVICE_SID)
    : /^\+[1-9]\d{7,14}$/u.test(env.SMS_FROM ?? '') || /^[A-Za-z0-9 ]{1,11}$/u.test(env.SMS_FROM ?? '');
}

export function authEmailReady(env: SolarMatchRuntimeEnv) {
  if(env.INSTALLER_PLATFORM_MODE==='local-test')return true;
  if(env.OUTBOUND_MESSAGES_ENABLED!=='true'||!env.AUTH_EMAIL_PROVIDER_TOKEN
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(env.AUTH_EMAIL_FROM??''))return false;
  return (env.INSTALLER_PLATFORM_MODE==='sandbox'&&env.AUTH_EMAIL_PROVIDER_MODE==='sandbox')
    || (env.INSTALLER_PLATFORM_MODE==='production'&&env.AUTH_EMAIL_PROVIDER_MODE==='live'&&env.AUTH_EMAIL_LIVE_ENABLED==='true');
}
export function installerRegistrationReady(env:SolarMatchRuntimeEnv) {
  return authEmailReady(env)&&(env.INSTALLER_PLATFORM_MODE==='local-test'||env.INSTALLER_REGISTRATION_ENABLED==='true');
}

