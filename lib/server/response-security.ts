const framePolicy = "frame-ancestors 'self'";
const defaultReferrerPolicy = 'strict-origin-when-cross-origin';

// Cloudflare can serve static assets without invoking the Worker. Keep these
// values in sync with public/_headers.
export const securityResponseHeaders = {
  'Content-Security-Policy': framePolicy,
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': defaultReferrerPolicy,
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
} as const;

export function withSecurityHeaders(response: Response): Response {
  const secured = new Response(response.body, response);
  for (const [name, value] of Object.entries(securityResponseHeaders)) {
    const existing = secured.headers.get(name);
    if (name === 'Referrer-Policy' && existing === 'no-referrer') continue;
    if (name === 'Content-Security-Policy' && existing) {
      // Multiple CSP policies are enforced together. Retain route-specific
      // restrictions such as the sandbox on public media responses.
      if (existing !== value) secured.headers.append(name, value);
    } else {
      secured.headers.set(name, value);
    }
  }
  return secured;
}
