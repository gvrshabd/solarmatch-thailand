import { describe, expect, it, vi } from 'vitest';
vi.mock('better-auth', () => ({ betterAuth: vi.fn() }));
import { validateInstallerAuthConfig,trustedInstallerAuthRequest } from '@/lib/installer/auth';
import { isLocalAuthPreview } from '@/lib/installer/email';

describe('installer authentication configuration boundaries', () => {
  const secret = 'test-secret-at-least-thirty-two-characters';
  it('fails closed when disabled or a signing secret is missing', () => {
    expect(() => validateInstallerAuthConfig('off', 'https://example.com', secret)).toThrow();
    expect(() => validateInstallerAuthConfig('sandbox', 'https://example.com', undefined)).toThrow();
    expect(() => validateInstallerAuthConfig('sandbox', 'https://example.com', 'short')).toThrow();
  });
  it('requires HTTPS outside isolated loopback test mode', () => {
    expect(() => validateInstallerAuthConfig('sandbox', 'http://example.com', secret)).toThrow();
    expect(() => validateInstallerAuthConfig('local-test', 'https://example.com', secret)).toThrow();
    expect(validateInstallerAuthConfig('local-test', 'http://localhost:3000', secret).secure).toBe(false);
    expect(validateInstallerAuthConfig('sandbox', 'https://example.com', secret).secure).toBe(true);
  });
  it('never enables email recovery previews from remote hosts or sandbox mode', () => {
    expect(isLocalAuthPreview('local-test', new Request('http://localhost:3000/api/installer-auth/sign-up/email'))).toBe(true);
    expect(isLocalAuthPreview('local-test', new Request('https://example.com/api/installer-auth/sign-up/email'))).toBe(false);
    expect(isLocalAuthPreview('sandbox', new Request('http://localhost:3000/api/installer-auth/sign-up/email'))).toBe(false);
    expect(isLocalAuthPreview('local-test')).toBe(false);
  });
  it('does not let browser-supplied IP headers rotate authentication rate limits',async()=>{
    const sanitized=await trustedInstallerAuthRequest(new Request('http://localhost:3000/api/installer-auth/sign-in/email',{headers:{'cf-connecting-ip':'203.0.113.1','x-forwarded-for':'203.0.113.2'}}));
    expect(sanitized.headers.get('cf-connecting-ip')).toBeNull();
    expect(sanitized.headers.get('x-forwarded-for')).toBeNull();
  });
  it('preserves POST credentials bytes and rejects oversized bodies before library parsing',async()=>{
    const payload=JSON.stringify({email:'synthetic@example.test',password:'synthetic-password'});
    const sanitized=await trustedInstallerAuthRequest(new Request('http://localhost:3000/api/installer-auth/sign-in/email',{method:'POST',body:payload}));
    expect(sanitized.method).toBe('POST');expect(await sanitized.text()).toBe(payload);
    await expect(trustedInstallerAuthRequest(new Request('http://localhost:3000/api/installer-auth/sign-in/email',{method:'POST',body:'x'.repeat(32769)}))).rejects.toThrow('auth_request_too_large');
  });
});
