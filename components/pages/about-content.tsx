import {
  ArrowRight,
  CircleHelp,
  Eye,
  FileSearch,
  MapPin,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import { PageHero } from '@/components/content/page-hero';
import Link from '@/components/site/internal-link';
import { PrototypeNotice } from '@/components/site/prototype-notice';
import { localizedPath, type Locale } from '@/config/i18n';
import { initialLaunchProvinces } from '@/config/provinces';

const copy = {
  th: {
    eyebrow: 'เกี่ยวกับโครงการ',
    title: 'ช่วยให้เจ้าของบ้านเข้าใจโซลาร์ ก่อนถูกขอให้ตัดสินใจ',
    intro: 'SolarMatch Thailand เป็นเว็บไซต์ต้นแบบอิสระสำหรับช่วยเจ้าของบ้านทำความเข้าใจเศรษฐศาสตร์และข้อสมมติของ Solar Rooftop ก่อนคุยกับผู้ติดตั้ง',
    principles: [
      ['เริ่มจากความชัดเจน', 'บอกให้เห็นว่าส่วนใดเป็นข้อมูล ส่วนใดเป็นสมมติฐาน และส่วนใดยังต้องตรวจหน้างาน'],
      ['ไม่สรุปเกินหลักฐาน', 'แสดงผลเป็นช่วงและไม่อ้างว่าระบบใดดีที่สุดโดยไม่มีข้อมูลบ้านจริง'],
      ['ความยินยอมมาก่อน', 'ผู้ใช้เห็นผลก่อนเสมอ และต้นแบบนี้ยังไม่ส่งข้อมูลให้ผู้ติดตั้ง'],
    ],
    todayEyebrow: 'สิ่งที่ทำได้วันนี้',
    todayTitle: 'เครื่องมือให้ความรู้ ไม่ใช่บริการขายหรือติดตั้ง',
    todayBody: 'ต้นแบบประเมินช่วงขนาดระบบ ผลผลิต มูลค่าจากการใช้ไฟเอง และระยะคืนทุนจากข้อมูลเบื้องต้น พร้อมแสดงสมมติฐาน แหล่งอ้างอิง และข้อจำกัดใกล้กับผล',
    notYetTitle: 'สิ่งที่ยังไม่เปิดใช้งาน',
    notYetItems: ['ยังไม่จับคู่หรือจัดอันดับผู้ติดตั้ง', 'ยังไม่ส่งหรือบันทึกข้อมูลลีด', 'ยังไม่ออกแบบระบบ รับชำระเงิน หรือรับรองผลประหยัด'],
    evidenceTitle: 'สิ่งที่ใช้สร้างความน่าเชื่อถือ',
    evidenceItems: ['วิธีคำนวณที่ตรวจสอบย้อนกลับได้', 'แหล่งข้อมูลจากหน่วยงานและวันที่ตรวจล่าสุด', 'การแยกสิ่งที่ยืนยันแล้วออกจากสิ่งที่ยังเป็นต้นแบบ'],
    scopeEyebrow: 'ขอบเขตระยะแรก',
    scopeTitle: 'เริ่มตรวจสอบตลาดในกรุงเทพฯ และปริมณฑลอย่างตั้งใจ',
    scopeBody: 'ระยะแรกจำกัดพื้นที่เพื่อให้ตรวจสมมติฐาน ความครอบคลุมของผู้ซื้อ และกระบวนการได้อย่างรับผิดชอบ ตัวเลือก “จังหวัดอื่น” ยังคงอยู่เพื่อรับรู้ความสนใจ แต่ไม่ได้หมายความว่ามีผู้ติดตั้งครอบคลุมแล้ว',
    other: 'จังหวัดอื่น',
    statusEyebrow: 'สถานะและการติดต่อ',
    statusTitle: 'กำลังพัฒนาควบคู่กับการสัมภาษณ์ตลาด',
    statusBody: 'เกณฑ์ลีด ราคา การจับคู่ และข้อกำหนดผู้ติดตั้งยังเว้นไว้โดยตั้งใจ ช่องทาง LINE โทรศัพท์ และอีเมลยังไม่เปิดใช้งานจนกว่าจะมีผู้รับผิดชอบและข้อความความยินยอมที่พร้อมใช้จริง',
    contact: 'ดูสถานะช่องทางติดต่อ',
    methodology: 'อ่านวิธีคำนวณและแหล่งข้อมูล',
  },
  en: {
    eyebrow: 'About the project',
    title: 'Helping homeowners understand solar before being asked to decide',
    intro: 'SolarMatch Thailand is an independent early-stage prototype that helps homeowners understand the economics and assumptions behind rooftop solar before speaking with an installer.',
    principles: [
      ['Clarity first', 'Show what is known, what is assumed, and what still requires a site survey.'],
      ['No conclusion beyond the evidence', 'Use ranges and never claim a system is best without information about the actual home.'],
      ['Consent before any referral', 'People see their result first, and this prototype does not send information to installers.'],
    ],
    todayEyebrow: 'What works today',
    todayTitle: 'An educational tool—not an installer or sales service',
    todayBody: 'The prototype estimates ranges for system size, production, direct-use value, and payback from initial information, while keeping assumptions, sources, and limitations close to the result.',
    notYetTitle: 'What is not active',
    notYetItems: ['No installer matching or ranking', 'No lead storage or transmission', 'No system design, payment, or savings guarantee'],
    evidenceTitle: 'How credibility is earned',
    evidenceItems: ['Traceable methodology', 'Primary sources with visible review dates', 'A clear boundary between validated facts and prototype assumptions'],
    scopeEyebrow: 'Initial scope',
    scopeTitle: 'A deliberate Bangkok Metropolitan Region validation area',
    scopeBody: 'The first phase is geographically narrow so assumptions, buyer coverage, and operations can be tested responsibly. “Another province” remains available to understand wider interest, but it does not imply confirmed installer coverage.',
    other: 'Another province',
    statusEyebrow: 'Status and contact',
    statusTitle: 'Being developed alongside market interviews',
    statusBody: 'Lead criteria, pricing, matching, and installer requirements are intentionally deferred. LINE, phone, and email remain inactive until an accountable owner and production-ready consent language exist.',
    contact: 'See contact-channel status',
    methodology: 'Read the methodology and sources',
  },
} as const;

const principleIcons = [Eye, Scale, ShieldCheck];

export function AboutContent({ locale = 'th' }: { locale?: Locale }) {
  const text = copy[locale];
  const link = (path: string) => localizedPath(path, locale);

  return (
    <main>
      <PageHero eyebrow={text.eyebrow} title={text.title}>
        <p>{text.intro}</p>
        <PrototypeNotice locale={locale} />
      </PageHero>

      <section className="site-shell about-grid about-principles">
        {text.principles.map(([title, body], index) => {
          const Icon = principleIcons[index];
          return <article key={title}><Icon aria-hidden="true" /><h2>{title}</h2><p>{body}</p></article>;
        })}
      </section>

      <section className="about-operating-section">
        <div className="site-shell about-operating-grid">
          <article className="about-operating-intro">
            <p className="eyebrow">{text.todayEyebrow}</p>
            <h2>{text.todayTitle}</h2>
            <p>{text.todayBody}</p>
            <Link className="text-link" href={link('/methodology')}>{text.methodology} <ArrowRight size={18} aria-hidden="true" /></Link>
          </article>
          <article className="about-boundary-card">
            <CircleHelp aria-hidden="true" />
            <h3>{text.notYetTitle}</h3>
            <ul>{text.notYetItems.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
          <article className="about-boundary-card">
            <FileSearch aria-hidden="true" />
            <h3>{text.evidenceTitle}</h3>
            <ul>{text.evidenceItems.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
        </div>
      </section>

      <section className="site-shell about-scope-panel">
        <div>
          <p className="eyebrow">{text.scopeEyebrow}</p>
          <h2>{text.scopeTitle}</h2>
          <p>{text.scopeBody}</p>
        </div>
        <ul aria-label={text.scopeTitle}>
          {initialLaunchProvinces.map((province) => <li key={province.value}><MapPin size={17} aria-hidden="true" />{province[locale]}</li>)}
          <li className="scope-other"><MapPin size={17} aria-hidden="true" />{text.other}</li>
        </ul>
      </section>

      <section className="founder-note"><div className="site-shell">
        <p className="eyebrow">{text.statusEyebrow}</p>
        <h2>{text.statusTitle}</h2>
        <p>{text.statusBody}</p>
        <Link className="text-link" href={link('/contact')}>{text.contact} <ArrowRight size={18} aria-hidden="true" /></Link>
      </div></section>
    </main>
  );
}
