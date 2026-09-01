import { describe, expect, it, vi } from 'vitest';
import type { JWTPayload } from 'jose';
import { authenticateRestrictedSiteOwner, restrictedSiteAccessConfiguration } from '@/lib/server/private-preview-auth';
import type { SolarMatchRuntimeEnv } from '@/lib/server/runtime';

const nowMs = Date.parse('2026-09-01T00:00:00.000Z');
const nowSeconds = Math.floor(nowMs / 1000);
const runtime: SolarMatchRuntimeEnv = {
  ACCESS_TEAM_DOMAIN: 'https://millys.cloudflareaccess.com',
  PRIVATE_SITE_ACCESS_AUD: 'site-wide-preview-aud',
  ADMIN_EMAILS: 'deluxejahseh@gmail.com',
};

function payload(overrides: Partial<JWTPayload> = {}): JWTPayload {
  return {
    iss: 'https://millys.cloudflareaccess.com',
    aud: ['site-wide-preview-aud'],
    email: 'deluxejahseh@gmail.com',
    sub: 'owner-subject',
    jti: 'preview-token-id',
    exp: nowSeconds + 600,
    nbf: nowSeconds - 60,
    ...overrides,
  };
}

function headers() {
  return new Headers({ 'Cf-Access-Jwt-Assertion': 'signed-owner-assertion' });
}

describe('restricted-site Access assertion', () => {
  it('requires the complete site-wide Access configuration', () => {
    expect(restrictedSiteAccessConfiguration(runtime)).not.toBeNull();
    expect(restrictedSiteAccessConfiguration({ ...runtime, PRIVATE_SITE_ACCESS_AUD: undefined })).toBeNull();
    expect(restrictedSiteAccessConfiguration({ ...runtime, ADMIN_EMAILS: '' })).toBeNull();
  });

  it('accepts only a current assertion for the site-wide AUD and exact allowlisted email', async () => {
    const verifyAssertion = vi.fn(async () => payload());
    await expect(authenticateRestrictedSiteOwner(headers(), { runtime, verifyAssertion, nowMs })).resolves.toEqual({
      email: 'deluxejahseh@gmail.com', subject: 'owner-subject', tokenId: 'preview-token-id',
    });
    expect(verifyAssertion).toHaveBeenCalledWith('signed-owner-assertion', new URL('https://millys.cloudflareaccess.com/cdn-cgi/access/certs'));
  });

  it.each([
    ['wrong audience', { aud: 'admin-aud' }],
    ['wrong issuer', { iss: 'https://attacker.example' }],
    ['wrong email', { email: 'visitor@example.com' }],
    ['expired token', { exp: nowSeconds }],
    ['future token', { nbf: nowSeconds + 10 }],
  ])('rejects %s', async (_name, override) => {
    await expect(authenticateRestrictedSiteOwner(headers(), { runtime, verifyAssertion: async () => payload(override), nowMs })).resolves.toBeNull();
  });

  it('rejects missing and unverifiable assertions without exposing the error', async () => {
    await expect(authenticateRestrictedSiteOwner(new Headers(), { runtime, nowMs })).resolves.toBeNull();
    await expect(authenticateRestrictedSiteOwner(headers(), { runtime, verifyAssertion: async () => { throw new Error('invalid signature'); }, nowMs })).resolves.toBeNull();
  });
});
