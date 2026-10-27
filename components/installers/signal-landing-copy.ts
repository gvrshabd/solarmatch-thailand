import type { InstallerPublicConfig } from '@/lib/installer/public-config';
import { portalMoney } from '@/lib/installer/presentation';

/** Signal COPY landing strings. New Thai copy remains a draft for native review. */
const copy = {
  en: {
    brandSub: 'FOR INSTALLERS', navMain: 'Main', navHow: 'How it works', navPrice: 'Pricing', navFaq: 'Questions', signIn: 'Sign in', apply: 'Apply',
    eyebrow: 'For solar installers · Bangkok & nearby', lede: 'Each enquiry arrives with the bill, the home and the timeframe, from someone who asked to be called.', applyLong: 'Apply as an installer', unavailable: 'Applications unavailable',
    exNew: 'New enquiry', exNow: 'just now', exTag: 'Example', exLabel: 'Example enquiry', copy: 'Copy',
    fPrice: 'per enquiry', fCos: 'companies at most', fFree: 'free to start', fClaim: 'to claim wrong details', fNote: 'Draft terms. No subscription and no automatic billing.',
    fBill: 'monthly bill', fAc: 'air-conditioners', fOwn: 'ownership', fWhen: 'timeframe',
    howEyebrow: 'How it works', howH: 'From approval to first call.', s1t: 'Apply', s1p: 'Tell us your company and the provinces you cover.', s2t: 'Get LINE alerts', s2p: 'New enquiries reach your phone straight away.', s3t: 'Call and track', s3p: 'One tap to call. One tap to record how it went.',
    faqH: 'Commonly asked questions', photoAlt: 'Solar panels on a tiled roof beside palm trees',
    q1: 'What do I pay?', q2: 'How many other companies get the same homeowner?', q3: 'What if the details are wrong?', q4: 'Can I pause?', q5: 'Is a sale guaranteed?',
    a4: 'Yes. Turn off “Accepting enquiries” at any time. Nothing is sent or charged while you’re paused.',
    a5: 'No. A shared enquiry is a request for contact, not a guaranteed sale. You provide your own advice, quotation and installation agreement.',
    footTag: 'Enquiries from Bangkok homeowners who asked to be called.', footInst: 'Installers', homeSite: 'Homeowner site', privacy: 'Privacy Notice', terms: 'Terms of use', footFine: 'Pre-launch preview. Draft terms.',
  },
  th: {
    brandSub: 'สำหรับผู้ติดตั้ง', navMain: 'เมนูหลัก', navHow: 'วิธีการทำงาน', navPrice: 'ราคา', navFaq: 'คำถาม', signIn: 'เข้าสู่ระบบ', apply: 'สมัคร',
    eyebrow: 'สำหรับผู้ติดตั้งโซลาร์ · กรุงเทพฯ และปริมณฑล', lede: 'ทุกคำขอมาพร้อมค่าไฟ ข้อมูลบ้าน และช่วงเวลาที่ต้องการติดตั้ง จากเจ้าของบ้านที่ขอให้ติดต่อกลับเอง', applyLong: 'สมัครเป็นผู้ติดตั้ง', unavailable: 'ยังไม่เปิดรับสมัคร',
    exNew: 'คำขอใหม่', exNow: 'เมื่อสักครู่', exTag: 'ตัวอย่าง', exLabel: 'ตัวอย่างคำขอ', copy: 'คัดลอก',
    fPrice: 'ต่อคำขอ', fCos: 'บริษัทสูงสุด', fFree: 'คำขอฟรีเริ่มต้น', fClaim: 'ยื่นเคลมข้อมูลผิด', fNote: 'ร่างข้อตกลง ไม่มีค่าสมาชิกและไม่มีการเรียกเก็บเงินอัตโนมัติ',
    fBill: 'ค่าไฟต่อเดือน', fAc: 'เครื่องปรับอากาศ', fOwn: 'ความเป็นเจ้าของ', fWhen: 'ช่วงเวลาติดตั้ง',
    howEyebrow: 'วิธีการทำงาน', howH: 'จากอนุมัติถึงสายแรก', s1t: 'สมัคร', s1p: 'บอกข้อมูลบริษัทและจังหวัดที่คุณให้บริการ', s2t: 'รับแจ้งเตือนทาง LINE', s2p: 'คำขอใหม่ส่งถึงโทรศัพท์ของคุณทันที', s3t: 'โทรและติดตามผล', s3p: 'แตะเดียวเพื่อโทร แตะเดียวเพื่อบันทึกผล',
    faqH: 'คำถามที่พบบ่อย', photoAlt: 'แผงโซลาร์บนหลังคากระเบื้องข้างต้นปาล์ม',
    q1: 'ต้องจ่ายเท่าไร?', q2: 'บริษัทอื่นได้รับเจ้าของบ้านรายเดียวกันกี่แห่ง?', q3: 'ถ้าข้อมูลไม่ถูกต้องทำอย่างไร?', q4: 'พักรับคำขอได้ไหม?', q5: 'รับประกันว่าจะขายได้หรือไม่?',
    a4: 'ได้ ปิด “รับคำขอใหม่” ได้ทุกเมื่อ ระหว่างพักจะไม่มีการส่งคำขอหรือคิดเครดิต',
    a5: 'ไม่รับประกัน คำขอแบบแชร์เป็นคำขอรับการติดต่อ ไม่ใช่ยอดขายที่รับประกัน บริษัทของคุณเป็นผู้ให้คำแนะนำ ใบเสนอราคา และสัญญาติดตั้งเอง',
    footTag: 'คำขอจากเจ้าของบ้านในกรุงเทพฯ ที่ขอให้ติดต่อกลับ', footInst: 'ผู้ติดตั้ง', homeSite: 'เว็บไซต์เจ้าของบ้าน', privacy: 'ประกาศความเป็นส่วนตัว', terms: 'ข้อกำหนดการใช้งาน', footFine: 'ตัวอย่างก่อนเปิดบริการ ร่างข้อตกลง',
  },
};

export function signalLandingText(en: boolean) { return en ? copy.en : copy.th; }

export function signalLandingFaq(en: boolean, commercial: InstallerPublicConfig['commercial']): [string, string][] {
  const t = signalLandingText(en);
  const c = commercial;
  const price = c ? portalMoney(c.creditValueMinor * c.sharedCredits, 'THB', en, (c.creditValueMinor * c.sharedCredits) % 100 === 0) : '—';
  const credits = c ? c.sharedCredits : '—';
  const trial = c ? c.trialDeliveries : '—';
  const companies = c ? c.recipientLimit : '—';
  const others = c ? Math.max(0, c.recipientLimit - 1) : '—';
  // Keep the existing claim sentence and claim rule word for word; only config values vary.
  const claim = c
    ? en ? `Submit a claim within ${c.claimDays} days of its original portal availability. Claims are reviewed; a credit restoration is not a cash refund.` : `ยื่นคำร้องภายใน ${c.claimDays} วันนับจากพร้อมใช้ในพอร์ทัลครั้งแรก คำร้องต้องผ่านการตรวจสอบ การคืนเครดิตไม่ใช่การคืนเงินสด`
    : en ? 'Use the protected claim flow in your portal. The current terms explain eligibility.' : 'ยื่นคำร้องผ่านพอร์ทัลที่มีการปกป้องสิทธิ์ โดยดูเงื่อนไขในข้อตกลงฉบับปัจจุบัน';
  return [
    [t.q1, en ? `${price} (${credits} credits) for each enquiry you receive. No subscription and no automatic top-ups. Your first ${trial} enquiries are free after approval.` : `${price} (${credits} เครดิต) ต่อคำขอที่ได้รับ ไม่มีค่าสมาชิกและไม่มีการเติมเครดิตอัตโนมัติ คำขอ ${trial} รายการแรกฟรีหลังได้รับอนุมัติ`],
    [t.q2, en ? `At most ${others} others. A homeowner never reaches more than ${companies} companies.` : `ไม่เกินอีก ${others} แห่ง เจ้าของบ้านหนึ่งรายจะถูกส่งต่อให้บริษัทไม่เกิน ${companies} แห่ง`],
    [t.q3, claim + ' ' + (en ? 'No answer or no purchase does not automatically make an enquiry invalid.' : 'การไม่รับสายหรือไม่ซื้อ ไม่ถือเป็นคำขอที่ไม่ถูกต้องโดยอัตโนมัติ')],
    [t.q4, t.a4],
    [t.q5, t.a5],
  ];
}
