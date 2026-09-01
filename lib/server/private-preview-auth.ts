import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { getRuntimeEnv, type SolarMatchRuntimeEnv } from './runtime';

export type PrivatePreviewIdentity = {
  email: string;
  subject: string;
  tokenId: string;
};

type AssertionVerifier = (assertion: string, certificateUrl: URL) => Promise<JWTPayload>;

function enabled(value: string | undefined) {
  return value === '1' || value?.toLowerCase() === 'true';
}

export function privatePreviewAccessConfiguration(runtime: SolarMatchRuntimeEnv = getRuntimeEnv()) {
  const teamDomain = runtime.ACCESS_TEAM_DOMAIN?.replace(/\/$/u, '');
  const audience = runtime.PRIVATE_SITE_ACCESS_AUD?.trim();
  const allowedEmails = new Set((runtime.ADMIN_EMAILS ?? '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean));
  if (!enabled(runtime.PRIVATE_CONTACT_PREVIEW_ENABLED) || !teamDomain || !audience || allowedEmails.size === 0) return null;
  return { teamDomain, audience, allowedEmails };
}

function audienceMatches(value: JWTPayload['aud'], expected: string) {
  return typeof value === 'string' ? value === expected : Array.isArray(value) && value.includes(expected);
}

async function verifyWithCloudflare(assertion: string, certificateUrl: URL) {
  const verified = await jwtVerify(assertion, createRemoteJWKSet(certificateUrl));
  return verified.payload;
}

export async function authenticatePrivatePreview(
  headers: Headers,
  options: { runtime?: SolarMatchRuntimeEnv; verifyAssertion?: AssertionVerifier; nowMs?: number } = {},
): Promise<PrivatePreviewIdentity | null> {
  const configuration = privatePreviewAccessConfiguration(options.runtime);
  const assertion = headers.get('cf-access-jwt-assertion');
  if (!configuration || !assertion) return null;

  try {
    const payload = await (options.verifyAssertion ?? verifyWithCloudflare)(assertion, new URL(`${configuration.teamDomain}/cdn-cgi/access/certs`));
    const nowSeconds = Math.floor((options.nowMs ?? Date.now()) / 1000);
    const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
    if (payload.iss !== configuration.teamDomain) return null;
    if (!audienceMatches(payload.aud, configuration.audience)) return null;
    if (typeof payload.exp !== 'number' || payload.exp <= nowSeconds) return null;
    if (typeof payload.nbf === 'number' && payload.nbf > nowSeconds) return null;
    if (!configuration.allowedEmails.has(email)) return null;
    return {
      email,
      subject: typeof payload.sub === 'string' ? payload.sub : '',
      tokenId: typeof payload.jti === 'string' ? payload.jti : assertion.slice(-32),
    };
  } catch {
    return null;
  }
}
