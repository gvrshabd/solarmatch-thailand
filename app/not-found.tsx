import Link from 'next/link';

export default function NotFound() {
  return <main className="empty-result"><div className="site-shell"><p className="eyebrow">404</p><h1>ไม่พบหน้าที่คุณกำลังหา</h1><p>ลิงก์นี้อาจยังไม่พร้อมในเว็บไซต์ต้นแบบ</p><Link className="button" href="/">กลับหน้าหลัก</Link></div></main>;
}
