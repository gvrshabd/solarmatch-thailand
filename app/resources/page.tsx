import type { Metadata } from 'next';
import { ExternalLink } from 'lucide-react';
import { PageHero } from '@/components/content/page-hero';

export const metadata: Metadata = { title: 'แหล่งข้อมูล' };

const resources = [
  { name: 'PEA · รายละเอียดโครงการรับซื้อไฟส่วนเกิน', note: 'อัตรา 2.20 บาท/kWh, ระยะเวลา 10 ปี, เพดานส่งออก 5 kW AC และเงื่อนไขโครงการ', href: 'https://ppim.pea.co.th/app/v1/project/solar/detail/6a3df059ee9f0e286c0a1766' },
  { name: 'PEA · ข่าวเปิดรับสมัครโครงการ', note: 'ประกาศเปิดรับสมัครสำหรับบ้านอยู่อาศัยประเภท 1 ตั้งแต่ 1 กรกฎาคม 2569', href: 'https://www.pea.co.th/news/corporate-news/2137' },
  { name: 'MEA · รายละเอียดโครงการ My Energy', note: 'เงื่อนไขสมัคร ข้อกำหนดระบบ และการจำกัดกำลังส่งออกในพื้นที่ MEA', href: 'https://myenergy.mea.or.th/project/6a38ac8d329d02001dd7024e' },
  { name: 'สำนักงาน กกพ. · ประกาศโครงการ (PDF)', note: 'กรอบกำกับ โควตา และเงื่อนไขการรับซื้อไฟส่วนเกิน', href: 'https://erc.or.th/web-upload/200xf869baf82be74c18cc110e974eea8d5c/202606/m_news/9090/3441/file_download/ae5c0f3369d23b692064262036b1725f.pdf' },
  { name: 'กรมสรรพากร · พระราชกฤษฎีกาฉบับที่ 805 (PDF)', note: 'ตัวบทสิทธิยกเว้นภาษีเงินได้บุคคลธรรมดาสำหรับโซลาร์บนหลังคา', href: 'https://www.rd.go.th/fileadmin/user_upload/kormor/newlaw/dc805.pdf' },
  { name: 'กรมสรรพากร · รวมกฎหมายพระราชกฤษฎีกา', note: 'หน้ารวมเอกสารทางการสำหรับตรวจสถานะและฉบับกฎหมาย', href: 'https://www.rd.go.th/1603.html' },
  { name: 'กรมสรรพากร · สรุปเงื่อนไขสิทธิโซลาร์ (PDF)', note: 'เงื่อนไขใบกำกับภาษีอิเล็กทรอนิกส์ การเชื่อมต่อ และค่าใช้จ่ายที่ใช้สิทธิได้', href: 'https://rd.go.th/fileadmin/user_upload/lorkhor/newsbanner/2025/11/solar.pdf' },
  { name: 'PEA · อัตราค่าไฟฟ้า พฤษภาคม 2566 (PDF)', note: 'อัตราฐานบ้านอยู่อาศัยที่ใช้อ้างอิง ณ สิงหาคม 2569', href: 'https://www.pea.co.th/sites/default/files/documents/tariff/Electricity_Tariff_MAY_2023.pdf' },
  { name: 'PEA · อัตราค่าไฟฟ้า กันยายน 2569 (PDF)', note: 'โครงสร้างอัตราบ้านอยู่อาศัยที่ประกาศให้มีผลตั้งแต่กันยายน 2569', href: 'https://www.pea.co.th/sites/default/files/users/user34/attachments/Electricity_Tariff_SEP_2026_3.pdf' },
  { name: 'สำนักงาน กกพ. · ค่า Ft อัตโนมัติ', note: 'แหล่งตรวจค่า Ft ปัจจุบันและรอบประกาศที่เกี่ยวข้อง', href: 'https://www.erc.or.th/th/automatic' },
  { name: 'Greener Bangkok · คู่มือติดตั้งโซลาร์สำหรับบ้าน', note: 'ข้อมูลประกอบเรื่องผลผลิต การประเมินหลังคา และขั้นตอนติดตั้ง', href: 'https://greener.bangkok.go.th/en/solarcity/solar-installation-guide-for-homes/' },
  { name: 'GRoof · โบรชัวร์แพ็กเกจ พฤษภาคม 2569 (PDF)', note: 'แหล่งราคาแพ็กเกจที่ใช้สร้างช่วงอ้างอิง ไม่ใช่การรับรองผู้ให้บริการ', href: 'https://groof-public.s3.ap-southeast-1.amazonaws.com/pdfs/GRoofPackage_Brochure_May2026.pdf' },
  { name: 'PEA Shopping · แพ็กเกจ 5 kW Standard', note: 'หนึ่งในจุดอ้างอิงราคาตลาดสำหรับระบบขนาด 5 kW', href: 'https://peashopping.com/product/pea-solar-5kw-1-phase-standard-package/' },
  { name: 'PEA Shopping · แพ็กเกจ 5 kW Premium', note: 'จุดอ้างอิงช่วงราคาด้านบนสำหรับระบบขนาด 5 kW', href: 'https://peashopping.com/product/pea-solar-5kw-1-phase-premium-package/' },
  { name: 'PEA Shopping · แพ็กเกจ 10 kW Standard', note: 'หนึ่งในจุดอ้างอิงราคาตลาดสำหรับระบบขนาด 10 kW', href: 'https://peashopping.com/product/pea-solar-10kw-3-phase-standard-package/' },
  { name: 'PEA Shopping · แพ็กเกจ 10 kW Premium', note: 'จุดอ้างอิงช่วงราคาด้านบนสำหรับระบบขนาด 10 kW', href: 'https://peashopping.com/product/pea-solar-10kw-3-phase-premium-package/' },
];

export default function ResourcesPage() {
  return (
    <main>
      <PageHero eyebrow="Resources · checked 2026-08-28" title="ตรวจสอบตัวเลขจากเอกสารต้นทาง">
        <p>นโยบาย อัตราค่าไฟ ราคา และเงื่อนไขเปลี่ยนได้ ลิงก์เหล่านี้คือแหล่งที่ใช้กับสมมติฐานต้นแบบ และควรตรวจซ้ำก่อนตัดสินใจจริง</p>
      </PageHero>
      <section className="site-shell resource-list">
        {resources.map((resource) => (
          <a key={resource.name} href={resource.href} target="_blank" rel="noreferrer">
            <div><h2>{resource.name}</h2><p>{resource.note}</p></div>
            <ExternalLink size={20} aria-hidden="true" />
          </a>
        ))}
        <div className="callout">
          <strong>สถานะการอ้างอิง</strong>
          <p>ผลหลักคำนวณจากไฟที่ผลิตแล้วใช้เองก่อน รายได้จากไฟส่วนเกินและสิทธิภาษีไม่ถูกบวกเข้าไป เพราะต้องตรวจโควตา การอนุมัติ คุณสมบัติ และสถานการณ์ภาษีของแต่ละบ้าน</p>
        </div>
      </section>
    </main>
  );
}
