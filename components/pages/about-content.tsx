import { ArrowRight, MapPin } from 'lucide-react';
import { PageHero } from '@/components/content/page-hero';
import Link from '@/components/site/internal-link';
import { localizedPath, type Locale } from '@/config/i18n';
import { initialLaunchProvinces } from '@/config/provinces';

const copy = {
  en: {
    title: 'About SolarMatch', subtitle: 'Understand your solar options before deciding what to do next',
    intro: 'SolarMatch helps homeowners turn a few practical details about their electricity use and property into a preliminary solar estimate.',
    aim: 'The aim is simple: give people a useful starting point before they speak with a solar provider.',
    works: 'How SolarMatch works',
    steps: [
      ['1. Complete the assessment', 'Answer a short set of questions about your property, electricity bill, daytime electricity use and roof.'],
      ['2. See your estimate', 'SolarMatch uses the information you provide together with published electricity tariffs, solar-resource data and market evidence to produce a preliminary planning estimate.'],
      ['3. Choose whether you want contact', 'You can receive your estimate without providing contact information.'],
    ],
    consent: 'If you choose to request quotes and provide explicit consent, SolarMatch may share the permitted information with solar service providers, installers, their authorized representatives, or other businesses involved in providing solar services.',
    recipients: 'More than one recipient may receive the same request. SolarMatch may be paid for the connection. Choosing to request quotes does not guarantee that you will be contacted or receive a quotation.',
    independent: 'Independent solar providers',
    independentParagraphs: [
      'SolarMatch is an information and referral service, not a solar installer, electrical contractor or engineering firm.',
      'Any provider that contacts you operates independently from SolarMatch. You are free to speak with, compare, decline or choose any provider.',
      'Any site survey, recommendation, quotation, purchase, financing, installation or warranty agreement is between you and the relevant provider.',
    ],
    approach: 'How we approach estimates',
    approachParagraphs: [
      'SolarMatch is designed to provide a useful preliminary estimate without pretending that an online calculator can replace a real site assessment.',
      'We distinguish between information provided by you, assumptions used by the model and matters that still require inspection by a qualified provider.',
      'SolarMatch does not guarantee electricity production, savings, payback, installation cost, property value or suitability for installation.',
      'You can review the methodology and primary sources used by the current model.',
    ],
    focus: 'Current focus', focusIntro: 'SolarMatch currently focuses on homeowners in Bangkok and the surrounding provinces:',
    other: 'Users in other provinces may still complete the assessment. Availability of relevant solar providers may vary by location.', link: 'Read the methodology and sources',
  },
  th: {
    title: 'เกี่ยวกับ SolarMatch', subtitle: 'เข้าใจทางเลือกด้านโซลาร์ของคุณ ก่อนตัดสินใจว่าจะทำอะไรต่อ',
    intro: 'SolarMatch ช่วยให้เจ้าของบ้านนำข้อมูลพื้นฐานเกี่ยวกับการใช้ไฟและอสังหาริมทรัพย์ของตนมาประเมินโซลาร์เบื้องต้นได้ง่ายขึ้น',
    aim: 'เป้าหมายคือให้ผู้ใช้มีข้อมูลตั้งต้นที่เป็นประโยชน์ก่อนพูดคุยกับผู้ให้บริการด้านโซลาร์', works: 'SolarMatch ทำงานอย่างไร',
    steps: [
      ['1. ทำแบบประเมิน', 'ตอบคำถามสั้น ๆ เกี่ยวกับอสังหาริมทรัพย์ ค่าไฟ การใช้ไฟช่วงกลางวัน และหลังคาของคุณ'],
      ['2. ดูผลประเมิน', 'SolarMatch ใช้ข้อมูลที่คุณให้ ร่วมกับอัตราค่าไฟ ข้อมูลพลังงานแสงอาทิตย์ และข้อมูลตลาดที่มีแหล่งอ้างอิง เพื่อจัดทำค่าประเมินเบื้องต้นสำหรับการวางแผน'],
      ['3. เลือกเองว่าต้องการให้ติดต่อหรือไม่', 'คุณสามารถรับผลประเมินได้โดยไม่ต้องให้ข้อมูลติดต่อ'],
    ],
    consent: 'หากคุณเลือกขอใบเสนอราคาและให้ความยินยอมโดยชัดแจ้ง SolarMatch อาจส่งข้อมูลที่ได้รับอนุญาตให้แก่ผู้ให้บริการด้านโซลาร์ ผู้ติดตั้ง ตัวแทนที่ได้รับอนุญาต หรือธุรกิจอื่นที่เกี่ยวข้องกับการให้บริการด้านโซลาร์',
    recipients: 'คำขอเดียวกันอาจถูกส่งให้ผู้รับมากกว่าหนึ่งราย SolarMatch อาจได้รับค่าตอบแทนจากการเชื่อมโยงดังกล่าว การเลือกขอใบเสนอราคาไม่ได้รับประกันว่าจะมีผู้ติดต่อคุณหรือว่าคุณจะได้รับใบเสนอราคา',
    independent: 'ผู้ให้บริการเป็นอิสระจาก SolarMatch',
    independentParagraphs: [
      'SolarMatch เป็นบริการให้ข้อมูลและแนะนำผู้ให้บริการ ไม่ใช่บริษัทติดตั้งโซลาร์ ผู้รับเหมาไฟฟ้า หรือบริษัทวิศวกรรม',
      'ผู้ให้บริการที่ติดต่อคุณดำเนินธุรกิจโดยอิสระจาก SolarMatch คุณสามารถเลือกพูดคุย เปรียบเทียบ ปฏิเสธ หรือเลือกใช้บริการจากผู้ให้บริการรายใดก็ได้',
      'การสำรวจหน้างาน คำแนะนำ ใบเสนอราคา การซื้อ การจัดหาเงินทุน การติดตั้ง หรือการรับประกันใด ๆ เป็นเรื่องระหว่างคุณกับผู้ให้บริการที่เกี่ยวข้องโดยตรง',
    ],
    approach: 'แนวทางการประเมินของเรา',
    approachParagraphs: [
      'SolarMatch ออกแบบมาเพื่อให้ค่าประเมินเบื้องต้นที่เป็นประโยชน์ โดยไม่ทำให้เครื่องคำนวณออนไลน์ดูเหมือนสามารถทดแทนการตรวจหน้างานจริงได้',
      'เราแยกให้ชัดเจนระหว่างข้อมูลที่คุณให้ สมมติฐานที่ใช้ในแบบจำลอง และข้อมูลที่ยังต้องให้ผู้ให้บริการที่เหมาะสมตรวจสอบหน้างาน',
      'SolarMatch ไม่รับประกันผลผลิตไฟฟ้า ผลประหยัด ระยะเวลาคืนทุน ราคาติดตั้ง มูลค่าอสังหาริมทรัพย์ หรือความเหมาะสมในการติดตั้ง',
      'คุณสามารถตรวจสอบวิธีคำนวณและแหล่งข้อมูลหลักที่ใช้กับแบบจำลองปัจจุบันได้',
    ],
    focus: 'พื้นที่ที่มุ่งเน้นในปัจจุบัน', focusIntro: 'ปัจจุบัน SolarMatch มุ่งเน้นเจ้าของบ้านในกรุงเทพฯ และปริมณฑล ได้แก่',
    other: 'ผู้ใช้ในจังหวัดอื่นยังสามารถทำแบบประเมินได้ แต่ความพร้อมของผู้ให้บริการด้านโซลาร์ที่เกี่ยวข้องอาจแตกต่างกันตามพื้นที่', link: 'อ่านวิธีคำนวณและแหล่งข้อมูล',
  },
} as const;

export function AboutContent({ locale = 'th' }: { locale?: Locale }) {
  const text = copy[locale];
  return <main>
    <PageHero eyebrow={text.title} title={text.subtitle}><p>{text.intro}</p><p>{text.aim}</p></PageHero>
    <section className="site-shell about-principles" aria-labelledby="about-works"><div className="section-heading"><h2 id="about-works">{text.works}</h2></div><div className="about-grid">{text.steps.map(([title, body]) => <article key={title}><h2>{title}</h2><p>{body}</p></article>)}</div></section>
    <section className="about-operating-section"><div className="site-shell about-operating-grid"><article className="about-operating-intro"><p>{text.consent}</p><p>{text.recipients}</p></article><article className="about-boundary-card"><h2>{text.independent}</h2>{text.independentParagraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</article><article className="about-boundary-card"><h2>{text.approach}</h2>{text.approachParagraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</article></div></section>
    <section className="site-shell about-scope-panel"><div><h2>{text.focus}</h2><p>{text.focusIntro}</p><p>{text.other}</p><Link className="text-link" href={localizedPath('/methodology', locale)}>{text.link} <ArrowRight size={18} aria-hidden="true" /></Link></div><ul aria-label={text.focus}>{initialLaunchProvinces.map((province) => <li key={province.value}><MapPin size={17} aria-hidden="true" />{province[locale]}</li>)}</ul></section>
  </main>;
}
