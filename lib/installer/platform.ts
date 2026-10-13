import { getRuntimeEnv } from '@/lib/server/runtime';
export function isLoopback(url: string) { return ['localhost','127.0.0.1','[::1]'].includes(new URL(url).hostname); }
export function assertPlatformRequest(request: Request) {
  const mode = getRuntimeEnv().INSTALLER_PLATFORM_MODE;
  if (mode !== 'local-test' && mode !== 'sandbox' && mode !== 'production') throw new Error('platform_unavailable');
  if (mode === 'local-test' && !isLoopback(request.url)) throw new Error('platform_unavailable');
  if (mode === 'sandbox' || mode === 'production') {
    const base=new URL(getRuntimeEnv().INSTALLER_BASE_URL??'');
    if(base.protocol!=='https:'||isLoopback(base.href)||base.username||base.password||base.pathname!=='/'||base.search||base.hash||new URL(request.url).origin!==base.origin)throw new Error('platform_unavailable');
  }
  return { mode };
}
/** Call only after verified admin authentication. Operational writes still use
 * assertPlatformRequest and remain unavailable while the platform is off. */
export function assertAdminPlatformReadRequest(request:Request) {
  if(request.method!=='GET')throw new Error('platform_unavailable');
  if(getRuntimeEnv().INSTALLER_PLATFORM_MODE!=='off')return {...assertPlatformRequest(request),readOnly:false};
  const base=new URL(getRuntimeEnv().INSTALLER_BASE_URL??'');
  if(base.protocol!=='https:'||isLoopback(base.href)||base.username||base.password||base.pathname!=='/'||base.search||base.hash||new URL(request.url).origin!==base.origin)throw new Error('platform_unavailable');
  return {mode:'off' as const,readOnly:true};
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
