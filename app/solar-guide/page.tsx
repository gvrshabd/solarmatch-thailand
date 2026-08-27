import type { Metadata } from 'next';
import Link from '@/components/site/internal-link';
import { ArrowRight } from 'lucide-react';
import { PageHero } from '@/components/content/page-hero';

export const metadata: Metadata = { title: 'คู่มือ Solar Rooftop สำหรับบ้าน' };
export default function SolarGuidePage() {
  return <main><PageHero eyebrow="Solar guide" title="Solar Rooftop เริ่มจากการใช้ไฟ ไม่ใช่แค่พื้นที่หลังคา"><p>ระบบที่เหมาะกับบ้านหนึ่งหลังขึ้นกับหลายอย่าง คู่มือนี้อธิบายกรอบคิดเบื้องต้นโดยไม่ชี้นำยี่ห้อหรือผู้ติดตั้ง</p></PageHero>
    <section className="site-shell guide-layout"><nav className="guide-index" aria-label="สารบัญ"><strong>ในหน้านี้</strong><a href="#daytime">ไฟช่วงกลางวัน</a><a href="#roof">หลังคาและเงา</a><a href="#size">ขนาดระบบ</a><a href="#quotes">ก่อนเปรียบเทียบราคา</a></nav>
      <article className="prose guide-prose"><section id="daytime"><p className="eyebrow">01 · พฤติกรรม</p><h2>ไฟที่ใช้ช่วงกลางวันมีความสำคัญ</h2><p>แผงผลิตไฟขณะมีแสงแดด บ้านที่เปิดแอร์ ใช้ปั๊ม หรือทำงานที่บ้านในเวลากลางวันจึงอาจใช้ไฟจากระบบได้เองมากกว่าบ้านที่ใช้ไฟหลักช่วงค่ำ</p></section><section id="roof"><p className="eyebrow">02 · หน้างาน</p><h2>พื้นที่ไม่ได้บอกทุกอย่าง</h2><p>ทิศ ความลาด วัสดุ เงาจากต้นไม้หรืออาคาร และความแข็งแรงของโครงสร้างล้วนมีผล การสำรวจโดยผู้เชี่ยวชาญยังจำเป็นก่อนออกแบบจริง</p></section><section id="size"><p className="eyebrow">03 · ขนาด</p><h2>ใหญ่กว่าไม่ได้แปลว่าเหมาะกว่าเสมอ</h2><p>การติดตั้งเกินรูปแบบการใช้ไฟอาจทำให้พลังงานส่วนหนึ่งไม่ได้สร้างมูลค่าอย่างที่คาด โดยเฉพาะเมื่อเงื่อนไขขายไฟและอัตรารับซื้อมีข้อจำกัด</p></section><section id="quotes"><p className="eyebrow">04 · เปรียบเทียบ</p><h2>ขอให้ข้อเสนออธิบายสิ่งเดียวกัน</h2><p>ควรดูขนาด DC/AC รุ่นอุปกรณ์ การรับประกัน สมมติฐานผลผลิต งานโครงสร้าง มาตรฐานติดตั้ง การติดตามผล และรายการที่ไม่รวม ไม่ใช่เพียงยอดรวมหน้าแรก</p><div className="callout"><strong>ข้อควรรู้</strong><p>SolarMatch ยังไม่ได้ตรวจสอบหรือรับรองผู้ติดตั้งรายใด และยังไม่มีระบบเปรียบเทียบข้อเสนอจริง</p></div></section></article>
    </section><section className="content-cta"><div className="site-shell"><h2>ลองแปลงค่าไฟเป็นช่วงขนาดระบบ</h2><Link className="button" href="/estimate">เริ่มประเมิน <ArrowRight size={18} /></Link></div></section>
  </main>;
}
