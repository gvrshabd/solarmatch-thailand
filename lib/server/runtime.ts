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
  INSTALLER_AUTH_SECRET?: string;
  INSTALLER_BASE_URL?: string;
  PHONE_VERIFICATION_SECRET?: string;
  OUTBOUND_MESSAGES_ENABLED?: string;
  AUTH_EMAIL_FROM?: string;
  AUTH_EMAIL_PROVIDER_TOKEN?: string;
  SMS_ACCOUNT_SID?: string;
  SMS_AUTH_TOKEN?: string;
  SMS_CREDENTIALS_ARE_TEST?: string;
  OMISE_PUBLIC_KEY?: string;
  OMISE_SECRET_KEY?: string;
  OMISE_WEBHOOK_SECRET?: string;
  LINE_CHANNEL_SECRET?: string;
  LINE_CHANNEL_ACCESS_TOKEN?: string;
  LINE_TEST_RECIPIENTS?: string;
};

export function getRuntimeEnv() {
  return cloudflareEnv as unknown as SolarMatchRuntimeEnv;
}

export function requireDatabase() {
  const database = getRuntimeEnv().DB;
  if (!database) throw new Error('The SolarMatch D1 binding is unavailable.');
  return database;
}
