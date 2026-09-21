import { legalLaunchDocuments, type LegalDocumentDraft } from '@/config/legal-content';
import type { Locale } from '@/config/i18n';
import { requireDatabase } from '@/lib/server/runtime';
import { LegalShell } from './legal-shell';

async function readPublished(type: 'privacy'|'terms'|'cookies') {
  try {
    const row = await requireDatabase().prepare(`SELECT l.documents_json FROM public_releases r
      JOIN legal_document_versions l ON l.id=r.legal_document_version_id
      WHERE r.is_current=1 AND l.state='published' LIMIT 1`).first<{ documents_json: string }>();
    if (!row) return null;
    const payload = JSON.parse(row.documents_json) as { documents?: Record<string, LegalDocumentDraft> };
    const document = payload.documents?.[type];
    return document?.sections?.length ? document : null;
  } catch { return null; }
}

export async function PublishedLegalDocument({ type, locale = 'th' }: { type: 'privacy'|'terms'|'cookies'; locale?: Locale }) {
  const published = await readPublished(type);
  const document = published ?? legalLaunchDocuments[type];
  return <LegalShell locale={locale} title={document.title[locale]} updated={document.effectiveDate}>
    {document.sections.map((section) => <section key={section.id} id={section.id}><h2>{section.title[locale]}</h2>{section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph[locale]}</p>)}{section.bullets?.length ? <ul>{section.bullets.map((bullet, index) => <li key={index}>{bullet[locale]}</li>)}</ul> : null}</section>)}
  </LegalShell>;
}
