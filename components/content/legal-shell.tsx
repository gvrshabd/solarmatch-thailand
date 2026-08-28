import type { ReactNode } from 'react';
import type { Locale } from '@/config/i18n';

export function LegalShell({ title, summary, children, locale = 'th' }: { title: string; summary: string; children: ReactNode; locale?: Locale }) {
  const english = locale === 'en';
  return (
    <main className="legal-page">
      <div className="site-shell legal-shell">
        <header><p className="eyebrow">{english ? 'Draft legal notice' : 'ร่างประกาศทางกฎหมาย'}</p><h1>{title}</h1><p>{summary}</p><small>{english ? 'Last updated 28 August 2026 · Final legal review is required before live lead collection' : 'ปรับปรุงล่าสุด 28 สิงหาคม 2569 · ต้องตรวจสอบทางกฎหมายขั้นสุดท้ายก่อนรับข้อมูลลูกค้าเป้าหมายจริง'}</small></header>
        <article className="prose">{children}</article>
      </div>
    </main>
  );
}
