import { NextResponse } from 'next/server';
import { getPublicAssessmentConfig } from '@/lib/server/releases';
import { canRequestContact } from '@/lib/contact/availability';

export const dynamic = 'force-dynamic';
export async function GET() {
  let contactAvailable = false;
  try {
    // Public perspective only: never inherit an owner's restricted preview.
    contactAvailable = canRequestContact(await getPublicAssessmentConfig());
  } catch { /* Calculator remains available even when contact configuration cannot load. */ }
  return NextResponse.json({contactAvailable}, {headers:{
    'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff',
  }});
}

