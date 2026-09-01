import { type NextRequest, NextResponse } from 'next/server';
import { getPublicAssessmentConfig } from '@/lib/server/releases';
import { authenticatePrivatePreview } from '@/lib/server/private-preview-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const previewIdentity = await authenticatePrivatePreview(request.headers);
    const configuration = await getPublicAssessmentConfig({ privatePreview: Boolean(previewIdentity) });
    return NextResponse.json(configuration, {
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        Vary: 'Cf-Access-Jwt-Assertion',
      },
    });
  } catch {
    return NextResponse.json({ error: 'assessment_configuration_unavailable' }, { status: 503 });
  }
}
