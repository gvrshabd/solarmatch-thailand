import type {Locale} from './i18n';

/** Homeowner-only final V3 copy; shared installer copy stays unchanged. */
const copy = {
  en: {
    heroLede: 'Answer a few short questions and see your home’s future with solar.',
    billLabel: 'Your monthly electricity bill', trust: ['Free', 'Official MEA & PEA tariffs'],
    exampleEyebrow: 'Example estimate',
    exampleBill: 'Monthly bill', today: 'Today', withSolar: 'With solar',
    howHeading: 'How it works', steps: ['Complete a short assessment', 'See your estimate', 'Get real quotes from real installers.'],
    trustBody: 'This planning estimate uses published package prices and a yearly maintenance and component reserve. Your home’s final installation scope and price need an installer survey and to receive a written quote.',
    sources: ['MEA residential tariff', 'PEA residential tariff', 'Solar resource & price evidence'],
    rows: [['Published package price plus planning allowance', 'Modelled'], ['Maintenance and component reserve', 'Modelled'], ['Panels ageing 0.5% a year', 'Modelled'], ['Export income', 'Separate conditional scenario'], ['Personal tax relief', 'Separate conditional scenario']] as [string, string][],
    faqHeading: 'Commonly asked questions',
  },
  th: {
    heroLede: 'ตอบคำถามสั้น ๆ แล้วดูอนาคตของบ้านคุณกับโซลาร์',
    billLabel: 'ค่าไฟต่อเดือนของคุณ', trust: ['ฟรี', 'อัตราค่าไฟทางการของ กฟน. และ กฟภ.'],
    exampleEyebrow: 'ตัวอย่างผลประเมิน',
    exampleBill: 'ค่าไฟต่อเดือน', today: 'ตอนนี้', withSolar: 'เมื่อติดโซลาร์',
    howHeading: 'วิธีการทำงาน', steps: ['ตอบแบบประเมินสั้น ๆ', 'ดูผลประเมินของคุณ', 'รับใบเสนอราคาจริงจากผู้ติดตั้งจริง'],
    trustBody: 'ผลประเมินใช้ราคาแพ็กเกจที่เผยแพร่และเงินสำรองค่าดูแลกับอุปกรณ์รายปี ขอบเขตติดตั้งและราคาสุดท้ายของบ้านคุณต้องให้ผู้ติดตั้งสำรวจและรับใบเสนอราคาเป็นลายลักษณ์อักษร',
    sources: ['อัตราค่าไฟบ้าน กฟน.', 'อัตราค่าไฟบ้าน กฟภ.', 'ข้อมูลแสงแดดและราคาอ้างอิง'],
    rows: [['ราคาแพ็กเกจที่เผยแพร่พร้อมเงินเผื่อ', 'จำลองแล้ว'], ['เงินสำรองค่าดูแลและอุปกรณ์', 'จำลองแล้ว'], ['แผงเสื่อมประสิทธิภาพปีละ 0.5%', 'จำลองแล้ว'], ['รายได้ขายไฟส่วนเกิน', 'ฉากทัศน์แยกตามเงื่อนไข'], ['สิทธิภาษีบุคคลธรรมดา', 'ฉากทัศน์แยกตามเงื่อนไข']] as [string, string][],
    faqHeading: 'คำถามที่พบบ่อย',
  },
} as const;
export const homeownerText = (locale: Locale) => copy[locale];
