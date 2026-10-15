'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { isEnglishPath } from '@/config/i18n';

export function LanguageDocumentSync() {
  const pathname = usePathname();
  const english = isEnglishPath(pathname);

  useEffect(() => {
    if (pathname.startsWith('/installers') || pathname === '/enquiry') return;
    document.documentElement.lang = english ? 'en' : 'th';
  }, [english, pathname]);

  // The portal supplies its own localized skip link and language lifecycle.
  // Do not place a second, Thai-only public-layout link before that control.
  if (pathname.startsWith('/installers')) return null;
  return <a className="skip-link" href="#main-content">{english ? 'Skip to main content' : 'ข้ามไปยังเนื้อหาหลัก'}</a>;
}
