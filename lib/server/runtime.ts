import { env as cloudflareEnv } from 'cloudflare:workers';

export type SolarMatchRuntimeEnv = {
  DB?: D1Database;
  MEDIA?: R2Bucket;
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  PRIVATE_SITE_ACCESS_AUD?: string;
  ADMIN_EMAILS?: string;
  CSRF_SECRET?: string;
  ASSESSMENT_SIGNING_SECRET?: string;
  INSTALLER_PLATFORM_MODE?: string;
  INSTALLER_TEST_CLOCK_ENABLED?: string;
  INSTALLER_AUTH_SECRET?: string;
  INSTALLER_BASE_URL?: string;
  PHONE_VERIFICATION_SECRET?: string;
  OUTBOUND_MESSAGES_ENABLED?: string;
  INSTALLER_SCHEDULER_EXPECTED?: string;
  CAMPAIGN_ATTRIBUTION_ENABLED?: string;
  CAMPAIGN_ATTRIBUTION_PRIVACY_REVIEWED?: string;
  AUTH_EMAIL_FROM?: string;
  AUTH_EMAIL_PROVIDER_TOKEN?: string;
  AUTH_EMAIL_PROVIDER_MODE?: string;
  AUTH_EMAIL_LIVE_ENABLED?: string;
  SMS_ACCOUNT_SID?: string;
  SMS_AUTH_TOKEN?: string;
  SMS_CREDENTIALS_ARE_TEST?: string;
  SMS_PROVIDER_MODE?: string;
  SMS_LIVE_ENABLED?: string;
  SMS_FROM?: string;
  SMS_MESSAGING_SERVICE_SID?: string;
  OMISE_PUBLIC_KEY?: string;
  OMISE_SECRET_KEY?: string;
  OMISE_WEBHOOK_SECRET?: string;
  OMISE_PROVIDER_MODE?: string;
  OMISE_LIVE_ENABLED?: string;
  LINE_CHANNEL_SECRET?: string;
  LINE_CHANNEL_ACCESS_TOKEN?: string;
  LINE_TEST_RECIPIENTS?: string;
  LINE_PROVIDER_MODE?: string;
  LINE_LIVE_ENABLED?: string;
  LOCAL_ADMIN_PASSWORD?: string;
  LOCAL_ADMIN_SESSION_SECRET?: string;
};

export function getRuntimeEnv() {
  return cloudflareEnv as unknown as SolarMatchRuntimeEnv;
}

export function requireDatabase() {
  const database = getRuntimeEnv().DB;
  if (!database) throw new Error('The SolarMatch D1 binding is unavailable.');
  return database;
}
