import { legalLaunchDocuments, type LegalDocumentDraft } from '@/config/legal-content';
import type { Locale } from '@/config/i18n';
import { requireDatabase } from '@/lib/server/runtime';
import { prelaunchNotice } from '@/config/legal-review';
import { LegalShell } from './legal-shell';
import { LegalText } from './legal-text';

async function readPublished(type: 'privacy'|'terms'|'cookies') {
  try {
    const row = await requireDatabase().prepare(`SELECT l.documents_json FROM public_releases r
      JOIN legal_document_versions l ON l.id=r.legal_document_version_id
      WHERE r.is_current=1 AND l.state='published' AND l.is_complete=1 LIMIT 1`).first<{ documents_json: string }>();
    if (!row) return null;
    const payload = JSON.parse(row.documents_json) as { documents?: Record<string, LegalDocumentDraft> };
    const document = payload.documents?.[type];
    return document?.sections?.length ? document : null;
  } catch { return null; }
}

export async function PublishedLegalDocument({ type, locale = 'th' }: { type: 'privacy'|'terms'|'cookies'; locale?: Locale }) {
  const published = await readPublished(type);
  const document = published ?? legalLaunchDocuments[type];
  return <LegalShell locale={locale} title={document.title[locale]} updated={document.effectiveDate} version="[VERSION]" dateLabel={document.lastUpdatedLabel[locale]}>
    <aside className="callout"><p>{prelaunchNotice[locale]}</p></aside>
    {document.sections.map((section, sectionIndex) => {
      const bulletList = section.bullets?.length ? <ul>{section.bullets.map((bullet, index) => <li key={index}><LegalText text={bullet[locale]} locale={locale} /></li>)}</ul> : null;
      const splitAt = type === 'privacy' && section.id === 'data' ? 1 : section.paragraphs.length;
      return <section key={section.id} id={section.id}><h2>{sectionIndex + 1}. {section.title[locale]}</h2>
        {section.paragraphs.slice(0, splitAt).map((paragraph, index) => <p key={index}><LegalText text={paragraph[locale]} locale={locale} /></p>)}
        {bulletList}
        {section.paragraphs.slice(splitAt).map((paragraph, index) => <p key={index + splitAt}><LegalText text={paragraph[locale]} locale={locale} /></p>)}
      </section>;
    })}
  </LegalShell>;
}
