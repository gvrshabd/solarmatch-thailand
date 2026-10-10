import { NextResponse } from 'next/server';
export function middleware() {
  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  return response;
}
export const config = { matcher: ['/installers/:path*', '/enquiry'] };
