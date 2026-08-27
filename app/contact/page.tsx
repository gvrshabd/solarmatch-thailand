import { Mail, MessageCircle, Phone } from 'lucide-react';
import { PageHero } from '@/components/content/page-hero';
import { PrototypeNotice } from '@/components/site/prototype-notice';
import { thaiMetadata } from '@/lib/seo/localized-metadata';

export const metadata = thaiMetadata('ติดต่อ', '/contact');
export default function ContactPage() {
  return <main><PageHero eyebrow="Contact" title="ช่องทางติดต่อยังไม่เปิดใช้งาน"><p>เราเตรียมโครงสร้างไว้แล้ว แต่จะไม่แสดง LINE เบอร์โทร หรืออีเมลจริง จนกว่าจะกำหนดผู้รับผิดชอบและข้อความความยินยอมครบถ้วน</p></PageHero>
    <section className="site-shell contact-layout"><div className="contact-cards"><article><MessageCircle /><div><h2>LINE Official Account</h2><p>รอเชื่อมบัญชีและตรวจข้อความอัตโนมัติ</p></div><button disabled>ยังไม่เปิดใช้งาน</button></article><article><Phone /><div><h2>โทรศัพท์</h2><p>รอกำหนดเวลาทำการและผู้รับสาย</p></div><button disabled>ยังไม่เปิดใช้งาน</button></article><article><Mail /><div><h2>อีเมล</h2><p>รอกำหนดกล่องรับเรื่องและนโยบายการเก็บข้อมูล</p></div><button disabled>ยังไม่เปิดใช้งาน</button></article></div><aside className="line-placeholder"><PrototypeNotice /><div className="qr-placeholder" aria-label="พื้นที่สำหรับ QR Code LINE ในอนาคต"><span>LINE QR</span><small>placeholder</small></div><p>เมื่อเปิดใช้งาน ปุ่มและ QR จะถูกควบคุมจากค่าเดียวใน <code>config/site.ts</code></p></aside></section>
  </main>;
}
