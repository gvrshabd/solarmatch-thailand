import Link from '@/components/site/internal-link';

export default function NotFound() {
  return <main className="empty-result"><div className="site-shell"><p className="eyebrow">404</p><h1>ไม่พบหน้าที่คุณกำลังหา</h1><p>ลิงก์นี้อาจไม่ถูกต้องหรือหน้านี้ยังไม่พร้อมใช้งาน</p><Link className="button" href="/">กลับหน้าหลัก</Link></div></main>;
}
