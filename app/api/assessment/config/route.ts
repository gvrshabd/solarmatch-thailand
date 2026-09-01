import { type NextRequest, NextResponse } from 'next/server';
import { getPublicAssessmentConfig } from '@/lib/server/releases';
import { authenticateRestrictedSiteOwner } from '@/lib/server/private-preview-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const restrictedIdentity = await authenticateRestrictedSiteOwner(request.headers);
    const configuration = await getPublicAssessmentConfig({ restrictedAccess: Boolean(restrictedIdentity) });
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
