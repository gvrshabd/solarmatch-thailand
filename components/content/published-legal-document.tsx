import { legalLaunchDocuments, type LegalDocumentDraft } from '@/config/legal-content';
import type { Locale } from '@/config/i18n';
import { requireDatabase } from '@/lib/server/runtime';
import { LegalShell } from './legal-shell';

function safeDraft(document: LegalDocumentDraft, locale: Locale) {
  const replacement = locale === 'en'
    ? 'This factual detail will be published before contact collection is enabled.'
    : 'ข้อมูลจริงส่วนนี้จะเผยแพร่ให้ครบถ้วนก่อนเปิดรับคำขอติดต่อ';
  const next = structuredClone(document);
  next.sections.forEach((section) => section.paragraphs.forEach((paragraph) => {
    paragraph.en = paragraph.en.replace(/\[[A-Z][A-Z _-]+\]/gu, replacement);
    paragraph.th = paragraph.th.replace(/\[[A-Z][A-Z _-]+\]/gu, replacement);
  }));
  return next;
}

async function readPublished(type: 'privacy'|'terms'|'cookies') {
  try {
    const row = await requireDatabase().prepare(`SELECT l.documents_json FROM public_releases r
      JOIN legal_document_versions l ON l.id=r.legal_document_version_id
      WHERE r.is_current=1 AND l.state='published' AND l.is_complete=1 LIMIT 1`).first<{ documents_json: string }>();
    if (!row) return null;
    const payload = JSON.parse(row.documents_json) as { documents?: Record<string, LegalDocumentDraft> };
    const document = payload.documents?.[type];
    return document && !/\[[A-Z][A-Z _-]+\]/u.test(JSON.stringify(document)) ? document : null;
  } catch { return null; }
}

export async function PublishedLegalDocument({ type, locale = 'th' }: { type: 'privacy'|'terms'|'cookies'; locale?: Locale }) {
  const published = await readPublished(type);
  const document = published ?? safeDraft(legalLaunchDocuments[type], locale);
  const english = locale === 'en';
  const summary = published
    ? (english ? 'This is the current published version for SolarMatch Thailand.' : 'นี่คือเอกสารฉบับที่เผยแพร่ในปัจจุบันของ SolarMatch Thailand')
    : (english ? 'Complete bilingual pre-launch draft. Contact collection remains disabled until factual details and legal review are complete.' : 'ร่างสองภาษาสำหรับเตรียมเปิดบริการ โดยระบบรับข้อมูลติดต่อยังปิดอยู่จนกว่าข้อมูลจริงและการตรวจสอบทางกฎหมายจะครบถ้วน');
  return <LegalShell locale={locale} title={document.title[locale]} summary={summary} updated={document.effectiveDate} pendingReview={!published}>
    {document.sections.map((section) => <section key={section.id} id={section.id}><h2>{section.title[locale]}</h2>{section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph[locale]}</p>)}{section.bullets?.length ? <ul>{section.bullets.map((bullet, index) => <li key={index}>{bullet[locale]}</li>)}</ul> : null}</section>)}
  </LegalShell>;
}
