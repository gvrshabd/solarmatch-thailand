'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { isEnglishPath } from '@/config/i18n';

export function LanguageDocumentSync() {
  const pathname = usePathname();
  const english = isEnglishPath(pathname);

  useEffect(() => {
    document.documentElement.lang = english ? 'en' : 'th';
  }, [english]);

  return <a className="skip-link" href="#main-content">{english ? 'Skip to main content' : 'ข้ามไปยังเนื้อหาหลัก'}</a>;
}
