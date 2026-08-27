import Link from 'next/link';
import { ArrowRight, Check, ClipboardCheck, FileSearch, MessageCircle, ShieldCheck, SunMedium, Zap } from 'lucide-react';
import { HeroEstimator } from '@/components/home/hero-estimator';
import { PrototypeNotice } from '@/components/site/prototype-notice';
import { SectionHeading } from '@/components/ui/section-heading';

const trustItems = [
  'ดูผลก่อนกรอกเบอร์',
  'ไม่ต้องอัปโหลดบิล',
  'ไม่มีค่าใช้จ่ายสำหรับเจ้าของบ้าน',
];

export default function Home() {
  return (
    <main>
      <section className="hero" id="top">
        <div className="site-shell hero-grid">
          <div className="hero-copy">
            <p className="eyebrow"><SunMedium size={16} aria-hidden="true" /> ประเมิน Solar Rooftop สำหรับบ้านในไทย</p>
            <h1>ค่าไฟบ้านคุณ<br /><em>เหมาะกับโซลาร์แค่ไหน?</em></h1>
            <p className="hero-lede">
              ประเมินขนาดระบบและช่วงเงินที่อาจประหยัดได้เบื้องต้น ก่อนตัดสินใจคุยกับผู้ติดตั้ง
            </p>
            <PrototypeNotice compact />
            <HeroEstimator />
            <ul className="trust-list" aria-label="ข้อมูลสำคัญ">
              {trustItems.map((item) => (
                <li key={item}><Check size={16} aria-hidden="true" />{item}</li>
              ))}
            </ul>
          </div>

          <div className="hero-visual" aria-label="ภาพตัวอย่างบ้านไทยสมัยใหม่พร้อมโซลาร์รูฟท็อป">
            <div className="sun-orbit" aria-hidden="true" />
            <div className="visual-caption">
              <span>เริ่มจากข้อมูลที่คุณมี</span>
              <strong>ค่าไฟ + รูปแบบการใช้ไฟ</strong>
            </div>
            <div className="roof-form" aria-hidden="true">
              <div className="roof-plane roof-plane-one" />
              <div className="roof-plane roof-plane-two" />
              <div className="house-wall" />
            </div>
            <div className="result-peek">
              <span>ตัวอย่างผลประเมิน</span>
              <strong>3–5 <small>kW</small></strong>
              <p>แสดงเป็นช่วง ไม่ใช่ตัวเลขสัญญา</p>
            </div>
          </div>
        </div>
      </section>

      <section className="value-intro" id="how">
        <div className="site-shell value-grid">
          <div>
            <p className="eyebrow">ก่อนขอราคา</p>
            <h2>ควรรู้ก่อนว่าบ้านคุณต้องการอะไร</h2>
          </div>
          <div className="value-copy">
            <p>SolarMatch ช่วยจัดข้อมูลพื้นฐานให้เข้าใจง่าย เพื่อให้คุณคุยกับผู้ติดตั้งได้อย่างมีคำถามและไม่ต้องเริ่มจากศูนย์</p>
            <Link className="text-link" href="/how-it-works">ดูว่าเราทำงานอย่างไร <ArrowRight size={18} aria-hidden="true" /></Link>
          </div>
        </div>
      </section>

      <section className="home-process">
        <div className="site-shell">
          <SectionHeading eyebrow="ง่ายในไม่กี่นาที" title="จากค่าไฟหนึ่งใบ สู่คำถามที่ดีขึ้น" align="center">
            <p>เครื่องมือนี้ช่วยจัดข้อมูลเบื้องต้น ไม่ได้แทนการสำรวจหน้างานหรือคำแนะนำจากวิศวกร</p>
          </SectionHeading>
          <div className="process-grid">
            <article><span>01</span><ClipboardCheck /><h3>ตอบจากสิ่งที่รู้</h3><p>จังหวัด ค่าไฟ และรูปแบบการใช้ไฟช่วงกลางวัน ไม่ต้องอัปโหลดเอกสาร</p></article>
            <article><span>02</span><FileSearch /><h3>เห็นผลเป็นช่วง</h3><p>ดูขนาดระบบ ผลผลิต และการประหยัดแบบช่วง เพื่อสะท้อนความไม่แน่นอน</p></article>
            <article><span>03</span><MessageCircle /><h3>ค่อยเลือกว่าจะคุยต่อไหม</h3><p>คุณเห็นผลก่อนเสมอ การติดต่อเป็นขั้นตอนแยกและยังปิดไว้ในต้นแบบนี้</p></article>
          </div>
        </div>
      </section>

      <section className="principles-section">
        <div className="site-shell principles-grid">
          <div className="principles-visual" aria-hidden="true">
            <div className="energy-line line-one" /><div className="energy-line line-two" />
            <div className="principle-orb"><SunMedium /><strong>เข้าใจ</strong><span>ก่อนตัดสินใจ</span></div>
          </div>
          <div>
            <SectionHeading eyebrow="ออกแบบเพื่อเจ้าของบ้าน" title="ตัวเลขที่อธิบายที่มาได้">
              <p>เราเลือกแสดงสมมติฐาน ข้อจำกัด และระดับความมั่นใจไว้ใกล้กับผลลัพธ์</p>
            </SectionHeading>
            <ul className="principle-list">
              <li><ShieldCheck /><span><strong>ไม่สร้างความเร่งด่วนปลอม</strong><small>ไม่มีนาฬิกานับถอยหลังหรือข้อความกดดันให้กรอกข้อมูล</small></span></li>
              <li><Zap /><span><strong>ไม่ซ่อนสิ่งที่ยังไม่รู้</strong><small>ผลขายไฟ ภาษี และระยะคืนทุนยังไม่รวมจนกว่าจะยืนยันข้อมูล</small></span></li>
              <li><Check /><span><strong>เปลี่ยนสมมติฐานได้ง่าย</strong><small>เครื่องคำนวณและเนื้อหาถูกแยกเป็นโมดูลสำหรับปรับหลังการวิจัย</small></span></li>
            </ul>
          </div>
        </div>
      </section>

      <section className="faq-section">
        <div className="site-shell faq-grid">
          <SectionHeading eyebrow="คำถามที่พบบ่อย" title="เริ่มต้นแบบไม่ต้องรู้เรื่องโซลาร์มาก่อน" />
          <div className="faq-list">
            <details open><summary>ผลประเมินนี้แม่นแค่ไหน?</summary><p>เป็นการคัดกรองเบื้องต้นจากค่าไฟและพฤติกรรมการใช้ไฟ ความแม่นยำจะเพิ่มขึ้นเมื่อมีข้อมูลหลังคา โหลดไฟ และการสำรวจหน้างานจริง</p></details>
            <details><summary>ต้องกรอกเบอร์ก่อนดูผลไหม?</summary><p>ไม่ต้อง คุณจะเห็นผลประมาณการก่อน แบบฟอร์มติดต่ออยู่หลังผลและเป็นเพียงต้นแบบที่ไม่บันทึกข้อมูลในตอนนี้</p></details>
            <details><summary>SolarMatch เป็นผู้ติดตั้งหรือไม่?</summary><p>ไม่ใช่ผู้ติดตั้ง เว็บไซต์นี้กำลังทดสอบเครื่องมือช่วยเจ้าของบ้านทำความเข้าใจความต้องการก่อนพูดคุยกับผู้ให้บริการ</p></details>
            <details><summary>ทำไมยังไม่คำนวณระยะคืนทุน?</summary><p>ราคาติดตั้ง รูปแบบประกัน การบำรุงรักษา และนโยบายมีผลมาก เราจะไม่แสดงตัวเลขนี้จนกว่าสมมติฐานตลาดจะผ่านการตรวจสอบ</p></details>
          </div>
        </div>
      </section>

      <section className="final-cta"><div className="site-shell final-cta-inner"><div><p className="eyebrow">ใช้เวลาประมาณ 3 นาที</p><h2>เริ่มเข้าใจว่าบ้านคุณอาจต้องการระบบแบบไหน</h2><p>ดูผลก่อนกรอกข้อมูลติดต่อ และกลับมาแก้คำตอบได้เสมอ</p></div><Link className="button button-gold" href="/estimate">เริ่มประเมินฟรี <ArrowRight size={18} /></Link></div></section>
    </main>
  );
}
