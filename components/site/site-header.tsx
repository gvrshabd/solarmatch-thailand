'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { BrandMark } from './brand-mark';
import { alternateLanguagePath, isEnglishPath, localizedPath, type Locale } from '@/config/i18n';

const nav = [
  { href: '/estimate', th: 'ประเมินโซลาร์', en: 'Solar estimate' },
  { href: '/how-it-works', th: 'วิธีการทำงาน', en: 'How it works' },
  { href: '/solar-guide', th: 'คู่มือโซลาร์', en: 'Solar guide' },
  { href: '/methodology', th: 'วิธีคำนวณ', en: 'Methodology' },
  { href: '/about', th: 'เกี่ยวกับเรา', en: 'About' },
];

export function SiteHeader() {
  const pathname = usePathname();
  const locale: Locale = isEnglishPath(pathname) ? 'en' : 'th';
  const english = locale === 'en';

  return (
    <header className="site-header">
      <div className="site-shell header-inner">
        <Link className="brand-link" href={localizedPath('/', locale)} aria-label={english ? 'SolarMatch Thailand home' : 'SolarMatch Thailand หน้าหลัก'}>
          <BrandMark />
        </Link>
        <nav className="desktop-nav" aria-label={english ? 'Primary navigation' : 'เมนูหลัก'}>
          {nav.map((item) => <Link key={item.href} href={localizedPath(item.href, locale)}>{item[locale]}</Link>)}
        </nav>
        <div className="header-actions">
          <a className="language-switch" href={alternateLanguagePath(pathname)} aria-label={english ? 'View this page in Thai' : 'View this page in English'}>
            <span className={!english ? 'active-language' : ''}>TH</span><span aria-hidden="true"> / </span><span className={english ? 'active-language' : ''}>EN</span>
          </a>
          <details className="mobile-menu">
            <summary aria-label={english ? 'Open menu' : 'เปิดเมนู'}><Menu size={21} /></summary>
            <nav aria-label={english ? 'Mobile navigation' : 'เมนูมือถือ'}>
              {nav.map((item) => <Link key={item.href} href={localizedPath(item.href, locale)}>{item[locale]}</Link>)}
              <a className="mobile-language-link" href={alternateLanguagePath(pathname)}>{english ? 'ภาษาไทย' : 'English'}</a>
            </nav>
          </details>
          <Link className="button button-small" href={localizedPath('/estimate', locale)}>{english ? 'Free estimate' : 'ประเมินฟรี'}</Link>
        </div>
      </div>
    </header>
  );
}
