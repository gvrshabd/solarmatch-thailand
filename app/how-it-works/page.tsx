import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Calculator, ClipboardList, MessagesSquare } from 'lucide-react';
import { PageHero } from '@/components/content/page-hero';

export const metadata: Metadata = { title: 'วิธีการทำงาน' };
export default function HowItWorksPage() {
  return <main><PageHero eyebrow="How it works" title="เข้าใจบ้านของคุณ ก่อนเริ่มขอราคา"><p>SolarMatch แบ่งข้อมูลที่ซับซ้อนออกเป็นสามช่วง เพื่อให้คุณเห็นสิ่งที่รู้ สิ่งที่ยังต้องตรวจ และคำถามที่ควรถามผู้ติดตั้ง</p></PageHero>
    <section className="site-shell numbered-sections">
      <article><span>01</span><ClipboardList /><div><h2>เล่าจากข้อมูลที่มี</h2><p>ตอบจังหวัด ค่าไฟ พฤติกรรมใช้ไฟ และข้อมูลหลังคาเท่าที่ทราบ ไม่ต้องเดาและไม่ต้องอัปโหลดเอกสาร</p></div></article>
      <article><span>02</span><Calculator /><div><h2>ดูช่วงประมาณการ</h2><p>เครื่องมือใช้สมมติฐานเวอร์ชันต้นแบบเพื่อแสดงช่วงขนาดระบบ ผลผลิต และเงินที่อาจประหยัด พร้อมระดับความมั่นใจ</p></div></article>
      <article><span>03</span><MessagesSquare /><div><h2>ตัดสินใจขั้นต่อไปเอง</h2><p>ผลลัพธ์มาก่อนการติดต่อเสมอ ในอนาคต หากคุณเลือกคุยต่อ จึงค่อยส่งข้อมูลตามความยินยอมที่ชัดเจน</p></div></article>
    </section>
    <section className="content-cta"><div className="site-shell"><h2>พร้อมลองด้วยค่าไฟของคุณ?</h2><Link className="button" href="/estimate">เริ่มประเมิน <ArrowRight size={18} /></Link></div></section>
  </main>;
}
