'use client';

import Link from '@/components/site/internal-link';
import { usePathname } from 'next/navigation';
import { BrandMark } from './brand-mark';
import { isEnglishPath, localizedPath, type Locale } from '@/config/i18n';

export function SiteFooter() {
  const pathname = usePathname();
  const locale: Locale = isEnglishPath(pathname) ? 'en' : 'th';
  const english = locale === 'en';
  const link = (path: string) => localizedPath(path, locale);
  const focusMode = pathname === '/estimate' || pathname === '/en/estimate';

  if (focusMode) return null;

  return (
    <footer className="site-footer">
      <div className="site-shell footer-grid">
        <div className="footer-brand">
          <BrandMark />
          <p>{english ? 'Helping homeowners understand rooftop solar before speaking with an installer.' : 'ช่วยเจ้าของบ้านเริ่มทำความเข้าใจ Solar Rooftop ก่อนคุยกับผู้ติดตั้ง'}</p>
          <span className="prototype-chip">{english ? 'Prototype website · no live data transfer' : 'เว็บไซต์ต้นแบบ · ยังไม่รับส่งข้อมูลจริง'}</span>
        </div>
        <div>
          <h2>{english ? 'Get started' : 'เริ่มต้น'}</h2>
          <Link href={link('/estimate')}>{english ? 'Solar estimate' : 'ประเมินโซลาร์'}</Link>
          <Link href={link('/how-it-works')}>{english ? 'How it works' : 'วิธีการทำงาน'}</Link>
          <Link href={link('/solar-guide')}>{english ? 'Solar guide' : 'คู่มือโซลาร์'}</Link>
        </div>
        <div>
          <h2>{english ? 'Information' : 'ข้อมูล'}</h2>
          <Link href={link('/methodology')}>{english ? 'Methodology' : 'วิธีคำนวณ'}</Link>
          <Link href={link('/resources')}>{english ? 'Resources' : 'แหล่งข้อมูล'}</Link>
          <Link href={link('/about')}>{english ? 'About' : 'เกี่ยวกับเรา'}</Link>
          <Link href={link('/contact')}>{english ? 'Contact' : 'ติดต่อ'}</Link>
        </div>
        <div>
          <h2>{english ? 'Legal' : 'ข้อกำหนด'}</h2>
          <Link href={link('/privacy')}>{english ? 'Privacy' : 'ความเป็นส่วนตัว'}</Link>
          <Link href={link('/terms')}>{english ? 'Terms of use' : 'ข้อกำหนดการใช้งาน'}</Link>
          <Link href={link('/cookies')}>{english ? 'Cookies' : 'คุกกี้'}</Link>
        </div>
      </div>
      <div className="site-shell footer-bottom">
        <span>{english ? 'All figures are prototype estimates, not quotations.' : 'ตัวเลขทั้งหมดเป็นการประมาณการต้นแบบ ไม่ใช่ใบเสนอราคา'}</span>
      </div>
    </footer>
  );
}
