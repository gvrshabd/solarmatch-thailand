export type Locale = 'th' | 'en';

export const supportedLocales = ['th', 'en'] as const;

export function isEnglishPath(pathname: string) {
  return pathname === '/en' || pathname.startsWith('/en/');
}

export function localizedPath(path: string, locale: Locale) {
  const normalized = path === '/' ? '' : path.startsWith('/') ? path : `/${path}`;
  return locale === 'en' ? `/en${normalized}` : normalized || '/';
}

export function alternateLanguagePath(pathname: string) {
  if (isEnglishPath(pathname)) {
    const thaiPath = pathname.slice(3);
    return thaiPath || '/';
  }
  return localizedPath(pathname, 'en');
}
