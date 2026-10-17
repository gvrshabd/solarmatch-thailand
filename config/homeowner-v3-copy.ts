import type {Locale} from './i18n';

/** Homeowner-only final V3 copy; shared installer copy stays unchanged. */
const copy = {
  en: {
    heroLede: 'Answer a few short questions and see your home’s future with solar.',
    billLabel: 'Your monthly electricity bill', trust: ['Free', 'Official MEA & PEA tariffs'],
    exampleEyebrow: 'Example estimate', exampleHeading: 'Real numbers you can plan with.',
    exampleBill: 'Monthly bill', today: 'Today', withSolar: 'With solar',
    howHeading: 'How it works', stepTitle: 'Complete a short assessment',
    stepBody: 'Your bill, home and roof. “Not sure” is always an answer.', secondBody: 'Every number, with the method behind it.',
    trustBody: 'We count the real costs and leave out the extras. So if an installer quotes a faster payback, you’ll know exactly what to ask.',
    sources: ['MEA residential tariff', 'PEA residential tariff', 'Solar resource & price evidence'],
    rows: [['Full installation', 'Included'], ['Maintenance and inverter replacement', 'Included'], ['Panels ageing 0.5% a year', 'Included'], ['Income from selling surplus power', 'Not included'], ['Tax deduction up to ฿200,000', 'Not included']],
    faqHeading: 'Commonly asked questions',
  },
  th: {
    heroLede: 'ตอบคำถามสั้น ๆ แล้วดูอนาคตของบ้านคุณกับโซลาร์',
    billLabel: 'ค่าไฟต่อเดือนของคุณ', trust: ['ฟรี', 'อัตราค่าไฟทางการของ กฟน. และ กฟภ.'],
    exampleEyebrow: 'ตัวอย่างผลประเมิน', exampleHeading: 'ตัวเลขจริงที่ใช้วางแผนได้',
    exampleBill: 'ค่าไฟต่อเดือน', today: 'ตอนนี้', withSolar: 'เมื่อติดโซลาร์',
    howHeading: 'วิธีการทำงาน', stepTitle: 'ตอบแบบประเมินสั้น ๆ',
    stepBody: 'ค่าไฟ บ้าน และหลังคา ตอบ “ไม่แน่ใจ” ได้เสมอ', secondBody: 'เห็นทุกตัวเลขพร้อมวิธีคำนวณ',
    trustBody: 'เรานับต้นทุนจริงครบ และไม่นับสิทธิประโยชน์เสริม ถ้าผู้ติดตั้งเสนอระยะคืนทุนที่เร็วกว่านี้ คุณจะรู้ว่าควรถามอะไร',
    sources: ['อัตราค่าไฟบ้าน กฟน.', 'อัตราค่าไฟบ้าน กฟภ.', 'ข้อมูลแสงแดดและราคาอ้างอิง'],
    rows: [['ค่าติดตั้งครบชุด', 'รวมแล้ว'], ['ค่าบำรุงรักษาและเปลี่ยนอินเวอร์เตอร์', 'รวมแล้ว'], ['แผงเสื่อมประสิทธิภาพปีละ 0.5%', 'รวมแล้ว'], ['รายได้จากการขายไฟส่วนเกิน', 'ไม่ได้รวม'], ['ลดหย่อนภาษีสูงสุด ฿200,000', 'ไม่ได้รวม']],
    faqHeading: 'คำถามที่พบบ่อย',
  },
} as const;
export const homeownerText = (locale: Locale) => copy[locale];
