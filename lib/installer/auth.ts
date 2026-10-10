import { betterAuth } from 'better-auth';
import { getRuntimeEnv, requireDatabase } from '@/lib/server/runtime';
import { queueInstallerAuthEmail } from '@/lib/installer/email';

export async function trustedInstallerAuthRequest(request:Request) {
  const headers=new Headers(request.headers);
  // Trusted identity and atomic rate limiting are applied by the HTTP route.
  // Drop untrusted IP metadata before passing the request to the library.
  headers.delete('x-forwarded-for');headers.delete('x-real-ip');
  headers.delete('cf-connecting-ip');
  // vinext can provide a Node-facing Request to workerd. Construct the native
  // request from its URL and buffered bytes instead of passing a foreign Request
  // or a foreign streaming body to the Worker constructor.
  let body:Uint8Array<ArrayBuffer>|undefined;
  if(!['GET','HEAD'].includes(request.method)&&request.body){
    const reader=request.body.getReader();const parts:Uint8Array[]=[];let size=0;
    while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>32768){await reader.cancel();throw new Error('auth_request_too_large');}parts.push(part.value);}
    body=new Uint8Array(size);let offset=0;for(const part of parts){body.set(part,offset);offset+=part.byteLength;}
  }
  return new Request(request.url,{method:request.method,headers,body});
}

export function validateInstallerAuthConfig(mode: string | undefined, base: string | undefined, secret: string | undefined) {
  if (!mode || mode === 'off') throw new Error('Installer accounts are disabled.');
  if (!['local-test', 'sandbox', 'production'].includes(mode)) throw new Error('Installer authentication mode is invalid.');
  if (!base || !secret || secret.length < 32) throw new Error('Installer authentication is not configured.');
  const url = new URL(base);
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(mode === 'local-test' && loopback && url.protocol === 'http:')) throw new Error('Installer authentication requires HTTPS.');
  if (mode === 'local-test' && !loopback) throw new Error('Local authentication requires a loopback origin.');
  if (mode === 'production' && loopback) throw new Error('Production authentication requires a public HTTPS origin.');
  return { baseURL: url.origin, secure: url.protocol === 'https:' };
}

export function createInstallerAuth() {
  const env = getRuntimeEnv();
  const config = validateInstallerAuthConfig(env.INSTALLER_PLATFORM_MODE, env.INSTALLER_BASE_URL, env.INSTALLER_AUTH_SECRET);
  return betterAuth({
    database: requireDatabase(),
    secret: env.INSTALLER_AUTH_SECRET!,
    baseURL: config.baseURL,
    basePath: '/api/installer-auth',
    trustedOrigins: [config.baseURL],
    user: { modelName: 'installer_auth_user' },
    account: { modelName: 'installer_auth_account' },
    verification: { modelName: 'installer_auth_verification' },
    session: { modelName: 'installer_auth_session', expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24, cookieCache: { enabled: false } },
    emailAndPassword: {
      enabled: true, requireEmailVerification: true, minPasswordLength: 12, maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }, request) => queueInstallerAuthEmail({ to: user.email, userId: user.id, kind: 'password-reset', url }, request),
    },
    emailVerification: {
      sendOnSignUp: true, sendOnSignIn: true, autoSignInAfterVerification: true, expiresIn: 3600,
      sendVerificationEmail: async ({ user, url }, request) => queueInstallerAuthEmail({ to: user.email, userId: user.id, kind: 'verification', url }, request),
    },
    // The HTTP route applies atomic D1 limits with trusted edge identity. The
    // library's IP parser calls a missing Zod validate export in this release.
    rateLimit: { enabled: false },
    advanced: { cookiePrefix: 'solarmatch_installer', useSecureCookies: config.secure,
      defaultCookieAttributes: { httpOnly: true, sameSite: 'lax', path: '/' },
      ipAddress: { disableIpTracking: true } },
    logger: { disabled: true },
  });
}

export async function getInstallerSession(request: Request): Promise<{ user: { id: string; email: string; emailVerified: boolean; name: string }; session: { id: string } } | null> {
  const auth = createInstallerAuth();
  const value = await auth.api.getSession({ headers: request.headers });
  if (!value) return null;
  return { user: { id: value.user.id, email: value.user.email, emailVerified: value.user.emailVerified, name: value.user.name }, session: { id: value.session.id } };
}
