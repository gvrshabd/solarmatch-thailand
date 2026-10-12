import {createRemoteJWKSet,jwtVerify} from 'jose';
import type {SolarMatchRuntimeEnv} from './runtime';

export const stagingLinePath='/api/installer/webhooks/line';
const localOnly=new Set(['/api/installer/test','/admin/local-access','/admin/api/local-session','/__scheduled']);
export type StagingAccessEnv=SolarMatchRuntimeEnv&{STAGING_ACCESS_AUD?:string;ASSETS?:Fetcher};
export function stagingRoute(request:Request,env:StagingAccessEnv){
  if(env.INSTALLER_PLATFORM_MODE!=='sandbox'||env.INSTALLER_BASE_URL!=='https://solarmatch-installer-staging.deluxejahseh.workers.dev'||new URL(request.url).origin!==env.INSTALLER_BASE_URL)return 'deny';
  const pathname=new URL(request.url).pathname;
  if(localOnly.has(pathname)||pathname.startsWith('/api/installer/test/')||pathname.startsWith('/admin/local-access/'))return 'local-only';
  return pathname===stagingLinePath?'signed-webhook':'access';
}
export async function stagingIdentity(request:Request,env:StagingAccessEnv){
  const assertion=request.headers.get('cf-access-jwt-assertion');
  const audiences=[env.STAGING_ACCESS_AUD,env.ACCESS_AUD].filter((value):value is string=>!!value);
  const allowed=new Set((env.ADMIN_EMAILS??'').split(',').map(value=>value.trim().toLowerCase()).filter(Boolean));
  if(!assertion||!env.ACCESS_TEAM_DOMAIN||!env.STAGING_ACCESS_AUD||!env.ACCESS_AUD||!allowed.size)return false;
  try{
    const issuer=env.ACCESS_TEAM_DOMAIN.replace(/\/$/u,'');
    const verified=await jwtVerify(assertion,createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`)),{issuer,audience:audiences});
    return typeof verified.payload.email==='string'&&allowed.has(verified.payload.email.toLowerCase());
  }catch{return false;}
}
