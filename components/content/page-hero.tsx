import type { ReactNode } from 'react';

export function PageHero({ eyebrow, title, children, aside }: { eyebrow: string; title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="page-hero">
      <div className="site-shell page-hero-grid">
        <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><div className="page-hero-lede">{children}</div></div>
        {aside && <aside>{aside}</aside>}
      </div>
    </section>
  );
}
