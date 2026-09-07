import type { ReactNode } from 'react';

export function SectionHeading({ eyebrow, title, children, align = 'left' }: { eyebrow: string; title: string; children?: ReactNode; align?: 'left' | 'center' }) {
  return (
    <div className={`section-heading ${align === 'center' ? 'center' : ''}`}>
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {children && <div className="section-lede">{children}</div>}
    </div>
  );
}
