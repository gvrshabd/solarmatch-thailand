import Link from 'next/link';
import { BrandMark } from './brand-mark';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-shell footer-grid">
        <div className="footer-brand">
          <BrandMark />
          <p>ช่วยเจ้าของบ้านเริ่มทำความเข้าใจ Solar Rooftop ก่อนคุยกับผู้ติดตั้ง</p>
          <span className="prototype-chip">เว็บไซต์ต้นแบบ · ยังไม่รับส่งข้อมูลจริง</span>
        </div>
        <div>
          <h2>เริ่มต้น</h2>
          <Link href="/estimate">ประเมินโซลาร์</Link>
          <Link href="/how-it-works">วิธีการทำงาน</Link>
          <Link href="/solar-guide">คู่มือโซลาร์</Link>
        </div>
        <div>
          <h2>ข้อมูล</h2>
          <Link href="/methodology">วิธีคำนวณ</Link>
          <Link href="/resources">แหล่งข้อมูล</Link>
          <Link href="/about">เกี่ยวกับเรา</Link>
          <Link href="/contact">ติดต่อ</Link>
        </div>
        <div>
          <h2>ข้อกำหนด</h2>
          <Link href="/privacy">ความเป็นส่วนตัว</Link>
          <Link href="/terms">ข้อกำหนดการใช้งาน</Link>
          <Link href="/cookies">คุกกี้</Link>
        </div>
      </div>
      <div className="site-shell footer-bottom">
        <span>© 2026 SolarMatch Thailand</span>
        <span>ตัวเลขทั้งหมดเป็นการประมาณการต้นแบบ ไม่ใช่ใบเสนอราคา</span>
      </div>
    </footer>
  );
}
