import { NextResponse } from 'next/server';
import { operatorProfileComplete, type OperatorProfile } from '@/config/legal-content';
import { requireDatabase } from '@/lib/server/runtime';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const row = await requireDatabase().prepare(`SELECT l.operator_profile_json
      FROM public_releases r JOIN legal_document_versions l ON l.id=r.legal_document_version_id
      WHERE r.is_current=1 AND l.state='published' AND l.is_complete=1 LIMIT 1`).first<{ operator_profile_json: string | null }>();
    if (!row?.operator_profile_json) return NextResponse.json({ operator: null }, { headers: { 'Cache-Control': 'public, max-age=60' } });
    const operator = JSON.parse(row.operator_profile_json) as OperatorProfile;
    if (!operatorProfileComplete(operator)) return NextResponse.json({ operator: null }, { headers: { 'Cache-Control': 'public, max-age=60' } });
    return NextResponse.json({ operator: {
      legalBusinessNameEn: operator.legalBusinessNameEn,
      legalBusinessNameTh: operator.legalBusinessNameTh,
      registeredAddressEn: operator.registeredAddressEn,
      registeredAddressTh: operator.registeredAddressTh,
      publicBusinessPhone: operator.publicBusinessPhone,
      publicBusinessEmail: operator.publicBusinessEmail,
      privacyContactEmail: operator.privacyContactEmail,
      privacyRightsRequestUrl: operator.privacyRightsRequestUrl,
    } }, { headers: { 'Cache-Control': 'public, max-age=60', 'X-Content-Type-Options': 'nosniff' } });
  } catch {
    return NextResponse.json({ operator: null }, { headers: { 'Cache-Control': 'no-store' } });
  }
}
