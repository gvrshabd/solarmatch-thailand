import { NextResponse } from 'next/server';
import { authenticateAdmin, createCsrfToken } from '@/lib/server/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const identity = await authenticateAdmin(request.headers);
  if (!identity) return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  try {
    const csrfToken = await createCsrfToken(identity);
    return NextResponse.json({ email: identity.email, csrfToken }, { headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch {
    return NextResponse.json({ error: 'admin_security_unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
