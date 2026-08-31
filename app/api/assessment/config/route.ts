import { NextResponse } from 'next/server';
import { getPublicAssessmentConfig } from '@/lib/server/releases';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const configuration = await getPublicAssessmentConfig();
    return NextResponse.json(configuration, {
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.json({ error: 'assessment_configuration_unavailable' }, { status: 503 });
  }
}
