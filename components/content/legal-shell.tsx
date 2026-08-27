import type { ReactNode } from 'react';
import { PrototypeNotice } from '@/components/site/prototype-notice';

export function LegalShell({ title, summary, children }: { title: string; summary: string; children: ReactNode }) {
  return (
    <main className="legal-page">
      <div className="site-shell legal-shell">
        <header><p className="eyebrow">ร่างสำหรับเว็บไซต์ต้นแบบ</p><h1>{title}</h1><p>{summary}</p><PrototypeNotice compact /><small>ปรับปรุงล่าสุด 27 สิงหาคม 2026 · ต้องผ่านการตรวจสอบทางกฎหมายก่อนเปิดใช้งานจริง</small></header>
        <article className="prose">{children}</article>
      </div>
    </main>
  );
}
