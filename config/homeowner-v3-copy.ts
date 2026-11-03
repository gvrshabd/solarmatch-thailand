import type {Locale} from './i18n';
import {designText} from './design-v2-copy';

/** Homeowner-only final V3 copy; shared installer copy stays unchanged. */
type Row = {label: string; mark: 'yes' | 'no'; aria: string};
type Faq = readonly (readonly [string, string])[];

/* Thai strings marked "needs native review" are drafts; everything else is reused, already reviewed copy. */
const copy = {
  en: {
    heroH1Lead: 'How much could solar ', heroH1Accent: 'save your home?',
    billLabel: 'Your monthly electricity bill', perMonthShort: '/ month', trust: ['Free', 'Official MEA & PEA tariffs'],
    exampleEyebrow: 'Example estimate · Sathon',
    exampleBill: 'Monthly bill', today: 'Today', withSolar: 'With solar',
    howHeading: 'How it works', steps: ['Answer a few questions', 'See your savings', 'Get real quotes from real installers.'],
    trustH2: 'Official tariffs. Published prices.',
    trustBody: 'A planning estimate, not a quote. Your final price comes from an installer’s survey.',
    sources: ['MEA residential tariff', 'PEA residential tariff', 'Solar resource & price evidence'],
    rows: [
      {label: 'Package price + planning allowance', mark: 'yes', aria: 'Modelled'},
      {label: 'Maintenance & component reserve', mark: 'yes', aria: 'Modelled'},
      {label: 'Panels ageing 0.5% a year', mark: 'yes', aria: 'Modelled'},
      {label: 'Export income', mark: 'no', aria: 'Separate conditional scenario'},
      {label: 'Personal tax relief', mark: 'no', aria: 'Separate conditional scenario'},
    ] as readonly Row[],
    faqHeading: 'Commonly asked questions',
    faqAnswers: [
      'It depends on your roof and the installation. Ask how the mounts are sealed for your roof type and what warranty covers the roof work.',
      'Yes, with less output on cloudy days. The estimate uses long-run monthly sunlight for a Bangkok reference location, rainy months included. It is not a forecast or a reading from your roof.',
      'Check the product, panel-performance and workmanship warranties separately. The estimate includes a yearly allowance for maintenance and inverter replacement; it does not guarantee how long equipment lasts.',
      'Yes, a grid-connected system goes through the utility’s process. Bangkok, Nonthaburi and Samut Prakan use MEA; other supported areas use PEA. Agree in writing who handles the application, approvals and fees.',
    ] as readonly string[],
  },
  th: {
    heroH1Lead: 'โซลาร์ช่วยบ้านคุณ', heroH1Accent: 'ประหยัดได้เท่าไร?',
    billLabel: 'ค่าไฟต่อเดือนของคุณ',
    perMonthShort: '/ เดือน', // needs native review
    trust: ['ฟรี', 'อัตราค่าไฟทางการของ กฟน. และ กฟภ.'],
    exampleEyebrow: 'ตัวอย่างผลประเมิน · สาทร',
    exampleBill: 'ค่าไฟต่อเดือน', today: 'ตอนนี้', withSolar: 'เมื่อติดโซลาร์',
    howHeading: 'วิธีการทำงาน',
    steps: [
      'ตอบคำถามไม่กี่ข้อ', // needs native review
      'ดูว่าคุณประหยัดได้เท่าไร', // needs native review
      'รับใบเสนอราคาจริงจากผู้ติดตั้งจริง',
    ],
    trustH2: 'อัตราค่าไฟทางการ ราคาที่เผยแพร่จริง', // needs native review
    trustBody: 'เป็นผลประเมินเพื่อวางแผน ไม่ใช่ใบเสนอราคา ราคาสุดท้ายขึ้นอยู่กับการสำรวจหน้างานของผู้\u2060ติดตั้ง', // needs native review (\u2060 keeps “ผู้ติดตั้ง” on one line)
    sources: ['อัตราค่าไฟบ้าน กฟน.', 'อัตราค่าไฟบ้าน กฟภ.', 'ข้อมูลแสงแดดและราคาอ้างอิง'],
    // Row labels need native review.
    rows: [
      {label: 'ราคาแพ็กเกจ รวมเงินเผื่อวางแผน', mark: 'yes', aria: 'รวมอยู่ในแบบจำลอง'},
      {label: 'เงินสำรองค่าบำรุงรักษาและชิ้นส่วน', mark: 'yes', aria: 'รวมอยู่ในแบบจำลอง'},
      {label: 'ประสิทธิภาพแผงลดลงปีละ 0.5%', mark: 'yes', aria: 'รวมอยู่ในแบบจำลอง'},
      {label: 'รายได้จากการขายไฟส่วนเกิน', mark: 'no', aria: 'แสดงแยกเป็นกรณีตามเงื่อนไข ไม่รวมในผลหลัก'},
      {label: 'สิทธิลดหย่อนภาษีบุคคลธรรมดา', mark: 'no', aria: 'แสดงแยกเป็นกรณีตามเงื่อนไข ไม่รวมในผลหลัก'},
    ] as readonly Row[],
    faqHeading: 'คำถามที่พบบ่อย',
    // Answers 1–4 need native review.
    faqAnswers: [
      'ขึ้นอยู่กับสภาพหลังคาและการติดตั้ง ควรถามผู้ติดตั้งว่ากันซึมจุดยึดแผงอย่างไรสำหรับหลังคาของคุณ และการรับประกันงานหลังคาครอบคลุมแค่ไหน',
      'ได้ แต่วันที่ฟ้าครึ้มจะผลิตไฟได้น้อยลง ผลประเมินใช้ค่าเฉลี่ยแสงแดดรายเดือนระยะยาวของจุดอ้างอิงในกรุงเทพฯ ซึ่งรวมช่วงหน้าฝนแล้ว ไม่ใช่การพยากรณ์อากาศหรือค่าที่วัดจริงจากหลังคาบ้านคุณ',
      'ควรตรวจเอกสารรับประกันของสินค้า ประสิทธิภาพแผง และงานติดตั้งแยกกัน ผลประเมินเผื่อค่าบำรุงรักษาและการเปลี่ยนอินเวอร์เตอร์ไว้ในแต่ละปี แต่ไม่ได้รับประกันอายุการใช้งานของอุปกรณ์',
      'ต้องขออนุญาต ระบบที่เชื่อมต่อกับโครงข่ายไฟฟ้าต้องผ่านขั้นตอนของการไฟฟ้า กรุงเทพฯ นนทบุรี และสมุทรปราการใช้ กฟน. พื้นที่อื่นที่รองรับใช้ กฟภ. ควรตกลงเป็นลายลักษณ์อักษรว่าใครรับผิดชอบการยื่นเรื่อง การขออนุมัติ และค่าธรรมเนียม',
    ] as readonly string[],
  },
} as const;

/** Home FAQ: existing questions, shorter answers 1–4, answer 5 unchanged word for word. */
export function homeFaq(locale: Locale): Faq {
  const existing = designText(locale).faq, answers = copy[locale].faqAnswers;
  return existing.map(([question, answer], index) => [question, index < answers.length ? answers[index] : answer] as const);
}

export const homeownerText = (locale: Locale) => copy[locale];
