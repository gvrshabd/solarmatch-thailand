import { ArrowRight, ShieldCheck } from 'lucide-react';
import { PageHero } from '@/components/content/page-hero';
import Link from '@/components/site/internal-link';
import { thaiMetadata } from '@/lib/seo/localized-metadata';
import { OperatorDisclosure } from '@/components/content/operator-disclosure';

export const metadata = thaiMetadata('ติดต่อ', '/contact');
export default function ContactPage() {
  return <main><PageHero eyebrow="Contact" title="ช่องทางติดต่อจะเปิดเมื่อข้อมูลผู้รับผิดชอบครบถ้วน"><p>SolarMatch จะไม่แสดงหรือเปิดใช้ LINE เบอร์โทร หรืออีเมล จนกว่าจะยืนยันผู้ดำเนินการ ช่องทางความเป็นส่วนตัว และเงื่อนไขการส่งต่อข้อมูลอย่างถูกต้อง</p></PageHero><section className="site-shell contact-status-card"><ShieldCheck /><div><h2>ผลประเมินยังใช้งานได้ตามปกติ</h2><p>คุณดูผลได้โดยไม่ต้องให้ข้อมูลส่วนบุคคล เมื่อเปิดรับคำขอติดต่อ ระบบจะแจ้งอย่างชัดเจนว่าข้อมูลอาจส่งให้บริษัทโซลาร์สำหรับที่พักอาศัยที่เข้าร่วมมากกว่าหนึ่งบริษัท และขอความยินยอมแยกต่างหากก่อนส่งข้อมูล</p><Link className="text-link" href="/privacy">อ่านประกาศความเป็นส่วนตัว <ArrowRight /></Link><OperatorDisclosure locale="th" /></div></section></main>;
}
