import type { ReactNode } from 'react';
import type { Locale } from '@/config/i18n';

export function LegalShell({ title, summary, children, locale = 'th', updated = null, pendingReview = true }: { title: string; summary: string; children: ReactNode; locale?: Locale; updated?: string | null; pendingReview?: boolean }) {
  const english = locale === 'en';
  return (
    <main className="legal-page">
      <div className="site-shell legal-shell">
        <header><p className="eyebrow">{pendingReview ? (english ? 'Draft legal notice' : 'ร่างประกาศทางกฎหมาย') : (english ? 'Published legal notice' : 'ประกาศทางกฎหมายฉบับเผยแพร่')}</p><h1>{title}</h1><p>{summary}</p><small>{updated ? `${english ? 'Effective' : 'มีผลบังคับใช้'} ${updated}` : (english ? 'Effective date pending · Qualified Thai legal review is still required before live lead collection' : 'รอระบุวันที่มีผลบังคับใช้ · ต้องตรวจสอบโดยผู้เชี่ยวชาญกฎหมายไทยก่อนรับข้อมูลลูกค้าจริง')}</small></header>
        <article className="prose">{children}</article>
      </div>
    </main>
  );
}
