import { createRemoteJWKSet, jwtVerify } from 'jose';
import { encodeBase64Url, hmacSha256, constantTimeEqual } from './crypto';
import { getRuntimeEnv } from './runtime';

export const LOCAL_ADMIN_COOKIE = 'solarmatch_local_admin';
const localAdminEmail = 'synthetic-administrator@example.test';
const sessionSeconds = 60 * 60;

function localAdminConfiguration(host: string | null) {
  const env = getRuntimeEnv();
  if (env.INSTALLER_PLATFORM_MODE !== 'local-test' || !env.INSTALLER_BASE_URL || !env.LOCAL_ADMIN_PASSWORD || !env.LOCAL_ADMIN_SESSION_SECRET) return null;
  if (env.LOCAL_ADMIN_PASSWORD.length < 32 || env.LOCAL_ADMIN_SESSION_SECRET.length < 32) return null;
  try {
    const base = new URL(env.INSTALLER_BASE_URL);
    if (base.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(base.hostname) || host !== base.host) return null;
    return { password: env.LOCAL_ADMIN_PASSWORD, secret: env.LOCAL_ADMIN_SESSION_SECRET, origin: base.origin };
  } catch { return null; }
}

export function localAdminAvailable(host: string | null) { return !!localAdminConfiguration(host); }

export async function createLocalAdminSession(host: string | null, password: string) {
  const configuration = localAdminConfiguration(host);
  if (!configuration || !constantTimeEqual(configuration.password, password)) return null;
  const expiry = Math.floor(Date.now() / 1000) + sessionSeconds;
  const nonce = encodeBase64Url(crypto.getRandomValues(new Uint8Array(24)));
  const payload = `v1.${expiry}.${nonce}`;
  const signature = encodeBase64Url(await hmacSha256(payload, configuration.secret));
  return `${payload}.${signature}`;
}

function cookieValue(headers: Headers, name: string) {
  const cookie = headers.get('cookie') ?? '';
  return cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1) ?? null;
}

async function authenticateLocalAdmin(headers: Headers): Promise<AdminIdentity | null> {
  const configuration = localAdminConfiguration(headers.get('host'));
  const token = cookieValue(headers, LOCAL_ADMIN_COOKIE);
  if (!configuration || !token) return null;
  const parts = token.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1' || !/^\d{10}$/u.test(parts[1]) || !/^[A-Za-z0-9_-]{32}$/u.test(parts[2]) || !/^[A-Za-z0-9_-]{43}$/u.test(parts[3])) return null;
  const expiry = Number(parts[1]);
  if (expiry <= Math.floor(Date.now() / 1000) || expiry > Math.floor(Date.now() / 1000) + sessionSeconds) return null;
  const expected = encodeBase64Url(await hmacSha256(parts.slice(0, 3).join('.'), configuration.secret));
  if (!constantTimeEqual(expected, parts[3])) return null;
  return { email: localAdminEmail, subject: 'local-synthetic-administrator', tokenId: parts[2] };
}

export type AdminIdentity = {
  email: string;
  subject: string;
  tokenId: string;
};

function accessConfiguration() {
  const runtime = getRuntimeEnv();
  const teamDomain = runtime.ACCESS_TEAM_DOMAIN?.replace(/\/$/u, '');
  const audience = runtime.ACCESS_AUD;
  const allowedEmails = new Set((runtime.ADMIN_EMAILS ?? '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean));
  if (!teamDomain || !audience || allowedEmails.size === 0) return null;
  return { teamDomain, audience, allowedEmails };
}

export async function authenticateAdmin(headers: Headers): Promise<AdminIdentity | null> {
  const local = await authenticateLocalAdmin(headers);
  if (local) return local;
  const configuration = accessConfiguration();
  const assertion = headers.get('cf-access-jwt-assertion');
  if (!configuration || !assertion) return null;
  try {
    const jwks = createRemoteJWKSet(new URL(`${configuration.teamDomain}/cdn-cgi/access/certs`));
    const issuer = configuration.teamDomain;
    const verified = await jwtVerify(assertion, jwks, { audience: configuration.audience, issuer });
    const email = typeof verified.payload.email === 'string' ? verified.payload.email.toLowerCase() : '';
    if (!configuration.allowedEmails.has(email)) return null;
    return {
      email,
      subject: verified.payload.sub ?? '',
      tokenId: typeof verified.payload.jti === 'string' ? verified.payload.jti : assertion.slice(-32),
    };
  } catch {
    return null;
  }
}

export async function createCsrfToken(identity: AdminIdentity) {
  const secret = getRuntimeEnv().CSRF_SECRET;
  if (!secret) throw new Error('Admin CSRF protection is not configured.');
  const value = `${identity.subject}.${identity.tokenId}`;
  return encodeBase64Url(await hmacSha256(value, secret));
}

export async function verifyCsrfToken(identity: AdminIdentity, token: string | null) {
  if (!token) return false;
  const expected = await createCsrfToken(identity);
  return constantTimeEqual(expected, token);
}

export function sameOriginRequest(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try { return new URL(origin).host === new URL(request.url).host; } catch { return false; }
}
