import type { ReactNode } from 'react';
import { PrototypeNotice } from '@/components/site/prototype-notice';
import type { Locale } from '@/config/i18n';

export function LegalShell({ title, summary, children, locale = 'th' }: { title: string; summary: string; children: ReactNode; locale?: Locale }) {
  const english = locale === 'en';
  return (
    <main className="legal-page">
      <div className="site-shell legal-shell">
        <header><p className="eyebrow">{english ? 'Draft for the prototype website' : 'ร่างสำหรับเว็บไซต์ต้นแบบ'}</p><h1>{title}</h1><p>{summary}</p><PrototypeNotice compact locale={locale} /><small>{english ? 'Last updated 28 August 2026 · Legal review is required before any live service' : 'ปรับปรุงล่าสุด 28 สิงหาคม 2026 · ต้องผ่านการตรวจสอบทางกฎหมายก่อนเปิดใช้งานจริง'}</small></header>
        <article className="prose">{children}</article>
      </div>
    </main>
  );
}
