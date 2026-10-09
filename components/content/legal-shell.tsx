import type { ReactNode } from 'react';
import type { Locale } from '@/config/i18n';

export function LegalShell({ title, children, locale = 'th', updated = null, version, dateLabel }: { title: string; children: ReactNode; locale?: Locale; updated?: string | null; version?: string; dateLabel?: string }) {
  const english = locale === 'en';
  return (
    <main className="legal-page">
      <div className="site-shell legal-shell">
        <header><h1>{title}</h1><p className="updated-date">{dateLabel ?? (english ? 'Effective date' : 'มีผลบังคับใช้')}: {updated ?? (english ? '[EFFECTIVE_DATE_EN]' : '[EFFECTIVE_DATE_TH]')}</p>{version && <p className="updated-date">{english ? 'Version:' : 'ฉบับที่:'} {version}</p>}</header>
        <article className="prose">{children}</article>
      </div>
    </main>
  );
}
