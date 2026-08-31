import {
  ArrowRight,
  BarChart3,
  Check,
  FileSearch,
  Gauge,
  MessageCircle,
  ShieldCheck,
  SunMedium,
} from 'lucide-react';
import { HeroEstimator } from '@/components/home/hero-estimator';
import Link from '@/components/site/internal-link';
import { SectionHeading } from '@/components/ui/section-heading';
import { localizedPath, type Locale } from '@/config/i18n';

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
    lede: 'ดูตัวเลขเบื้องต้นที่เข้าใจง่าย แล้วตัดสินใจว่าต้องการให้บริษัทโซลาร์ติดต่อเพื่อนัดประเมินหน้างานหรือไม่',
    photoAlt: 'แผงโซลาร์บนหลังคากระเบื้องของบ้านพักอาศัย โดยมีต้นปาล์มอยู่ด้านหลัง',
    photoCaption: 'ภาพโดย Kindel Media ผ่าน Pexels · ใช้ภายใต้สัญญาอนุญาต Pexels',
    example: 'ตัวอย่างผลเพื่อวางแผน',
    exampleNote: 'ไม่ใช่คำสัญญาหรือใบเสนอราคา',
    trust: ['ดูผลก่อนกรอกเบอร์', 'ไม่ต้องอัปโหลดบิล', 'ใช้แบบประเมินได้ฟรี'],
    introEyebrow: 'ก่อนขอราคา',
    introTitle: 'ควรรู้ก่อนว่าบ้านคุณอาจต้องการอะไร',
    introBody: 'SolarMatch จัดข้อมูลพื้นฐานให้เข้าใจง่าย เพื่อให้คุณคุยกับบริษัทโซลาร์ได้อย่างมีคำถามและไม่ต้องเริ่มจากศูนย์',
    introLink: 'ดูว่าเราทำงานอย่างไร',
    processEyebrow: 'เริ่มจากข้อมูลที่รู้',
    processTitle: 'จากค่าไฟหนึ่งใบ สู่คำถามที่ดีขึ้น',
    processBody: 'เครื่องมือนี้ช่วยจัดข้อมูลเบื้องต้น ไม่ได้แทนการสำรวจหน้างานหรือคำแนะนำจากวิศวกร',
    steps: [
      { title: 'ตอบจากสิ่งที่รู้', body: 'จังหวัด ค่าไฟ และรูปแบบการใช้ไฟช่วงกลางวัน โดยไม่ต้องอัปโหลดเอกสาร' },
      { title: 'เห็นตัวเลขที่ใช้วางแผนได้', body: 'ดูขนาดระบบ ผลผลิต ราคา และเงินประหยัดเป็นค่ากลางที่อธิบายที่มา' },
      { title: 'เลือกขั้นตอนถัดไปด้วยตัวเอง', body: 'เห็นผลก่อนกรอกเบอร์ แล้วค่อยตัดสินใจว่าต้องการให้บริษัทโซลาร์ที่ระบุติดต่อเพื่อนัดประเมินหน้างานหรือไม่' },
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
      { title: 'ผลมาก่อนข้อมูลติดต่อ', body: 'เห็นข้อมูลประมาณการก่อนตัดสินใจว่าจะกรอกเบอร์หรือไม่' },
      { title: 'สมมติฐานเปิดเผย', body: 'อัตรา ค่าใช้จ่าย และข้อจำกัดอยู่ใกล้กับผล ไม่ซ่อนในข้อความเล็ก' },
      { title: 'ติดต่อกลับเฉพาะเมื่อพร้อมและยินยอม', body: 'แบบฟอร์มจะเปิดรับข้อมูลเมื่อระบุบริษัทผู้รับ นโยบาย และระยะเวลาเก็บข้อมูลครบถ้วนเท่านั้น' },
      { title: 'ไม่มีความเร่งด่วนปลอม', body: 'ไม่มีนาฬิกานับถอยหลัง โควตาปลอม หรือข้อความกดดัน' },
    ],
    faqEyebrow: 'คำถามที่พบบ่อย',
    faqTitle: 'เริ่มต้นได้โดยไม่ต้องรู้เรื่องโซลาร์มาก่อน',
    faq: [
      { question: 'ผลประเมินนี้แม่นแค่ไหน?', answer: 'เป็นการคัดกรองเบื้องต้นจากค่าไฟและพฤติกรรมการใช้ไฟ ความแม่นยำจะเพิ่มขึ้นเมื่อมีข้อมูลหลังคา โหลดไฟ และการสำรวจหน้างานจริง' },
      { question: 'ต้องกรอกเบอร์ก่อนดูผลไหม?', answer: 'ไม่ต้อง คุณจะเห็นผลประมาณการก่อนเสมอ และแบบฟอร์มติดต่อจะแสดงภายหลังเฉพาะเมื่อเปิดรับคำขอจริง' },
      { question: 'SolarMatch เป็นผู้ติดตั้งหรือไม่?', answer: 'ไม่ใช่ SolarMatch เป็นธุรกิจสร้างและคัดกรองลูกค้าเป้าหมาย ช่วยให้เจ้าของบ้านเข้าใจข้อมูลก่อนเลือกขอให้บริษัทโซลาร์ติดต่อ และ SolarMatch อาจได้รับค่าตอบแทนจากบริษัทผู้รับข้อมูลเมื่อมีการส่งต่อที่ได้รับความยินยอม' },
      { question: 'ตัวเลขระยะคืนทุนมาจากไหน?', answer: 'แบบจำลองใช้ไฟที่ผลิตและใช้เอง ราคาติดตั้งปัจจุบัน ค่าเสื่อมประสิทธิภาพ และเงินสำรองค่าดูแล โดยไม่นับรายได้ขายไฟ สิทธิภาษี เงินกู้ หรือค่าไฟที่เพิ่มขึ้น ตัวเลขจริงยังต้องยืนยันจากผู้ติดตั้งและข้อมูลบ้าน' },
    ],
    finalTitle: 'เริ่มเข้าใจว่าบ้านคุณอาจต้องการระบบแบบไหน',
    finalBody: 'ดูผลก่อนกรอกข้อมูลติดต่อ',
    finalCta: 'เริ่มประเมินฟรี',
  },
  en: {
    eyebrow: 'Rooftop solar estimates for homes in Thailand',
    titleLead: 'Is rooftop solar',
    titleEmphasis: 'a good fit for your home?',
    lede: 'See a clear starting estimate, then decide whether you would like a named solar company to contact you about a site assessment.',
    photoAlt: 'Solar panels on a tiled residential roof with palm trees in the background',
    photoCaption: 'Photo by Kindel Media via Pexels · used under the Pexels licence',
    example: 'Example planning result',
    exampleNote: 'Not a promise or quotation',
    trust: ['See results before entering a phone number', 'No bill upload required', 'Free assessment'],
    introEyebrow: 'Before requesting a quote',
    introTitle: 'First understand what your home may actually need',
    introBody: 'SolarMatch organizes the basics in plain language, helping you ask better questions instead of starting from zero with a solar company.',
    introLink: 'See how it works',
    processEyebrow: 'Start with what you know',
    processTitle: 'From one electricity bill to better questions',
    processBody: 'This tool organizes initial information. It does not replace a site survey or engineering advice.',
    steps: [
      { title: 'Answer from what you know', body: 'Province, electricity bill, and daytime use—without uploading documents.' },
      { title: 'See one planning figure', body: 'View a starting system, production, price, and savings figure with a traceable basis.' },
      { title: 'Choose the next step yourself', body: 'See the result before entering a phone number, then decide whether you want the named solar company to contact you.' },
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
      { title: 'Results before contact details', body: 'Review useful preliminary information before deciding whether to enter a phone number.' },
      { title: 'Assumptions are visible', body: 'Rates, costs, and limitations sit close to the result instead of hiding in fine print.' },
      { title: 'Contact only with consent', body: 'The form accepts details only after the recipient, notice, and retention period are published and the user actively consents.' },
      { title: 'No manufactured urgency', body: 'No countdown timers, invented availability, or pressure messages.' },
    ],
    faqEyebrow: 'Frequently asked questions',
    faqTitle: 'Start without already knowing solar',
    faq: [
      { question: 'How accurate is this estimate?', answer: 'It is an initial screen based on electricity cost and usage patterns. Accuracy improves with roof, load, and site-survey information.' },
      { question: 'Do I need to enter a phone number first?', answer: 'No. You always see the estimate first. A contact form appears afterwards only when real requests are open.' },
      { question: 'Is SolarMatch an installer?', answer: 'No. SolarMatch is a lead-generation and qualification business. It helps homeowners understand the basics before optionally requesting contact from a named solar company, and SolarMatch may be paid by that company for a consented referral.' },
      { question: 'Where does the payback figure come from?', answer: 'The model values electricity produced and used on site, then includes current installation-price references, degradation, and a maintenance/component reserve. Export income, tax relief, finance, and tariff escalation stay outside the planning figure.' },
    ],
    finalTitle: 'Start understanding what kind of system your home may need',
    finalBody: 'See results before entering contact information.',
    finalCta: 'Start free estimate',
  },
};

const stepIcons = [Gauge, BarChart3, MessageCircle];

export function HomePage({ locale = 'th' }: { locale?: Locale }) {
  const text = copy[locale];
  const link = (path: string) => localizedPath(path, locale);

  return (
    <main>
      <section className="hero hero-v2" id="top">
        <div className="site-shell hero-editorial">
          <div className="hero-copy hero-copy-v2">
            <p className="eyebrow"><SunMedium size={16} aria-hidden="true" /> {text.eyebrow}</p>
            <h1>{text.titleLead}<br /><em>{text.titleEmphasis}</em></h1>
            <p className="hero-lede">{text.lede}</p>
          </div>
          <figure className="hero-photo">
            <div className="hero-photo-frame">
              <picture>
                <source
                  type="image/webp"
                  srcSet="/images/solar-home-real-768.webp 768w, /images/solar-home-real-1440.webp 1440w"
                  sizes="(max-width: 840px) 100vw, 56vw"
                />
                <img
                  src="/images/solar-home-real-1440.webp"
                  srcSet="/images/solar-home-real-768.webp 768w, /images/solar-home-real-1440.webp 1440w"
                  sizes="(max-width: 840px) 100vw, 56vw"
                  width="1440"
                  height="960"
                  alt={text.photoAlt}
                  fetchPriority="high"
                  decoding="async"
                />
              </picture>
              <div className="sunline" aria-hidden="true" />
              <div className="result-peek result-peek-v2 result-peek-message"><strong>{locale === 'en' ? 'Save money while saving the world' : 'ประหยัดค่าไฟ พร้อมช่วยโลกไปด้วยกัน'}</strong></div>
            </div>
            <figcaption><a href="https://www.pexels.com/photo/solar-panel-on-roof-of-house-in-california-usa-9875438/" target="_blank" rel="noreferrer">{text.photoCaption}</a></figcaption>
          </figure>
          <div className="hero-estimator-panel">
            <HeroEstimator locale={locale} />
            <ul className="trust-list" aria-label={locale === 'en' ? 'Important information' : 'ข้อมูลสำคัญ'}>{text.trust.map((item) => <li key={item}><Check size={16} aria-hidden="true" />{item}</li>)}</ul>
          </div>
        </div>
      </section>

      <section className="value-intro"><div className="site-shell value-grid"><div><p className="eyebrow">{text.introEyebrow}</p><h2>{text.introTitle}</h2></div><div className="value-copy"><p>{text.introBody}</p><Link className="text-link" href={link('/how-it-works')}>{text.introLink} <ArrowRight size={18} aria-hidden="true" /></Link></div></div></section>

      <section className="home-process process-editorial"><div className="site-shell"><div className="process-heading"><p className="eyebrow">{text.processEyebrow}</p><h2>{text.processTitle}</h2><p>{text.processBody}</p></div><div className="process-sequence">{text.steps.map((item, index) => { const Icon = stepIcons[index]; return <article key={item.title}><span className="process-number">0{index + 1}</span><Icon aria-hidden="true" /><div><h3>{item.title}</h3><p>{item.body}</p></div></article>; })}</div></div></section>

      <section className="savings-preview-section"><div className="site-shell savings-preview-grid"><div><p className="eyebrow">{text.previewEyebrow}</p><h2>{text.previewTitle}</h2><p>{text.previewBody}</p><small>{text.previewDisclaimer}</small><Link className="button" href={link('/estimate')}>{text.previewCta} <ArrowRight size={18} aria-hidden="true" /></Link></div><div className="preview-chart" role="img" aria-label={`${text.previewDisclaimer} ${text.before}: ฿5,000. ${text.after}: ฿2,800.`}><div className="preview-bar before"><span>{text.before}</span><i style={{ '--bar-height': '86%' } as React.CSSProperties} /><strong>฿5,000</strong></div><div className="preview-bar after"><span>{text.after}</span><i style={{ '--bar-height': '48%' } as React.CSSProperties} /><strong>฿2,800</strong></div><div className="preview-baseline" aria-hidden="true" /></div></div></section>

      <section className="evidence-section"><div className="site-shell evidence-grid"><div className="evidence-heading"><p className="eyebrow">{text.evidenceEyebrow}</p><h2>{text.evidenceTitle}</h2><p>{text.evidenceBody}</p></div><div className="evidence-list">{text.evidence.map((item, index) => <article key={item.title}>{index === 0 ? <FileSearch /> : <ShieldCheck />}<div><h3>{item.title}</h3><p>{item.body}</p></div></article>)}</div></div></section>

      <section className="faq-section"><div className="site-shell faq-grid"><SectionHeading eyebrow={text.faqEyebrow} title={text.faqTitle} /><div className="faq-list">{text.faq.map((item, index) => <details key={item.question} open={index === 0}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div></div></section>

      <section className="final-cta"><div className="site-shell final-cta-inner"><div><h2>{text.finalTitle}</h2><p>{text.finalBody}</p></div><Link className="button button-gold" href={link('/estimate')}>{text.finalCta} <ArrowRight size={18} aria-hidden="true" /></Link></div></section>
    </main>
  );
}
