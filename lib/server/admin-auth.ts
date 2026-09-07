import { createRemoteJWKSet, jwtVerify } from 'jose';
import { encodeBase64Url, hmacSha256, constantTimeEqual } from './crypto';
import { getRuntimeEnv } from './runtime';

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
