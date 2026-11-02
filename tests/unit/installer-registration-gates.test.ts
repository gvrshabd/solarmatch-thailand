import {beforeEach,expect,it,vi} from 'vitest';
import {authEmailReady,installerRegistrationReady} from '@/lib/installer/collection-readiness';
const fixture=vi.hoisted(()=>({env:{INSTALLER_PLATFORM_MODE:'sandbox'} as Record<string,string>,auth:vi.fn(),db:vi.fn()}));
vi.mock('@/lib/server/runtime',()=>({getRuntimeEnv:()=>fixture.env,requireDatabase:fixture.db}));
vi.mock('@/lib/installer/platform',()=>({assertPlatformRequest:()=>({mode:'sandbox'})}));
vi.mock('@/lib/installer/rate-limit',()=>({trustedShareAddress:()=> 'synthetic',allowInstallerRequest:async()=>true}));
vi.mock('@/lib/installer/auth',()=>({createInstallerAuth:()=>({handler:fixture.auth}),trustedInstallerAuthRequest:async(request:Request)=>request}));
import {POST} from '@/app/api/installer-auth/[...all]/route';
beforeEach(()=>{fixture.env={INSTALLER_PLATFORM_MODE:'sandbox'};fixture.auth.mockReset();fixture.auth.mockResolvedValue(new Response('{}'));fixture.db.mockReset();fixture.db.mockReturnValue({});});
const post=(suffix:string)=>POST(new Request('https://staging.example.test/api/installer-auth/'+suffix,{method:'POST',body:'{}'}));
it('blocks registration and recovery before database or auth mutations when email is off',async()=>{
 for(const path of ['sign-up/email','sign-up/email/','request-password-reset','send-verification-email'])expect((await post(path)).status).toBe(503);
 expect(fixture.db).not.toHaveBeenCalled();expect(fixture.auth).not.toHaveBeenCalled();
 fixture.env.INSTALLER_REGISTRATION_ENABLED='true';
 expect((await post('sign-up/email')).status).toBe(503);
});
it('keeps existing sign-in available independently of new registration/email sending',async()=>{
 expect((await post('sign-in/email')).status).toBe(200);
 expect(fixture.auth).toHaveBeenCalledOnce();
});
it('requires a separate explicit registration gate plus a compatible configured sender',()=>{
 const env={INSTALLER_PLATFORM_MODE:'production',OUTBOUND_MESSAGES_ENABLED:'true',AUTH_EMAIL_PROVIDER_MODE:'live',AUTH_EMAIL_LIVE_ENABLED:'true',AUTH_EMAIL_PROVIDER_TOKEN:'synthetic',AUTH_EMAIL_FROM:'help@example.test'};
 expect(authEmailReady(env)).toBe(true);expect(installerRegistrationReady(env)).toBe(false);
 expect(installerRegistrationReady({...env,INSTALLER_REGISTRATION_ENABLED:'true'})).toBe(true);
 expect(installerRegistrationReady({...env,INSTALLER_REGISTRATION_ENABLED:'true',AUTH_EMAIL_LIVE_ENABLED:'false'})).toBe(false);
 expect(installerRegistrationReady({INSTALLER_PLATFORM_MODE:'local-test'})).toBe(true);
});
