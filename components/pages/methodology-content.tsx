import { PageHero } from '@/components/content/page-hero';
import { solarAssumptions } from '@/config/solar-assumptions';
import type { Locale } from '@/config/i18n';

export function MethodologyContent({ locale = 'th' }: { locale?: Locale }) {
  const english = locale === 'en';
  return (
    <main>
      <PageHero eyebrow="Methodology" title={english ? 'A useful ballpark without pretending it is a quote' : 'ค่าประเมินที่มีประโยชน์ โดยไม่ทำให้ดูเหมือนใบเสนอราคา'}>
        <p>{english ? 'SolarMatch turns a normal electricity bill and a few easy property answers into one conservative planning result. An installer still needs to inspect the site and issue the final design and price.' : 'SolarMatch เปลี่ยนค่าไฟของเดือนปกติและข้อมูลสถานที่ที่ตอบง่าย ให้เป็นผลประเมินเบื้องต้นหนึ่งชุด โดยผู้ติดตั้งยังต้องตรวจหน้างาน ออกแบบ และเสนอราคาจริง'}</p>
        <p className="updated-date">{english ? 'Sources checked 28 August 2026' : 'ตรวจแหล่งข้อมูล 28 สิงหาคม 2569'} · {solarAssumptions.version}</p>
      </PageHero>

      <section className="site-shell methodology-grid">
        <article className="prose">
          <h2>{english ? 'What you provide' : 'ข้อมูลที่คุณตอบ'}</h2>
          <p>{english ? 'The required flow asks for province, a typical monthly bill, property type, approximate usable roof area, daytime electricity use, major daytime loads, roof material, and visible shade. “Unsure” is available where a reasonable person may not know.' : 'คำถามหลักมีจังหวัด ค่าไฟต่อเดือน ประเภทสถานที่ พื้นที่หลังคาโดยประมาณ การใช้ไฟและอุปกรณ์ช่วงกลางวัน วัสดุหลังคา และเงาบัง โดยมีตัวเลือก “ไม่แน่ใจ” ในเรื่องที่ผู้ใช้ทั่วไปอาจไม่ทราบ'}</p>

          <h2>{english ? 'How the estimate is built' : 'วิธีสร้างค่าประเมิน'}</h2>
          <ol>
            <li>{english ? 'The bill is converted to estimated electricity use with the applicable current PEA/MEA tariff, including tiers, Ft, service charge, and VAT.' : 'ยอดค่าไฟถูกแปลงเป็นการใช้ไฟโดยประมาณด้วยอัตรา PEA/MEA ปัจจุบัน รวมขั้นบันได ค่า Ft ค่าบริการ และ VAT'}</li>
            <li>{english ? 'A starting system is sized around direct daytime use. Property type and daytime-use answers choose a point inside published Thai load-profile bands.' : 'ขนาดเริ่มต้นเน้นการใช้ไฟเองช่วงกลางวัน โดยประเภทสถานที่และรูปแบบการใช้ไฟเลือกค่าภายในช่วงที่งานวิจัยโหลดไฟในไทยรองรับ'}</li>
            <li>{english ? 'The stated roof area can limit the system. Province, shade, and optional direction and slope adjust expected production using long-run solar data—not an assumption of constant clear weather.' : 'พื้นที่หลังคาที่ระบุสามารถจำกัดขนาดระบบ ส่วนจังหวัด เงาบัง และข้อมูลทิศหรือความลาดที่เพิ่มภายหลังจะปรับผลผลิตจากข้อมูลแดดระยะยาว ไม่ได้สมมติว่าฟ้าใสตลอดเวลา'}</li>
            <li>{english ? 'Savings come from the difference between the tariff bill before and after direct solar use. Export income, tax relief, finance, and electricity-price increases are excluded from headline results.' : 'เงินประหยัดมาจากส่วนต่างของบิลก่อนและหลังใช้ไฟโซลาร์เอง โดยไม่รวมรายได้ขายไฟ สิทธิภาษี เงินกู้ และค่าไฟที่เพิ่มขึ้นในตัวเลขหลัก'}</li>
            <li>{english ? 'The 25-year net figure subtracts the planning installation price and an annual maintenance/component reserve, then applies module degradation.' : 'ตัวเลขสุทธิ 25 ปีหักราคาติดตั้งเพื่อวางแผนและเงินสำรองค่าดูแล/อุปกรณ์รายปี แล้วปรับการเสื่อมของแผง'}</li>
          </ol>

          <h2>{english ? 'What the result means' : 'ความหมายของผลลัพธ์'}</h2>
          <p>{english ? 'The result is a lead-qualification ballpark: useful for deciding whether to request a site assessment and what to ask a solar company. It is not an engineering design, quotation, financial guarantee, or approval from a utility or tax authority.' : 'ผลลัพธ์เป็นค่าประเมินเพื่อคัดกรองความสนใจ ช่วยตัดสินใจว่าจะขอประเมินหน้างานหรือไม่ และควรถามบริษัทโซลาร์เรื่องใด ไม่ใช่แบบวิศวกรรม ใบเสนอราคา การรับประกันทางการเงิน หรือการอนุมัติจากการไฟฟ้าหรือหน่วยงานภาษี'}</p>

          <h2>{english ? 'Primary evidence' : 'หลักฐานหลัก'}</h2>
          <ul>
            <li><a href="https://www.pea.co.th/our-services/tariff" target="_blank" rel="noreferrer">PEA · {english ? 'tariff register' : 'ทะเบียนอัตราค่าไฟ'}</a></li>
            <li><a href="https://erc.or.th/th/news-release/3458" target="_blank" rel="noreferrer">ERC · Ft {english ? 'for September–December 2026' : 'กันยายน–ธันวาคม 2569'}</a></li>
            <li><a href="https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system/pvgis-releases/pvgis-53" target="_blank" rel="noreferrer">European Commission JRC · PVGIS</a></li>
            <li><a href="https://www.mdpi.com/1996-1073/14/11/3329" target="_blank" rel="noreferrer">Energies · {english ? 'Thai rooftop-solar load-profile research' : 'งานวิจัยโหลดไฟโซลาร์รูฟท็อปในไทย'}</a></li>
            <li><a href="https://peashopping.com/product/pea-solar-5kw-1-phase-standard-package/" target="_blank" rel="noreferrer">PEA Shopping · 5 kW {english ? 'package evidence' : 'ราคาแพ็กเกจ'}</a></li>
            <li><a href="https://groof-public.s3.ap-southeast-1.amazonaws.com/pdfs/GRoofPackage_Brochure_May2026.pdf" target="_blank" rel="noreferrer">GRoof · {english ? 'May 2026 market package evidence' : 'หลักฐานราคาแพ็กเกจ พฤษภาคม 2569'}</a></li>
            <li><a href="https://atb.nrel.gov/electricity/2024b/residential_pv" target="_blank" rel="noreferrer">NREL · {english ? 'residential PV maintenance benchmark' : 'เกณฑ์ค่าดูแลโซลาร์ที่อยู่อาศัย'}</a></li>
          </ul>
        </article>

        <aside className="assumption-table">
          <h2>{english ? 'Headline safeguards' : 'หลักป้องกันตัวเลขเกินจริง'}</h2>
          <dl>
            <div><dt>{english ? 'Required input' : 'ข้อมูลหลัก'}</dt><dd>{english ? 'Bill only—no kWh lookup' : 'ใช้ยอดค่าไฟ ไม่ต้องหา kWh'}</dd></div>
            <div><dt>{english ? 'Weather' : 'สภาพอากาศ'}</dt><dd>{english ? 'Long-run solar resource' : 'ข้อมูลแดดระยะยาว'}</dd></div>
            <div><dt>{english ? 'Tariff escalation' : 'ค่าไฟเพิ่มขึ้น'}</dt><dd>0%</dd></div>
            <div><dt>{english ? 'Module degradation' : 'การเสื่อมของแผง'}</dt><dd>0.5%/{english ? 'year' : 'ปี'}</dd></div>
            <div><dt>{english ? 'Maintenance reserve' : 'เงินสำรองค่าดูแล'}</dt><dd>1.02% {english ? 'of price/year' : 'ของราคา/ปี'}</dd></div>
            <div><dt>{english ? 'Export and tax' : 'ขายไฟและภาษี'}</dt><dd>{english ? 'Conditional, excluded' : 'มีเงื่อนไข ไม่รวมผลหลัก'}</dd></div>
            <div><dt>{english ? 'Finance' : 'เงินกู้'}</dt><dd>{english ? 'Excluded' : 'ไม่รวม'}</dd></div>
            <div><dt>{english ? 'Calculation horizon' : 'ช่วงคำนวณ'}</dt><dd>25 {english ? 'years' : 'ปี'}</dd></div>
          </dl>
        </aside>
      </section>
    </main>
  );
}
