import type { ReactNode } from 'react';
import type { Locale } from '@/config/i18n';

export function LegalShell({ title, children, locale = 'th', updated = null }: { title: string; children: ReactNode; locale?: Locale; updated?: string | null }) {
  const english = locale === 'en';
  return (
    <main className="legal-page">
      <div className="site-shell legal-shell">
        <header><h1>{title}</h1><p className="updated-date">{english ? 'Effective date:' : 'มีผลบังคับใช้:'} {updated ?? (english ? '[EFFECTIVE DATE EN]' : '[EFFECTIVE DATE TH]')}</p></header>
        <article className="prose">{children}</article>
      </div>
    </main>
  );
}
