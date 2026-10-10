import { getRuntimeEnv } from '@/lib/server/runtime';
export function isLoopback(url: string) { return ['localhost','127.0.0.1','[::1]'].includes(new URL(url).hostname); }
export function assertPlatformRequest(request: Request) {
  const mode = getRuntimeEnv().INSTALLER_PLATFORM_MODE;
  if (mode !== 'local-test' && mode !== 'sandbox') throw new Error('platform_unavailable');
  if (mode === 'local-test' && !isLoopback(request.url)) throw new Error('platform_unavailable');
  if (mode === 'sandbox' && new URL(request.url).origin !== getRuntimeEnv().INSTALLER_BASE_URL) throw new Error('platform_unavailable');
  return { mode };
}
export const privateHeaders = { 'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff' };
export function platformJson(value: unknown, status = 200) { return Response.json(value,{status,headers:privateHeaders}); }
export async function platformBody(request: Request, maxBytes = 32768): Promise<unknown> {
  assertPlatformRequest(request);
  if (request.headers.get('origin') !== new URL(request.url).origin || request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json') throw new Error('invalid_request');
  const reader = request.body?.getReader(); if (!reader) throw new Error('invalid_request');
  let total = 0; const chunks: Uint8Array[] = [];
  while (true) { const {done,value} = await reader.read(); if (done) break; total += value.length; if (total > maxBytes) { await reader.cancel(); throw new Error('request_too_large'); } chunks.push(value); }
  const bytes = new Uint8Array(total); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk,offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(bytes));
}
