'use client';

import Link from '@/components/site/internal-link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, type MouseEvent } from 'react';
import { Menu, X } from 'lucide-react';
import { BrandMark } from './brand-mark';
import { alternateLanguagePath, isEnglishPath, localizedPath, type Locale } from '@/config/i18n';

const nav = [
  { href: '/how-it-works', th: 'วิธีการทำงาน', en: 'How it works' },
  { href: '/#trust', th: 'ทำไมเชื่อถือได้', en: 'Why trust us' },
  { href: '/installers', th: 'สำหรับผู้ติดตั้ง', en: 'For installers' },
];

function LanguageSwitch({locale,pathname}:{locale:Locale;pathname:string}) {
  const alternate=alternateLanguagePath(pathname);
  return <div className="lang" role="group" aria-label="Language"><a href={locale==='th'?pathname:alternate} lang="th" aria-current={locale==='th'?'true':undefined}>ไทย</a><a href={locale==='en'?pathname:alternate} lang="en" aria-current={locale==='en'?'true':undefined}>EN</a></div>;
}

function closeMobileMenu(event: MouseEvent<HTMLAnchorElement>) {
  event.currentTarget.closest('details')?.removeAttribute('open');
}

export function SiteHeader() {
  const menuRef = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();
  useEffect(() => { menuRef.current?.setAttribute('data-interactive-ready', 'true'); }, [pathname]);
  const locale: Locale = isEnglishPath(pathname) ? 'en' : 'th';
  const english = locale === 'en';
  const focusMode = pathname === '/estimate' || pathname === '/en/estimate';
  const isCurrent = (href: string) => pathname === localizedPath(href, locale);
  const navHref=(href:string)=>href==='/installers'?'/installers?lang='+locale:href==='/#trust'?localizedPath('/',locale)+'#trust':localizedPath(href,locale);

  if (pathname.startsWith('/admin') || pathname.startsWith('/installers') || pathname === '/enquiry') return null;

  if (focusMode) {
    return (
      <header className="site-header focus-header hdr">
        <div className="site-shell header-inner">
          <Link className="brand-link" href={localizedPath('/', locale)} aria-label={english ? 'SolarMatch Thailand home' : 'SolarMatch Thailand หน้าหลัก'}>
            <BrandMark />
          </Link>
          <div className="focus-header-actions">
            <LanguageSwitch locale={locale} pathname={pathname}/>
            <Link className="focus-exit" href={localizedPath('/', locale)} aria-label={english ? 'Exit estimate' : 'ออกจากแบบประเมิน'}>
              <span className="focus-exit-label">{english ? 'Exit estimate' : 'ออกจากแบบประเมิน'}</span> <X size={18} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="site-header hdr">
      <div className="site-shell header-inner wrap">
        <Link className="brand-link" href={localizedPath('/', locale)} aria-label={english ? 'SolarMatch Thailand home' : 'SolarMatch Thailand หน้าหลัก'}>
          <BrandMark />
        </Link>
        <nav className="desktop-nav nav" aria-label={english ? 'Primary navigation' : 'เมนูหลัก'}>
          {nav.map((item) => <Link key={item.href} href={navHref(item.href)} aria-current={isCurrent(item.href) ? 'page' : undefined}>{item[locale]}</Link>)}
        </nav>
        <div className="header-actions">
          <LanguageSwitch locale={locale} pathname={pathname}/>
          <details ref={menuRef} className="mobile-menu" suppressHydrationWarning onKeyDown={(event) => {
            if (event.key === 'Escape' && menuRef.current?.open) {
              event.preventDefault();
              menuRef.current.open = false;
              menuRef.current.querySelector('summary')?.focus();
            }
          }}>
            <summary aria-label={english ? 'Open menu' : 'เปิดเมนู'}><Menu size={21} /></summary>
            <nav aria-label={english ? 'Mobile navigation' : 'เมนูมือถือ'}>
              <button className="terrace-menu-close" type="button" onClick={() => { if (menuRef.current) { menuRef.current.open = false; menuRef.current.querySelector('summary')?.focus(); } }}>{english ? 'Close menu' : 'ปิดเมนู'}<X size={18} aria-hidden="true" /></button>
              {nav.map((item) => <Link key={item.href} href={navHref(item.href)} aria-current={isCurrent(item.href) ? 'page' : undefined} onClick={closeMobileMenu}>{item[locale]}</Link>)}
              <Link className="mobile-menu-cta" href={localizedPath('/estimate', locale)} onClick={closeMobileMenu}>{english ? 'Start free estimate' : 'เริ่มประเมินฟรี'}</Link>
              <a className="mobile-language-link" href={alternateLanguagePath(pathname)} onClick={closeMobileMenu}>{english ? 'ภาษาไทย' : 'English'}</a>
            </nav>
          </details>
          <Link className="button button-small hdr-cta" href={localizedPath('/estimate', locale)}>{english ? 'Free estimate' : 'ประเมินฟรี'}</Link>
        </div>
      </div>
    </header>
  );
}
