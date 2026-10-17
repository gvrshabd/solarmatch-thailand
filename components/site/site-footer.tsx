'use client';

import Link from '@/components/site/internal-link';
import { usePathname } from 'next/navigation';
import { BrandMark } from './brand-mark';
import { isEnglishPath, localizedPath, type Locale } from '@/config/i18n';
import { legalReviewDisclosures, prelaunchNotice } from '@/config/legal-review';

export function SiteFooter() {
  const pathname = usePathname();
  const locale: Locale = isEnglishPath(pathname) ? 'en' : 'th';
  const english = locale === 'en';
  const link = (path: string) => localizedPath(path, locale);
  const focusMode = pathname === '/estimate' || pathname === '/en/estimate';

  if (focusMode || pathname.startsWith('/admin') || pathname.startsWith('/installers') || pathname === '/enquiry') return null;

  return (
    <footer className="site-footer footer">
      <div className="wrap footer-grid-v3">
        <div className="footer-brand">
          <BrandMark />
          <p>{english ? 'A free residential solar planning estimate for Thai homeowners.' : 'ผลประเมินโซลาร์เบื้องต้นฟรีเพื่อวางแผนสำหรับเจ้าของบ้านในไทย'}</p>
        </div>
        <div>
          <h2>SolarMatch</h2>
          <Link href={link('/estimate')}>{english ? 'Solar estimate' : 'ประเมินโซลาร์'}</Link>
          <Link href={link('/how-it-works')}>{english ? 'How it works' : 'วิธีการทำงาน'}</Link>
          <Link href={link('/methodology')}>{english ? 'Methodology' : 'วิธีคำนวณ'}</Link>
          <Link href={link('/solar-guide')}>{english ? 'Solar guide' : 'คู่มือโซลาร์'}</Link>
        </div>
        <div>
          <h2>{english ? 'Company' : 'บริษัท'}</h2>
          <Link href={'/installers' + (english ? '?lang=en' : '')}>{english ? 'For solar installers' : 'สำหรับบริษัทติดตั้งโซลาร์'}</Link>
          <Link href={link('/contact')}>{english ? 'Contact' : 'ติดต่อ'}</Link>
          <Link href={link('/privacy')}>{english ? 'Privacy Notice' : 'ประกาศความเป็นส่วนตัว'}</Link>
          <Link href={link('/terms')}>{english ? 'Terms of Use' : 'ข้อกำหนดการใช้บริการ'}</Link>
        </div>
      </div>
      <div className="site-shell footer-bottom">
        <div><span>{english ? 'All figures are preliminary estimates, not quotations. Contact requests are not currently available.' : 'ตัวเลขทั้งหมดเป็นค่าประเมินเบื้องต้น ไม่ใช่ใบเสนอราคา ขณะนี้ยังไม่เปิดรับคำขอติดต่อ'}</span>
          <p>{legalReviewDisclosures.operator[locale]}</p>
          <details className="footer-service-details"><summary>{english ? 'About this service' : 'เกี่ยวกับบริการนี้'}</summary><p>{prelaunchNotice[locale]}</p></details>
          <div className="footer-service-links"><Link href={link('/cookies')}>{english ? 'Cookie and Browser Storage Policy' : 'นโยบายคุกกี้และพื้นที่จัดเก็บของเบราว์เซอร์'}</Link><Link href={link('/resources')}>{english ? 'Sources and resources' : 'แหล่งข้อมูลอ้างอิง'}</Link></div>
        </div>
      </div>
    </footer>
  );
}
