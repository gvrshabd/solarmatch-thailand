import Link from 'next/link';
import { localizedPath, type Locale } from '@/config/i18n';

const legalReferences = {
  'Privacy Notice': '/privacy',
  'ประกาศความเป็นส่วนตัว': '/privacy',
  'Terms of Use': '/terms',
  'ข้อกำหนดการใช้บริการ': '/terms',
  'Cookie Policy': '/cookies',
  'นโยบายคุกกี้': '/cookies',
} as const;

/** Link only actual legal routes while preserving every supplied text character. */
export function LegalText({ text, locale, openInNewTab = false }: { text: string; locale: Locale; openInNewTab?: boolean }) {
  return text.split(/(Privacy Notice|ประกาศความเป็นส่วนตัว|Terms of Use|ข้อกำหนดการใช้บริการ|Cookie Policy|นโยบายคุกกี้)/u)
    .map((part, index) => part in legalReferences
      ? <Link key={index} href={localizedPath(legalReferences[part as keyof typeof legalReferences], locale)} target={openInNewTab ? '_blank' : undefined} rel={openInNewTab ? 'noopener' : undefined}>{part}</Link>
      : part);
}
