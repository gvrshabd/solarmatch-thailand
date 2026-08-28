import Link from '@/components/site/internal-link';
import { ArrowRight, Calculator, ClipboardList, MessagesSquare } from 'lucide-react';
import { PageHero } from '@/components/content/page-hero';
import { thaiMetadata } from '@/lib/seo/localized-metadata';

export const metadata = thaiMetadata('วิธีการทำงาน', '/how-it-works');
export default function HowItWorksPage() {
  return <main><PageHero eyebrow="How it works" title="เข้าใจบ้านของคุณ ก่อนเริ่มขอราคา"><p>SolarMatch แบ่งข้อมูลที่ซับซ้อนออกเป็นสามช่วง เพื่อให้คุณเห็นสิ่งที่รู้ สิ่งที่ยังต้องตรวจ และคำถามที่ควรถามผู้ติดตั้ง</p></PageHero>
    <section className="site-shell numbered-sections">
      <article><span>01</span><ClipboardList /><div><h2>เล่าจากข้อมูลที่มี</h2><p>ตอบจังหวัด ค่าไฟ พฤติกรรมใช้ไฟ และข้อมูลหลังคาเท่าที่ทราบ ไม่ต้องเดาและไม่ต้องอัปโหลดเอกสาร</p></div></article>
      <article><span>02</span><Calculator /><div><h2>ดูตัวเลขเพื่อวางแผน</h2><p>รับขนาดระบบเริ่มต้น ผลผลิต ราคา เงินประหยัด และระยะคืนทุนจากคำตอบทั้งแปดข้อ โดยมีวิธีคำนวณและแหล่งข้อมูลให้ตรวจสอบ</p></div></article>
      <article><span>03</span><MessagesSquare /><div><h2>เตรียมเปรียบเทียบผู้ติดตั้ง</h2><p>เห็นผลก่อนกรอกเบอร์ แล้วจึงเลือกว่าต้องการให้ SolarMatch ช่วยคัดกรองและเชื่อมต่อกับผู้ติดตั้งเมื่อระบบจับคู่เปิดรับคำขอหรือไม่</p></div></article>
    </section>
    <section className="content-cta"><div className="site-shell"><h2>พร้อมลองด้วยค่าไฟของคุณ?</h2><Link className="button" href="/estimate">เริ่มประเมิน <ArrowRight size={18} /></Link></div></section>
  </main>;
}
