export type ProviderMode = 'off' | 'local-test' | 'sandbox';
export class ProviderError extends Error {
  constructor(public readonly code: string) { super(code); this.name = 'ProviderError'; }
}
export function requireMode(mode: ProviderMode) {
  if (!['local-test', 'sandbox'].includes(mode)) throw new ProviderError('provider_disabled');
}
export function parseObject(raw: string): Record<string, unknown> {
  try { const value = JSON.parse(raw); if (value && typeof value === 'object' && !Array.isArray(value)) return value; } catch { /* safe error */ }
  throw new ProviderError('invalid_payload');
}
export async function requestJson(url: string, init: RequestInit, transport: typeof fetch = fetch): Promise<Record<string, unknown>> {
  try {
    const response = await transport(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new ProviderError(`provider_http_${response.status}`);
    return parseObject(await response.text());
  } catch (error) { if (error instanceof ProviderError) throw error; throw new ProviderError('provider_unavailable'); }
}
export function base64(bytes: Uint8Array) { return btoa(String.fromCharCode(...bytes)); }
export function unbase64(value: string) {
  try { return Uint8Array.from(atob(value), c => c.charCodeAt(0)); } catch { throw new ProviderError('invalid_secret'); }
}
export async function hmac(key: Uint8Array, value: string) {
  const imported = await crypto.subtle.importKey('raw', key as BufferSource, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', imported, new TextEncoder().encode(value)));
}
export function constantEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let difference = 0; for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}
export function safeUrl(value: string, allowLocal = false) {
  let url: URL; try { url = new URL(value); } catch { throw new ProviderError('invalid_url'); }
  if (url.username || url.password || !(url.protocol === 'https:' || (allowLocal && url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) throw new ProviderError('invalid_url');
  return url;
}
