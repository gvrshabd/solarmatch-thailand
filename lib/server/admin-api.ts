import { NextResponse } from 'next/server';
import { authenticateAdmin, sameOriginRequest, verifyCsrfToken, type AdminIdentity } from './admin-auth';

export async function requireAdminRequest(request: Request, options: { csrf?: boolean } = {}): Promise<AdminIdentity | NextResponse> {
  const identity = await authenticateAdmin(request.headers);
  if (!identity) return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  if (options.csrf) {
    if (!sameOriginRequest(request) || !await verifyCsrfToken(identity, request.headers.get('x-csrf-token'))) {
      return NextResponse.json({ error: 'invalid_request_verification' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
    }
    const type = request.headers.get('content-type')?.toLowerCase() ?? '';
    if (!type.startsWith('application/json') && !type.startsWith('multipart/form-data')) {
      return NextResponse.json({ error: 'invalid_content_type' }, { status: 415, headers: { 'Cache-Control': 'no-store' } });
    }
  }
  return identity;
}

export function isAdminError(value: AdminIdentity | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}
