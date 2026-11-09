import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { securityResponseHeaders, withSecurityHeaders } from '@/lib/server/response-security';

describe('response security boundaries', () => {
  it('keeps asset and Worker header values aligned', () => {
    const rules = readFileSync(new URL('../../public/_headers', import.meta.url), 'utf8');
    const [path, ...lines] = rules.split(/\r?\n\r?\n/u)[0].split(/\r?\n/u);
    expect(path).toBe('/*');
    expect(lines.map(line => line.trim()).sort()).toEqual(
      Object.entries(securityResponseHeaders).map(([name, value]) => `${name}: ${value}`).sort(),
    );
  });

  it('adds frame protection without losing media sandboxing, private headers or response data', async () => {
    const original = new Response('media', {
      status: 206,
      headers: {
        'Content-Security-Policy': "default-src 'none'; sandbox",
        'Referrer-Policy': 'no-referrer',
        'Cache-Control': 'private, no-store',
      },
    });
    const response = withSecurityHeaders(original);
    expect(response.headers.get('Content-Security-Policy')).toBe("default-src 'none'; sandbox, frame-ancestors 'self'");
    expect(response.headers.get('Referrer-Policy')).toBe('no-referrer');
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(response.status).toBe(206);
    expect(await response.text()).toBe('media');
  });

  it('adds headers to immutable redirects and retains all authentication cookies', () => {
    const redirect = withSecurityHeaders(Response.redirect('https://example.test/path', 308));
    expect(redirect.status).toBe(308);
    expect(redirect.headers.get('Location')).toBe('https://example.test/path');
    expect(redirect.headers.get('X-Frame-Options')).toBe('SAMEORIGIN');

    const cookies = ['one=1; HttpOnly; Secure', 'two=2; HttpOnly; Secure'];
    const response = withSecurityHeaders(new Response(null, {
      status: 204,
      headers: cookies.map((cookie): [string, string] => ['Set-Cookie', cookie]),
    }));
    expect(response.headers.getSetCookie()).toEqual(cookies);
    expect(response.body).toBeNull();
  });
});
