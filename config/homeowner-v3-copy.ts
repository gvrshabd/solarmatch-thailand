import type {Locale} from './i18n';

/** Homeowner-only final V3 copy; shared installer copy stays unchanged. */
const copy = {
  en: {
    heroLede: 'Answer a few short questions and see your home’s future with solar.',
    billLabel: 'Your monthly electricity bill', trust: ['Free', 'Official MEA & PEA tariffs'],
    exampleEyebrow: 'Example estimate', exampleHeading: 'A starting point for planning.',
    exampleBill: 'Monthly bill', today: 'Today', withSolar: 'With solar',
    howHeading: 'How it works', stepTitle: 'Complete a short assessment',
    stepBody: 'Your bill, home and roof. “Not sure” is always an answer.', secondBody: 'Every number, with the method behind it.',
    trustBody: 'This planning estimate uses published package prices and a yearly maintenance and component reserve. Site work, the final installation scope and price need an installer survey and written quote.',
    sources: ['MEA residential tariff', 'PEA residential tariff', 'Solar resource & price evidence'],
    rows: [['Published package price plus planning allowance', 'Modelled'], ['Maintenance and component reserve', 'Modelled'], ['Panels ageing 0.5% a year', 'Modelled'], ['Export income', 'Separate conditional scenario'], ['Personal tax relief', 'Separate conditional scenario']],
    faqHeading: 'Commonly asked questions',
  },
  th: {
    heroLede: 'ตอบคำถามสั้น ๆ แล้วดูอนาคตของบ้านคุณกับโซลาร์',
    billLabel: 'ค่าไฟต่อเดือนของคุณ', trust: ['ฟรี', 'อัตราค่าไฟทางการของ กฟน. และ กฟภ.'],
    exampleEyebrow: 'ตัวอย่างผลประเมิน', exampleHeading: 'จุดเริ่มต้นสำหรับวางแผน',
    exampleBill: 'ค่าไฟต่อเดือน', today: 'ตอนนี้', withSolar: 'เมื่อติดโซลาร์',
    howHeading: 'วิธีการทำงาน', stepTitle: 'ตอบแบบประเมินสั้น ๆ',
    stepBody: 'ค่าไฟ บ้าน และหลังคา ตอบ “ไม่แน่ใจ” ได้เสมอ', secondBody: 'เห็นทุกตัวเลขพร้อมวิธีคำนวณ',
    trustBody: 'ผลประเมินใช้ราคาแพ็กเกจที่เผยแพร่และเงินสำรองค่าดูแลกับอุปกรณ์รายปี งานหน้างาน ขอบเขตติดตั้ง และราคาสุดท้ายต้องให้ผู้ติดตั้งสำรวจและเสนอเป็นลายลักษณ์อักษร',
    sources: ['อัตราค่าไฟบ้าน กฟน.', 'อัตราค่าไฟบ้าน กฟภ.', 'ข้อมูลแสงแดดและราคาอ้างอิง'],
    rows: [['ราคาแพ็กเกจที่เผยแพร่พร้อมเงินเผื่อ', 'จำลองแล้ว'], ['เงินสำรองค่าดูแลและอุปกรณ์', 'จำลองแล้ว'], ['แผงเสื่อมประสิทธิภาพปีละ 0.5%', 'จำลองแล้ว'], ['รายได้ขายไฟส่วนเกิน', 'ฉากทัศน์แยกตามเงื่อนไข'], ['สิทธิภาษีบุคคลธรรมดา', 'ฉากทัศน์แยกตามเงื่อนไข']],
    faqHeading: 'คำถามที่พบบ่อย',
  },
} as const;
export const homeownerText = (locale: Locale) => copy[locale];
