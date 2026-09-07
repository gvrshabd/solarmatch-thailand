import { headers } from 'next/headers';
import { EstimateShell } from '@/components/estimate/estimate-shell';
import type { QuestionnaireDocument } from '@/lib/questionnaire/types';
import { authenticateAdmin } from '@/lib/server/admin-auth';
import { requireDatabase } from '@/lib/server/runtime';

export const dynamic = 'force-dynamic';

export default async function AdminPreviewPage({ searchParams }: { searchParams: Promise<{ questionnaireVersion?: string }> }) {
  const identity = await authenticateAdmin(await headers());
  if (!identity) return <main className="admin-access-denied"><div><h1>Access denied</h1><p>An approved Cloudflare Access identity is required.</p></div></main>;
  const { questionnaireVersion } = await searchParams;
  const row = questionnaireVersion
    ? await requireDatabase().prepare('SELECT id, state, document_json FROM questionnaire_versions WHERE id = ? LIMIT 1').bind(questionnaireVersion).first<{ id: string; state: string; document_json: string }>()
    : null;
  if (!row) return <main className="admin-access-denied"><div><h1>Preview unavailable</h1><p>Select an existing questionnaire version from the administration dashboard.</p></div></main>;
  const document = JSON.parse(row.document_json) as QuestionnaireDocument;
  return <><div className="admin-preview-banner"><strong>Private preview</strong><span>{row.id} · {row.state}</span><a href="/admin/">Return to administration</a></div><EstimateShell locale="en" questionnaireOverride={document} /></>;
}
