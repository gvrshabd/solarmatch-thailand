import type { Metadata } from 'next';
import { ExternalLink } from 'lucide-react';
import { PageHero } from '@/components/content/page-hero';

export const metadata: Metadata = { title: 'แหล่งข้อมูล' };
const resources = [
  { name: 'คณะกรรมการกำกับกิจการพลังงาน (กกพ.)', note: 'ข้อมูลกำกับกิจการ ใบอนุญาต และประกาศที่เกี่ยวข้อง', href: 'https://www.erc.or.th/' },
  { name: 'การไฟฟ้านครหลวง (MEA)', note: 'ข้อมูลระบบไฟฟ้าสำหรับกรุงเทพฯ นนทบุรี และสมุทรปราการ', href: 'https://www.mea.or.th/' },
  { name: 'การไฟฟ้าส่วนภูมิภาค (PEA)', note: 'ข้อมูลระบบไฟฟ้าสำหรับพื้นที่อื่นของประเทศไทย', href: 'https://www.pea.co.th/' },
  { name: 'กรมพัฒนาพลังงานทดแทนและอนุรักษ์พลังงาน (พพ.)', note: 'ความรู้และข้อมูลพลังงานทดแทน', href: 'https://www.dede.go.th/' },
];
export default function ResourcesPage() {
  return <main><PageHero eyebrow="Resources" title="เริ่มตรวจสอบจากแหล่งข้อมูลทางการ"><p>นโยบายและเงื่อนไขเปลี่ยนแปลงได้ โปรดตรวจข้อมูลล่าสุดกับหน่วยงานที่เกี่ยวข้องก่อนตัดสินใจ</p></PageHero><section className="site-shell resource-list">{resources.map((resource) => <a key={resource.name} href={resource.href} target="_blank" rel="noreferrer"><div><h2>{resource.name}</h2><p>{resource.note}</p></div><ExternalLink size={20} /></a>)}<div className="callout"><strong>สถานะการอ้างอิง</strong><p>ตัวเลขนโยบายที่ปรากฏบนเว็บไซต์ยังไม่รวมในผลคำนวณหลัก และต้องตรวจซ้ำก่อนเปิดใช้จริง</p></div></section></main>;
}
