import Image from 'next/image';
import { ExternalLink } from 'lucide-react';
import { PageHero } from '@/components/content/page-hero';
import { initialLoadingFactSet } from '@/config/loading-facts';
import type { Locale } from '@/config/i18n';
import type { PublicLoadingFact } from '@/lib/loading-facts/types';
import { getCurrentRelease, getPublishedLoadingFacts } from '@/lib/server/releases';

const resources = {
  th: [
    { name: 'PEA · รายละเอียดโครงการรับซื้อไฟส่วนเกิน', note: 'อัตรา 2.20 บาท/kWh, ระยะเวลา 10 ปี, เพดานส่งออก 5 kW AC และเงื่อนไขโครงการ', href: 'https://ppim.pea.co.th/app/v1/project/solar/detail/6a3df059ee9f0e286c0a1766' },
    { name: 'PEA · ข่าวเปิดรับสมัครโครงการ', note: 'ประกาศเปิดรับสมัครสำหรับบ้านอยู่อาศัยประเภท 1 ตั้งแต่ 1 กรกฎาคม 2569', href: 'https://www.pea.co.th/news/corporate-news/2137' },
    { name: 'MEA · รายละเอียดโครงการ My Energy', note: 'เงื่อนไขสมัคร ข้อกำหนดระบบ และการจำกัดกำลังส่งออกในพื้นที่ MEA', href: 'https://myenergy.mea.or.th/project/6a38ac8d329d02001dd7024e' },
    { name: 'สำนักงาน กกพ. · ประกาศโครงการ (PDF)', note: 'กรอบกำกับ โควตา และเงื่อนไขการรับซื้อไฟส่วนเกิน', href: 'https://erc.or.th/web-upload/200xf869baf82be74c18cc110e974eea8d5c/202606/m_news/9090/3441/file_download/ae5c0f3369d23b692064262036b1725f.pdf' },
    { name: 'กรมสรรพากร · พระราชกฤษฎีกาฉบับที่ 805 (PDF)', note: 'ตัวบทสิทธิยกเว้นภาษีเงินได้บุคคลธรรมดาสำหรับโซลาร์บนหลังคา', href: 'https://www.rd.go.th/fileadmin/user_upload/kormor/newlaw/dc805.pdf' },
    { name: 'PEA · อัตราค่าไฟฟ้า พฤษภาคม 2566 (PDF)', note: 'อัตราฐานบ้านอยู่อาศัยที่ใช้อ้างอิง ณ สิงหาคม 2569', href: 'https://www.pea.co.th/sites/default/files/documents/tariff/Electricity_Tariff_MAY_2023.pdf' },
    { name: 'PEA · อัตราค่าไฟฟ้า กันยายน 2569 (PDF)', note: 'โครงสร้างอัตราบ้านอยู่อาศัยที่ประกาศให้มีผลตั้งแต่กันยายน 2569', href: 'https://www.pea.co.th/sites/default/files/users/user34/attachments/Electricity_Tariff_SEP_2026_3.pdf' },
    { name: 'สำนักงาน กกพ. · ค่า Ft อัตโนมัติ', note: 'แหล่งตรวจค่า Ft ปัจจุบันและรอบประกาศที่เกี่ยวข้อง', href: 'https://www.erc.or.th/th/automatic' },
    { name: 'คณะกรรมาธิการยุโรป JRC · PVGIS', note: 'ข้อมูลพลังงานแสงอาทิตย์ที่ใช้สร้างค่าผลผลิตอ้างอิงระดับจังหวัด', href: 'https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis_en' },
    { name: 'OpenStreetMap · นโยบายการใช้แผนที่', note: 'เงื่อนไขของแผนที่ที่ใช้ยืนยันตำแหน่ง โดยไม่ส่งข้อความที่อยู่ไปค้นหา', href: 'https://operations.osmfoundation.org/policies/tiles/' },
    { name: 'Greener Bangkok · คู่มือติดตั้งโซลาร์สำหรับบ้าน', note: 'ข้อมูลประกอบเรื่องผลผลิต การประเมินหลังคา และขั้นตอนติดตั้ง', href: 'https://greener.bangkok.go.th/en/solarcity/solar-installation-guide-for-homes/' },
  ],
  en: [
    { name: 'PEA · Surplus-purchase programme details', note: '฿2.20/kWh rate, 10-year term, 5 kW AC export limit, and programme conditions', href: 'https://ppim.pea.co.th/app/v1/project/solar/detail/6a3df059ee9f0e286c0a1766' },
    { name: 'PEA · Programme opening announcement', note: 'Opening for Type 1 residential applicants from 1 July 2026', href: 'https://www.pea.co.th/news/corporate-news/2137' },
    { name: 'MEA · My Energy programme details', note: 'Application, system, and export-control conditions within the MEA service area', href: 'https://myenergy.mea.or.th/project/6a38ac8d329d02001dd7024e' },
    { name: 'Energy Regulatory Commission · Programme notice (PDF)', note: 'Regulatory framework, quota, and conditions for surplus purchases', href: 'https://erc.or.th/web-upload/200xf869baf82be74c18cc110e974eea8d5c/202606/m_news/9090/3441/file_download/ae5c0f3369d23b692064262036b1725f.pdf' },
    { name: 'Revenue Department · Royal Decree No. 805 (PDF)', note: 'Legal text for the personal-income-tax treatment of qualifying rooftop solar', href: 'https://www.rd.go.th/fileadmin/user_upload/kormor/newlaw/dc805.pdf' },
    { name: 'PEA · May 2023 electricity tariff (PDF)', note: 'Base residential tariff referenced for August 2026', href: 'https://www.pea.co.th/sites/default/files/documents/tariff/Electricity_Tariff_MAY_2023.pdf' },
    { name: 'PEA · September 2026 electricity tariff (PDF)', note: 'Residential tariff structure announced to take effect from September 2026', href: 'https://www.pea.co.th/sites/default/files/users/user34/attachments/Electricity_Tariff_SEP_2026_3.pdf' },
    { name: 'Energy Regulatory Commission · Automatic Ft', note: 'Official source for current fuel-adjustment charges and periods', href: 'https://www.erc.or.th/th/automatic' },
    { name: 'European Commission JRC · PVGIS', note: 'Solar-resource evidence used to establish province-level production anchors', href: 'https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis_en' },
    { name: 'OpenStreetMap · Tile policy', note: 'Terms for the map used to confirm a location without sending typed address text to a geocoder', href: 'https://operations.osmfoundation.org/policies/tiles/' },
    { name: 'Greener Bangkok · Home solar installation guide', note: 'Reference information on production, roof review, and installation steps', href: 'https://greener.bangkok.go.th/en/solarcity/solar-installation-guide-for-homes/' },
  ],
} satisfies Record<Locale, Array<{ name: string; note: string; href: string }>>;

function builtInFacts(): PublicLoadingFact[] {
  return initialLoadingFactSet.facts.map((fact) => ({ ...fact, imageUrl: `/images/loading-facts/${fact.sketchId}.svg` }));
}

async function publishedFacts() {
  try {
    const release = await getCurrentRelease();
    return release?.fact_set_version_id ? await getPublishedLoadingFacts(release.fact_set_version_id) : builtInFacts();
  } catch { return builtInFacts(); }
}

export async function ResourcesContent({ locale }: { locale: Locale }) {
  const english = locale === 'en';
  const facts = await publishedFacts();
  return (
    <main>
      <PageHero eyebrow={english ? 'Resources · checked 2026-09-01' : 'แหล่งข้อมูล · ตรวจสอบล่าสุด 1 กันยายน 2569'} title={english ? 'Check the figures against their primary sources' : 'ตรวจสอบตัวเลขจากเอกสารต้นทาง'}>
        <p>{english ? 'Policy, tariffs, prices, and conditions can change. These are the sources used by the current model and should be rechecked before a real decision.' : 'นโยบาย อัตราค่าไฟ ราคา และเงื่อนไขเปลี่ยนได้ ลิงก์เหล่านี้คือแหล่งที่ใช้กับแบบจำลองปัจจุบัน และควรตรวจสอบอีกครั้งก่อนตัดสินใจจริง'}</p>
      </PageHero>
      <section className="site-shell resource-list">
        {resources[locale].map((resource) => <a key={resource.name} href={resource.href} target="_blank" rel="noopener noreferrer" aria-label={`${resource.name} (${english ? 'opens in a new tab' : 'เปิดในแท็บใหม่'})`}><div><h2>{resource.name}</h2><p>{resource.note}</p></div><ExternalLink size={20} aria-hidden="true" /></a>)}
        <div className="callout"><strong>{english ? 'Reference status' : 'สถานะการอ้างอิง'}</strong><p>{english ? 'The base result values electricity used within the home first. Surplus-purchase income and tax treatment are excluded because quota, approval, eligibility, and each household’s tax position require separate checks.' : 'ผลหลักคำนวณจากไฟที่ผลิตแล้วใช้เองก่อน รายได้จากไฟส่วนเกินและสิทธิภาษีไม่ถูกบวกเข้าไป เพราะต้องตรวจโควตา การอนุมัติ คุณสมบัติ และสถานการณ์ภาษีของแต่ละบ้าน'}</p></div>
      </section>
      <section className="site-shell solar-fact-resources" aria-labelledby="solar-fact-sources">
        <div className="section-heading"><p className="eyebrow">{english ? 'Research trail' : 'ที่มาของข้อมูล'}</p><h2 id="solar-fact-sources">{english ? 'Sources behind our solar facts' : 'แหล่งข้อมูลของเกร็ดน่ารู้เกี่ยวกับโซลาร์'}</h2><p>{english ? 'These references support the factual subject of each card. The original SolarMatch sketches are decorative interpretations; the authors and institutions do not endorse SolarMatch.' : 'เอกสารเหล่านี้รองรับสาระของเกร็ดแต่ละข้อ ส่วนภาพลายเส้นเป็นงานตกแต่งต้นฉบับของ SolarMatch ผู้เขียนและหน่วยงานต้นทางไม่ได้รับรอง SolarMatch'}</p></div>
        <div className="solar-fact-resource-list">
          {facts.map((fact) => <article id={fact.resourcesAnchor} key={fact.id} className="solar-fact-resource-card"><Image src={fact.imageUrl} width={320} height={220} alt={fact.alt[locale]} /><div><h3>{fact.title[locale]}</h3><p>{fact.copy[locale]}</p><p className="fact-context">{fact.reference.context[locale]}</p><p><strong>{english ? 'Full reference' : 'เอกสารอ้างอิงฉบับเต็ม'}</strong><br />{fact.reference.fullReference}</p><p>{english ? 'Last reviewed:' : 'ตรวจสอบล่าสุด:'} <time dateTime={fact.reviewedOn}>{fact.reviewedOn}</time></p><a className="text-link" href={fact.reference.url} target="_blank" rel="noopener noreferrer">{english ? `Source: ${fact.reference.citation} — View reference` : `แหล่งข้อมูล: ${fact.reference.citation} — ดูเอกสารอ้างอิง`} <ExternalLink size={16} aria-hidden="true" /></a></div></article>)}
        </div>
      </section>
    </main>
  );
}
