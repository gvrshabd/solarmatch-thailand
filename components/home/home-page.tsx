import {
  ArrowRight,
  BarChart3,
  Check,
  Gauge,
  MessageCircle,
} from 'lucide-react';
import { HeroEstimator } from '@/components/home/hero-estimator';
import { TerracePhoto } from '@/components/site/terrace-photo';
import Link from '@/components/site/internal-link';
import { SectionHeading } from '@/components/ui/section-heading';
import { localizedPath, type Locale } from '@/config/i18n';
import { legalReviewDisclosures, prelaunchNotice } from '@/config/legal-review';

type HomeCopy = {
  eyebrow: string;
  titleLead: string;
  titleEmphasis: string;
  lede: string;
  photoAlt: string;
  photoCaption: string;
  example: string;
  exampleNote: string;
  trust: string[];
  introEyebrow: string;
  introTitle: string;
  introBody: string;
  introLink: string;
  processEyebrow: string;
  processTitle: string;
  processBody: string;
  steps: { title: string; body: string }[];
  previewEyebrow: string;
  previewTitle: string;
  previewBody: string;
  before: string;
  after: string;
  previewDisclaimer: string;
  previewCta: string;
  evidenceEyebrow: string;
  evidenceTitle: string;
  evidenceBody: string;
  evidence: { title: string; body: string }[];
  faqEyebrow: string;
  faqTitle: string;
  faq: { question: string; answer: string }[];
  finalTitle: string;
  finalBody: string;
  finalCta: string;
};

const copy: Record<Locale, HomeCopy> = {
  th: {
    eyebrow: 'ประเมิน Solar Rooftop สำหรับบ้านในไทย',
    titleLead: 'ค่าไฟบ้านคุณ',
    titleEmphasis: 'เหมาะกับโซลาร์แค่ไหน?',
    lede: 'ตอบแบบประเมินที่เข้าใจง่ายเพื่อรับผลประเมินเบื้องต้นฟรีสำหรับวางแผน โดยไม่ต้องให้ข้อมูลติดต่อ',
    photoAlt: 'แผงโซลาร์บนหลังคากระเบื้องของบ้านพักอาศัย โดยมีต้นปาล์มอยู่ด้านหลัง',
    photoCaption: 'ภาพโดย Kindel Media ผ่าน Pexels · ใช้ภายใต้สัญญาอนุญาต Pexels',
    example: 'ตัวอย่างผลเพื่อวางแผน',
    exampleNote: 'ไม่ใช่คำสัญญาหรือใบเสนอราคา',
    trust: ['ดูผลโดยไม่ต้องให้ข้อมูลติดต่อ', 'ไม่ต้องอัปโหลดบิล', 'ใช้แบบประเมินได้ฟรี'],
    introEyebrow: 'ก่อนขอราคา',
    introTitle: 'ควรรู้ก่อนว่าบ้านคุณอาจต้องการอะไร',
    introBody: 'SolarMatch จัดข้อมูลพื้นฐานให้เข้าใจง่าย เพื่อให้คุณคุยกับบริษัทโซลาร์ได้อย่างมีคำถามและไม่ต้องเริ่มจากศูนย์',
    introLink: 'ดูว่าเราทำงานอย่างไร',
    processEyebrow: 'เริ่มจากข้อมูลที่รู้',
    processTitle: 'จากค่าไฟหนึ่งใบ สู่คำถามที่ดีขึ้น',
    processBody: 'เครื่องมือนี้ช่วยจัดข้อมูลเบื้องต้น ไม่ได้แทนการสำรวจหน้างานหรือคำแนะนำจากวิศวกร',
    steps: [
      { title: 'ตอบจากสิ่งที่รู้', body: 'จังหวัด ค่าไฟ และรูปแบบการใช้ไฟช่วงกลางวัน โดยไม่ต้องอัปโหลดเอกสาร' },
      { title: 'เตรียมตัวเลขที่ใช้วางแผนได้', body: 'ระบบคำนวณขนาดระบบ ผลผลิต ราคา และเงินประหยัดเบื้องต้นพร้อมอธิบายที่มา' },
      { title: 'เลือกขั้นตอนถัดไปด้วยตัวเอง', body: 'ดูผลประเมินครบถ้วนโดยไม่ให้ข้อมูลติดต่อ และเตรียมคำถามสำหรับการประเมินโดยผู้เชี่ยวชาญ' },
    ],
    previewEyebrow: 'ตัวอย่างการแสดงผล',
    previewTitle: 'เห็นความต่าง—พร้อมเห็นสมมติฐาน',
    previewBody: 'เราไม่แสดงตัวเลขก้อนเดียวโดยไม่อธิบายที่มา ผลจริงจะใช้ข้อมูลค่าไฟ รูปแบบการใช้ไฟ และสภาพหลังคาของคุณ',
    before: 'ค่าไฟปัจจุบัน',
    after: 'หลังติดโซลาร์',
    previewDisclaimer: 'ตัวเลขตัวอย่างเพื่อแสดงรูปแบบหน้าจอ ไม่ใช่ผลของบ้านคุณ',
    previewCta: 'ประเมินจากค่าไฟของฉัน',
    evidenceEyebrow: 'สิ่งที่ตรวจสอบได้ตอนนี้',
    evidenceTitle: 'เชื่อมั่นในวิธีทำงาน ไม่ใช่คำอ้างความนิยม',
    evidenceBody: 'SolarMatch ไม่แสดงรีวิว จำนวนลูกค้า พันธมิตร หรือผลลัพธ์ที่ยังไม่มีหลักฐานตรวจสอบได้',
    evidence: [
      { title: 'ไม่ต้องให้ข้อมูลติดต่อ', body: 'รับผลประเมินฟรีได้โดยไม่ต้องขอรับการติดต่อจากบริษัทติดตั้ง' },
      { title: 'สมมติฐานเปิดเผย', body: 'อัตรา ค่าใช้จ่าย และข้อจำกัดอยู่ใกล้กับผล ไม่ซ่อนในข้อความเล็ก' },
      { title: 'บริการส่งต่อที่วางแผนไว้', body: 'ขณะนี้เว็บไซต์ยังไม่เปิดรับคำขอให้บริษัทติดตั้งติดต่อกลับ' },
      { title: 'ไม่มีความเร่งด่วนปลอม', body: 'ไม่มีนาฬิกานับถอยหลัง โควตาปลอม หรือข้อความกดดัน' },
    ],
    faqEyebrow: 'คำถามที่พบบ่อย',
    faqTitle: 'เริ่มต้นได้โดยไม่ต้องรู้เรื่องโซลาร์มาก่อน',
    faq: [
      { question: 'ผลประเมินนี้แม่นแค่ไหน?', answer: 'เป็นการคัดกรองเบื้องต้นจากค่าไฟและพฤติกรรมการใช้ไฟ ความแม่นยำจะเพิ่มขึ้นเมื่อมีข้อมูลหลังคา โหลดไฟ และการสำรวจหน้างานจริง' },
      { question: 'ต้องกรอกเบอร์ก่อนดูผลไหม?', answer: 'ไม่ต้อง คุณสามารถดูผลประเมินฟรีได้โดยไม่ให้ข้อมูลติดต่อ ขณะนี้เว็บไซต์ยังไม่เปิดรับคำขอให้บริษัทติดตั้งติดต่อกลับ' },
      { question: 'SolarMatch เป็นผู้ติดตั้งหรือไม่?', answer: legalReviewDisclosures.installerRole.th },
      { question: 'ตัวเลขระยะคืนทุนมาจากไหน?', answer: 'แบบจำลองใช้ไฟที่ผลิตและใช้เอง ราคาติดตั้งปัจจุบัน ค่าเสื่อมประสิทธิภาพ และเงินสำรองค่าดูแล โดยไม่นับรายได้ขายไฟ สิทธิภาษี เงินกู้ หรือค่าไฟที่เพิ่มขึ้น ตัวเลขจริงยังต้องยืนยันจากผู้ติดตั้งและข้อมูลบ้าน' },
    ],
    finalTitle: 'เริ่มเข้าใจว่าบ้านคุณอาจต้องการระบบแบบไหน',
    finalBody: 'รับผลประเมินครบถ้วนฟรีโดยไม่ต้องให้ข้อมูลติดต่อ',
    finalCta: 'เริ่มประเมินฟรี',
  },
  en: {
    eyebrow: 'Rooftop solar estimates for homes in Thailand',
    titleLead: 'Is rooftop solar',
    titleEmphasis: 'a good fit for your home?',
    lede: 'Complete a clear assessment to receive a free preliminary planning estimate without providing contact details.',
    photoAlt: 'Solar panels on a tiled residential roof with palm trees in the background',
    photoCaption: 'Photo by Kindel Media via Pexels · used under the Pexels licence',
    example: 'Example planning result',
    exampleNote: 'Not a promise or quotation',
    trust: ['Results without contact details', 'No bill upload required', 'Free assessment'],
    introEyebrow: 'Before requesting a quote',
    introTitle: 'First understand what your home may actually need',
    introBody: 'SolarMatch organizes the basics in plain language, helping you ask better questions instead of starting from zero with a solar company.',
    introLink: 'See how it works',
    processEyebrow: 'Start with what you know',
    processTitle: 'From one electricity bill to better questions',
    processBody: 'This tool organizes initial information. It does not replace a site survey or engineering advice.',
    steps: [
      { title: 'Answer from what you know', body: 'Province, electricity bill, and daytime use—without uploading documents.' },
      { title: 'Prepare a practical planning figure', body: 'The assessment calculates a starting system, production, price, and savings figure with a traceable basis.' },
      { title: 'Choose the next step yourself', body: 'View the full estimate without contact details and prepare questions for a professional assessment.' },
    ],
    previewEyebrow: 'Example result',
    previewTitle: 'See the difference—and the assumptions behind it',
    previewBody: 'We do not show one unexplained magic number. Your result uses your electricity bill, daytime use, and roof information.',
    before: 'Current bill',
    after: 'After solar',
    previewDisclaimer: 'Example figures demonstrate the interface; they are not an estimate for your home.',
    previewCta: 'Estimate from my bill',
    evidenceEyebrow: 'What you can verify today',
    evidenceTitle: 'Trust the process, not popularity claims',
    evidenceBody: 'SolarMatch does not display testimonials, customer counts, partners, or outcomes that cannot be verified.',
    evidence: [
      { title: 'No contact details required', body: 'Receive the free estimate without requesting installer contact.' },
      { title: 'Assumptions are visible', body: 'Rates, costs, and limitations sit close to the result instead of hiding in fine print.' },
      { title: 'Planned referral service', body: 'This website is not currently accepting installer contact requests.' },
      { title: 'No manufactured urgency', body: 'No countdown timers, invented availability, or pressure messages.' },
    ],
    faqEyebrow: 'Frequently asked questions',
    faqTitle: 'Start without already knowing solar',
    faq: [
      { question: 'How accurate is this estimate?', answer: 'It is an initial screen based on electricity cost and usage patterns. Accuracy improves with roof, load, and site-survey information.' },
      { question: 'Do I need to enter a phone number first?', answer: 'No. You can receive the free estimate without contact details. This website is not currently accepting installer contact requests.' },
      { question: 'Is SolarMatch an installer?', answer: legalReviewDisclosures.installerRole.en },
      { question: 'Where does the payback figure come from?', answer: 'The model values electricity produced and used on site, then includes current installation-price references, degradation, and a maintenance/component reserve. Export income, tax relief, finance, and tariff escalation stay outside the planning figure.' },
    ],
    finalTitle: 'Start understanding what kind of system your home may need',
    finalBody: 'Receive the full result free of charge without providing contact details.',
    finalCta: 'Start free estimate',
  },
};

const stepIcons = [Gauge, BarChart3, MessageCircle];

export function HomePage({ locale = 'th' }: { locale?: Locale }) {
  const text = copy[locale];
  const link = (path: string) => localizedPath(path, locale);

  return (
    <main>
      <section className="terrace-hero" id="top">
        <TerracePhoto locale={locale} priority />
        <div className="site-shell terrace-hero-content">
          <p className="eyebrow">{locale === 'en' ? 'HOME SOLAR / BANGKOK & BEYOND' : 'โซลาร์สำหรับบ้าน / กรุงเทพฯ และปริมณฑล'}</p>
          <h1>{locale === 'en' ? <>Get modern.<br /><em>Get solar.</em></> : <>บ้านยุคใหม่<br /><em>เริ่มด้วยโซลาร์</em></>}</h1>
          <p>{text.lede}</p>
          <Link className="button button-gold" href={link('/estimate')}>{text.finalCta}<ArrowRight size={18} aria-hidden="true" /></Link>
          <a className="terrace-hero-secondary" href="#your-estimate">{locale === 'en' ? 'Start with your electricity bill' : 'เริ่มจากค่าไฟบ้านของคุณ'} <ArrowRight size={16} aria-hidden="true" /></a>
        </div>
      </section>

      <div className="terrace-promise-strip"><ul className="site-shell trust-list">{text.trust.map((item) => <li key={item}><Check size={16} aria-hidden="true" />{item}</li>)}</ul></div>
      <div className="site-shell callout"><p>{prelaunchNotice[locale]}</p></div>

      <section className="value-intro"><div className="site-shell value-grid"><div><p className="eyebrow">{text.introEyebrow}</p><h2>{text.introTitle}</h2></div><div className="value-copy"><p>{text.introBody}</p><Link className="text-link" href={link('/how-it-works')}>{text.introLink} <ArrowRight size={18} aria-hidden="true" /></Link></div></div></section>

      <section className="home-process process-editorial"><div className="site-shell"><div className="process-heading"><p className="eyebrow">{text.processEyebrow}</p><h2>{text.processTitle}</h2><p>{text.processBody}</p></div><div className="process-sequence">{text.steps.map((item, index) => { const Icon = stepIcons[index]; return <article key={item.title}><span className="process-number">0{index + 1}</span><Icon aria-hidden="true" /><div><h3>{item.title}</h3><p>{item.body}</p></div></article>; })}</div></div></section>

      <section className="terrace-roof-section"><div className="site-shell terrace-editorial-split"><TerracePhoto locale={locale} solar /><div className="terrace-roof-copy"><p className="eyebrow">{locale === 'en' ? 'A DIFFERENT VIEW OF YOUR ROOF' : 'มองหลังคาบ้านในมุมใหม่'}</p><h2>{locale === 'en' ? 'Space above.\nPossibilities ahead.' : 'พื้นที่บนหลังคา\nกับทางเลือกใหม่ของบ้าน'}</h2><p>{text.previewBody}</p><dl className="terrace-feature-list"><div><dt>{locale === 'en' ? 'Your starting system' : 'ขนาดระบบเบื้องต้น'}</dt><dd>{locale === 'en' ? 'Sized around your bill and likely daytime use.' : 'ประเมินจากค่าไฟและรูปแบบการใช้ไฟช่วงกลางวัน'}</dd></div><div><dt>{locale === 'en' ? 'The full financial picture' : 'เห็นภาพค่าใช้จ่าย'}</dt><dd>{locale === 'en' ? 'Planning price, savings and maintenance assumptions together.' : 'ดูราคาสำหรับวางแผน ผลประหยัด และสมมติฐานค่าดูแลไปด้วยกัน'}</dd></div><div><dt>{locale === 'en' ? 'Room for a closer look' : 'เติมรายละเอียดให้ชัดขึ้น'}</dt><dd>{locale === 'en' ? 'Optional roof details refine your estimate. A site assessment still matters.' : 'รายละเอียดหลังคาช่วยปรับผลประเมินให้ใกล้เคียงขึ้น แต่ยังต้องสำรวจหน้างานจริง'}</dd></div></dl></div></div></section>

      <section className="terrace-starter" id="your-estimate"><div className="site-shell terrace-editorial-split"><div><p className="eyebrow">{locale === 'en' ? 'YOUR HOME. YOUR NUMBERS.' : 'บ้านของคุณ ตัวเลขของคุณ'}</p><h2>{locale === 'en' ? 'A useful first step.\nNot a leap of faith.' : 'เริ่มจากข้อมูล\nไม่ใช่การคาดเดา'}</h2><p>{text.processBody}</p><p className="terrace-small-note">{text.finalBody}</p></div><HeroEstimator locale={locale} /></div></section>

      <section className="terrace-evidence"><div className="site-shell value-grid"><div><p className="eyebrow">{locale === 'en' ? 'BUILT ON A CLEAR BASIS' : 'มีข้อมูลอ้างอิงที่ตรวจสอบได้'}</p><h2>{locale === 'en' ? 'Understand the numbers.\nThen decide.' : 'เข้าใจตัวเลข\nก่อนตัดสินใจ'}</h2></div><div className="value-copy"><p>{locale === 'en' ? 'Published electricity tariffs, long-run solar data and planning-price evidence. See what goes into your estimate—and what it cannot tell you.' : 'อัตราค่าไฟที่ประกาศ ข้อมูลแสงอาทิตย์ระยะยาว และข้อมูลราคาเพื่อวางแผน ดูที่มาของผลประเมิน พร้อมทำความเข้าใจข้อจำกัด'}</p><Link className="text-link" href={link('/methodology')}>{locale === 'en' ? 'Read the methodology' : 'อ่านวิธีคำนวณ'}<ArrowRight size={18} aria-hidden="true" /></Link><Link className="text-link" href={link('/resources')}>{locale === 'en' ? 'Explore the sources' : 'ดูแหล่งข้อมูล'}<ArrowRight size={18} aria-hidden="true" /></Link></div></div></section>

      <section className="faq-section"><div className="site-shell faq-grid"><SectionHeading eyebrow={text.faqEyebrow} title={text.faqTitle} /><div className="faq-list">{text.faq.map((item, index) => <details key={item.question} open={index === 0}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div></div></section>

      <section className="final-cta"><div className="site-shell final-cta-inner"><div><h2>{text.finalTitle}</h2><p>{text.finalBody}</p></div><Link className="button button-gold" href={link('/estimate')}>{text.finalCta} <ArrowRight size={18} aria-hidden="true" /></Link></div></section>
    </main>
  );
}
