import { env as cloudflareEnv } from 'cloudflare:workers';

export type SolarMatchRuntimeEnv = {
  DB?: D1Database;
  MEDIA?: R2Bucket;
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  ADMIN_EMAILS?: string;
  CSRF_SECRET?: string;
  ASSESSMENT_SIGNING_SECRET?: string;
};

export function getRuntimeEnv() {
  return cloudflareEnv as unknown as SolarMatchRuntimeEnv;
}

export function requireDatabase() {
  const database = getRuntimeEnv().DB;
  if (!database) throw new Error('The SolarMatch D1 binding is unavailable.');
  return database;
}
