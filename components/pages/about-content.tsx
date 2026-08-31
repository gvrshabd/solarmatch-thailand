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
import { localizedPath, type Locale } from '@/config/i18n';
import { initialLaunchProvinces } from '@/config/provinces';

const copy = {
  th: {
    eyebrow: 'เกี่ยวกับโครงการ',
    title: 'ช่วยเจ้าของบ้านเข้าใจโซลาร์ ก่อนเลือกให้บริษัทติดต่อ',
    intro: 'SolarMatch Thailand เป็นธุรกิจสร้างและคัดกรองลูกค้าเป้าหมายสำหรับโซลาร์ที่อยู่อาศัย โดยให้ผลประเมินที่เข้าใจง่ายก่อนขอข้อมูลติดต่อ',
    principles: [
      ['เริ่มจากความชัดเจน', 'บอกให้เห็นว่าส่วนใดเป็นข้อมูล ส่วนใดเป็นสมมติฐาน และส่วนใดยังต้องตรวจหน้างาน'],
      ['ไม่สรุปเกินหลักฐาน', 'แสดงค่าประเมินที่มีที่มา และไม่อ้างว่าระบบใดดีที่สุดโดยไม่มีข้อมูลสถานที่จริง'],
      ['ความยินยอมมาก่อน', 'ผู้ใช้เห็นผลก่อนเสมอ และข้อมูลจะส่งต่อได้เฉพาะเมื่อระบบจริงพร้อมและผู้ใช้ยินยอม'],
    ],
    todayEyebrow: 'สิ่งที่ทำได้วันนี้',
    todayTitle: 'ธุรกิจลูกค้าเป้าหมายที่เริ่มจากประโยชน์ต่อผู้ใช้',
    todayBody: 'ค่าประเมินช่วยให้ลูกค้าเห็นขนาดระบบ ผลผลิต ราคา เงินประหยัด และระยะคืนทุนก่อนกรอกเบอร์ จากนั้นจึงเลือกได้ว่าต้องการให้บริษัทโซลาร์ที่ระบุติดต่อเพื่อนัดประเมินหน้างานหรือไม่',
    notYetTitle: 'สิ่งที่ยังไม่เปิดใช้งาน',
    notYetItems: ['ยังไม่จัดอันดับหรือเปรียบเทียบผู้ติดตั้งหลายราย', 'คำขอติดต่อจะเปิดเมื่อข้อมูลผู้ดำเนินการและบริษัทผู้รับครบถ้วน', 'ไม่มีการออกแบบระบบ รับชำระเงิน หรือรับรองผลประหยัด'],
    evidenceTitle: 'สิ่งที่ใช้สร้างความน่าเชื่อถือ',
    evidenceItems: ['วิธีคำนวณที่ตรวจสอบย้อนกลับได้', 'แหล่งข้อมูลจากหน่วยงานและวันที่ตรวจล่าสุด', 'ไม่สร้างรีวิว พันธมิตร หรือผลลัพธ์ที่ยังไม่มีหลักฐาน'],
    scopeEyebrow: 'ขอบเขตระยะแรก',
    scopeTitle: 'เริ่มตรวจสอบตลาดในกรุงเทพฯ และปริมณฑลอย่างตั้งใจ',
    scopeBody: 'ระยะแรกจำกัดพื้นที่เพื่อให้ตรวจสมมติฐาน ความครอบคลุมของผู้ซื้อ และกระบวนการได้อย่างรับผิดชอบ ตัวเลือก “จังหวัดอื่น” ยังคงอยู่เพื่อรับรู้ความสนใจ แต่ไม่ได้หมายความว่ามีผู้ติดตั้งครอบคลุมแล้ว',
    other: 'จังหวัดอื่น',
    statusEyebrow: 'สถานะและการติดต่อ',
    statusTitle: 'ระบบคัดกรองพร้อมแยกจากการเปิดรับคำขอจริง',
    statusBody: 'แบบประเมินและระบบบริหารใช้กฎที่มีเวอร์ชัน แต่การรับข้อมูลส่วนบุคคลจะปิดไว้จนกว่าจะเผยแพร่ผู้ดำเนินการ บริษัทผู้รับ ช่องทางความเป็นส่วนตัว และระยะเวลาเก็บครบถ้วน',
    contact: 'ดูสถานะช่องทางติดต่อ',
    methodology: 'อ่านวิธีคำนวณและแหล่งข้อมูล',
  },
  en: {
    eyebrow: 'About the project',
    title: 'Helping homeowners understand solar before choosing contact',
    intro: 'SolarMatch Thailand is a residential-solar lead-generation and qualification business. A clear estimate gives customers value before any contact detail is requested.',
    principles: [
      ['Clarity first', 'Show what is known, what is assumed, and what still requires a site survey.'],
      ['No conclusion beyond the evidence', 'Show a traceable planning figure and never claim a system is best without information about the actual property.'],
      ['Consent before any referral', 'People see their result first, and data can only be shared after live matching and consent are ready.'],
    ],
    todayEyebrow: 'What works today',
    todayTitle: 'A lead-generation business that starts with customer value',
    todayBody: 'The estimate gives customers a system size, production, price, savings, and payback before asking for a phone number. They can then decide whether a named solar company should contact them about a site assessment.',
    notYetTitle: 'What is not active',
    notYetItems: ['No multi-installer comparison or ranking', 'Contact requests stay closed until operator and recipient details are complete', 'No system design, payment, or savings guarantee'],
    evidenceTitle: 'How credibility is earned',
    evidenceItems: ['Traceable methodology', 'Primary sources with visible review dates', 'No invented reviews, partners, or outcomes'],
    scopeEyebrow: 'Initial scope',
    scopeTitle: 'A deliberate Bangkok Metropolitan Region validation area',
    scopeBody: 'The first phase is geographically narrow so assumptions, buyer coverage, and operations can be tested responsibly. “Another province” remains available to understand wider interest, but it does not imply confirmed installer coverage.',
    other: 'Another province',
    statusEyebrow: 'Status and contact',
    statusTitle: 'Qualification is separated from public activation',
    statusBody: 'The assessment and administration system use versioned rules, while personal-information submission stays disabled until the operator, receiving company, privacy channel, and retention period are fully published.',
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
