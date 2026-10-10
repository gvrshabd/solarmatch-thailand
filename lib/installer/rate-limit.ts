import {encodeBase64Url,hmacSha256} from '@/lib/server/crypto';
import {getRuntimeEnv} from '@/lib/server/runtime';
/** Keys are internal authenticated subjects, never supplied by the caller. */
export async function allowInstallerRequest(db:D1Database,key:string,limit:number,windowSeconds:number){
  if(!key||!Number.isSafeInteger(limit)||limit<1||limit>1000||!Number.isSafeInteger(windowSeconds)||windowSeconds<1||windowSeconds>86400)throw new Error('invalid_rate_limit');
  const secret=getRuntimeEnv().INSTALLER_AUTH_SECRET;if(!secret||secret.length<32)throw new Error('rate_limit_unavailable');
  const hash=encodeBase64Url(await hmacSha256(`installer-throttle:v1:${key}`,secret));
  const window=new Date(Math.floor(Date.now()/(windowSeconds*1000))*windowSeconds*1000).toISOString();
  const result=await db.prepare(`INSERT INTO public_request_limits(key_hash,window_start,request_count) VALUES(?,?,1)
    ON CONFLICT(key_hash,window_start) DO UPDATE SET request_count=MIN(request_count+1,?) RETURNING request_count`).bind(hash,window,limit+1).first<{request_count:number}>();
  return !!result&&result.request_count<=limit;
}
export function trustedShareAddress(request:Request){
  const cf=(request as Request&{cf?:{colo?:unknown}}).cf;
  // Browser/X-Forwarded-For headers do not establish an IP identity. The
  // edge-injected header is used only with Cloudflare request metadata.
  if(cf&&typeof cf.colo==='string')return request.headers.get('cf-connecting-ip')??'edge-unknown';
  return ['localhost','127.0.0.1','[::1]'].includes(new URL(request.url).hostname)?'local-loopback':'untrusted-origin';
}
