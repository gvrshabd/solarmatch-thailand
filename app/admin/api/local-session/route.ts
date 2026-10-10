import { NextResponse } from 'next/server';
import { createLocalAdminSession, LOCAL_ADMIN_COOKIE, localAdminAvailable } from '@/lib/server/admin-auth';
import { getRuntimeEnv } from '@/lib/server/runtime';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const base = getRuntimeEnv().INSTALLER_BASE_URL;
  const origin = request.headers.get('origin');
  if (!base || !localAdminAvailable(request.headers.get('host')) || new URL(request.url).origin !== base || origin !== base || request.headers.get('content-type')?.split(';')[0] !== 'application/x-www-form-urlencoded') return new Response(null, { status: 404 });
  const body = await request.text();
  if (body.length > 1024) return new Response(null, { status: 413 });
  const fields = new URLSearchParams(body);
  const logout = fields.get('action') === 'logout';
  const session = logout ? null : await createLocalAdminSession(request.headers.get('host'), fields.get('password') ?? '');
  const response = NextResponse.redirect(new URL(logout || session ? '/admin' : '/admin/local-access?error=1', base), 303);
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.cookies.set(LOCAL_ADMIN_COOKIE, session ?? '', { httpOnly: true, sameSite: 'strict', secure: false, path: '/admin', maxAge: session ? 3600 : 0 });
  return response;
}
