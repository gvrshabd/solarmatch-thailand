import { createInstallerAuth,trustedInstallerAuthRequest } from '@/lib/installer/auth';
import { assertPlatformRequest } from '@/lib/installer/platform';
import {allowInstallerRequest,trustedShareAddress} from '@/lib/installer/rate-limit';
import {requireDatabase} from '@/lib/server/runtime';

async function handler(request: Request) {
  try {
    assertPlatformRequest(request);
    const address=trustedShareAddress(request);const path=new URL(request.url).pathname;
    const specific:Record<string,{max:number;window:number}>={'sign-in/email':{max:5,window:60},'sign-up/email':{max:3,window:60},'request-password-reset':{max:3,window:300},'send-verification-email':{max:3,window:300}};
    const rule=Object.entries(specific).find(([suffix])=>path.endsWith('/'+suffix))?.[1];
    const db=requireDatabase();
    if(!await allowInstallerRequest(db,`auth-global:${address}`,30,60)||(rule&&!await allowInstallerRequest(db,`auth-endpoint:${address}:${path}`,rule.max,rule.window)))return Response.json({error:'too_many_requests'},{status:429,headers:{'Cache-Control':'no-store','Retry-After':String(rule?.window??60)}});
    const trusted=await trustedInstallerAuthRequest(request);
    const auth=createInstallerAuth();
    const response=await auth.handler(trusted);
    const headers=new Headers(response.headers);
    headers.set('Cache-Control', 'no-store');
    headers.set('Referrer-Policy', 'no-referrer');
    return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
  } catch {
    return Response.json({ error: 'Installer authentication is unavailable. / ระบบบัญชีผู้ติดตั้งยังไม่พร้อมใช้งาน' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
export const GET = handler;
export const POST = handler;
