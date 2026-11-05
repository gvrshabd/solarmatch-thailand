import type { InstallerPublicConfig } from '@/lib/installer/public-config';
import { portalMoney } from '@/lib/installer/presentation';

/** Approved Pulse copy. New Thai copy remains a draft for native review. */
const copy = {
  "en": {
    "brandSub": "FOR INSTALLERS",
    "navMain": "Main",
    "navHow": "How it works",
    "navFaq": "Questions",
    "signIn": "Sign in",
    "apply": "Apply",
    "eyebrow": "Bangkok & nearby",
    "h1a": "Get connected with homeowners ",
    "h1b": "who asked to be called about solar.",
    "headlineLines": ["Get connected", "with homeowners", "who asked", "to be called", "about solar."],
    "applyLong": "Apply as a solar installer",
    "examples": "Examples",
    "examplesLabel": "Example customers",
    "pause": "Pause examples",
    "play": "Play examples",
    "acs": "{n} air-cons",
    "howH": "How it works",
    "s1": "Apply",
    "s2": "Receive customer information",
    "s2p": "Through LINE or email",
    "s3": "Call and earn!",
    "faqH": "Commonly asked questions",
    "photoAlt": "Solar panels on a tiled roof in a garden",
    "q1": "What does each enquiry cost?",
    "q2": "How many companies get the same homeowner?",
    "q3": "Is there a free trial?",
    "q4": "What if a customer’s details are wrong?",
    "homeSite": "Homeowner site",
    "privacy": "Privacy Notice",
    "terms": "Terms of use",
    "skip": "Skip to content",
    "footer": "Footer",
    "unavailable": "Applications unavailable",
    "footFine": "Pre-launch preview."
  },
  "th": {
    "brandSub": "สำหรับผู้ติดตั้ง",
    "navMain": "เมนูหลัก",
    "navHow": "วิธีการทำงาน",
    "navFaq": "คำถาม",
    "signIn": "เข้าสู่ระบบ",
    "apply": "สมัคร",
    "eyebrow": "กรุงเทพฯ และปริมณฑล",
    "h1a": "เชื่อมต่อกับเจ้าของบ้าน",
    "h1b": "ที่ขอให้โทรกลับเรื่องโซลาร์",
    "headlineLines": ["เชื่อมต่อกับ", "เจ้าของบ้าน", "ที่ขอให้โทรกลับ", "เรื่องโซลาร์"],
    "applyLong": "สมัครเป็นผู้ติดตั้งโซลาร์",
    "examples": "ตัวอย่าง",
    "examplesLabel": "ตัวอย่างลูกค้า",
    "pause": "หยุดตัวอย่าง",
    "play": "เล่นตัวอย่าง",
    "acs": "แอร์ {n} เครื่อง",
    "howH": "วิธีการทำงาน",
    "s1": "สมัคร",
    "s2": "รับข้อมูลลูกค้า",
    "s2p": "ผ่าน LINE หรืออีเมล",
    "s3": "โทรแล้วสร้างรายได้!",
    "faqH": "คำถามที่พบบ่อย",
    "photoAlt": "แผงโซลาร์บนหลังคากระเบื้องในสวน",
    "q1": "ค่าคำขอเท่าไร?",
    "q2": "มีบริษัทได้รับลูกค้ารายเดียวกันกี่แห่ง?",
    "q3": "ทดลองใช้ฟรีได้ไหม?",
    "q4": "ถ้าข้อมูลลูกค้าไม่ถูกต้องล่ะ?",
    "homeSite": "เว็บไซต์เจ้าของบ้าน",
    "privacy": "ประกาศความเป็นส่วนตัว",
    "terms": "ข้อกำหนดการใช้งาน",
    "skip": "ข้ามไปเนื้อหา",
    "footer": "ส่วนท้าย",
    "unavailable": "ยังไม่เปิดรับสมัคร",
    "footFine": "ตัวอย่างก่อนเปิดบริการ"
  }
};

export function signalLandingText(en: boolean) { return en ? copy.en : copy.th; }

export function signalLandingFaq(en: boolean, commercial: InstallerPublicConfig['commercial']): [string, string][] {
  const t = signalLandingText(en);
  const c = commercial;
  const price = c ? portalMoney(c.creditValueMinor * c.sharedCredits, 'THB', en, (c.creditValueMinor * c.sharedCredits) % 100 === 0) : '—';
  const trial = c ? c.trialDeliveries : '—';
  const companies = c ? c.recipientLimit : '—';
  const claimDays = c ? c.claimDays : '—';
  return [
    [t.q1, en ? `${price} per enquiry. No subscription and no automatic billing.` : `คำขอละ ${price} ไม่มีค่าสมาชิกและไม่มีการเรียกเก็บเงินอัตโนมัติ`],
    [t.q2, en ? `${companies} at most, including you.` : `ไม่เกิน ${companies} บริษัท รวมคุณด้วย`],
    [t.q3, en ? `Yes. Your first ${trial} enquiries are free once you’re approved.` : `ได้ คำขอ ${trial} รายการแรกฟรีหลังได้รับอนุมัติ`],
    [t.q4, en ? `Report it within ${claimDays} days. If the details are wrong, you get your credits back.` : `แจ้งเราภายใน ${claimDays} วัน หากข้อมูลผิดจริง คุณจะได้เครดิตคืน`],
  ];
}
