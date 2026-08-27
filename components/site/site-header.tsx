import Link from 'next/link';
import { Menu } from 'lucide-react';
import { BrandMark } from './brand-mark';

const nav = [
  { href: '/estimate', label: 'ประเมินโซลาร์' },
  { href: '/how-it-works', label: 'วิธีการทำงาน' },
  { href: '/solar-guide', label: 'คู่มือโซลาร์' },
  { href: '/methodology', label: 'วิธีคำนวณ' },
  { href: '/about', label: 'เกี่ยวกับเรา' },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-shell header-inner">
        <Link className="brand-link" href="/" aria-label="SolarMatch Thailand หน้าหลัก">
          <BrandMark />
        </Link>
        <nav className="desktop-nav" aria-label="เมนูหลัก">
          {nav.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
        </nav>
        <div className="header-actions">
          <button className="language-switch" type="button" aria-label="ภาษาอังกฤษยังอยู่ระหว่างจัดทำ" title="English version coming later">
            <strong>TH</strong><span> / EN</span>
          </button>
          <details className="mobile-menu">
            <summary aria-label="เปิดเมนู"><Menu size={21} /></summary>
            <nav aria-label="เมนูมือถือ">
              {nav.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
            </nav>
          </details>
          <Link className="button button-small" href="/estimate">ประเมินฟรี</Link>
        </div>
      </div>
    </header>
  );
}
