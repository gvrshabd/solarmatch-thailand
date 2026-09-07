import { PageHero } from '@/components/content/page-hero';
import { solarAssumptions } from '@/config/solar-assumptions';
import type { Locale } from '@/config/i18n';

export function MethodologyContent({ locale = 'th' }: { locale?: Locale }) {
  const english = locale === 'en';
  return (
    <main>
      <PageHero eyebrow="Methodology" title={english ? 'A useful ballpark without pretending it is a quote' : 'ค่าประเมินที่มีประโยชน์ โดยไม่ทำให้ดูเหมือนใบเสนอราคา'}>
        <p>{english ? 'SolarMatch turns a normal electricity bill and a few easy property answers into one conservative planning result. An installer still needs to inspect the site and issue the final design and price.' : 'SolarMatch เปลี่ยนค่าไฟของเดือนปกติและข้อมูลสถานที่ที่ตอบง่าย ให้เป็นผลประเมินเบื้องต้นหนึ่งชุด โดยผู้ติดตั้งยังต้องตรวจหน้างาน ออกแบบ และเสนอราคาจริง'}</p>
        <p className="updated-date">{english ? 'Sources checked 2 September 2026' : 'ตรวจแหล่งข้อมูล 2 กันยายน 2569'} · {solarAssumptions.version}</p>
      </PageHero>

      <section className="site-shell methodology-grid">
        <article className="prose">
          <h2>{english ? 'What you provide' : 'ข้อมูลที่คุณตอบ'}</h2>
          <p>{english ? 'The main assessment asks for your location, typical monthly bill, property and roof characteristics, daytime electricity use and major daytime loads. Optional roof-area, direction and slope details can refine the result. “Unsure” is available where a reasonable person may not know.' : 'แบบประเมินหลักถามตำแหน่งที่ตั้ง ค่าไฟในเดือนปกติ ลักษณะบ้านและหลังคา การใช้ไฟช่วงกลางวัน และอุปกรณ์หลักที่ใช้ไฟช่วงกลางวัน ส่วนข้อมูลพื้นที่ ทิศ และความลาดของหลังคาเป็นข้อมูลเสริมที่ช่วยปรับผลให้ละเอียดขึ้น โดยมีตัวเลือก “ไม่แน่ใจ” ในเรื่องที่ผู้ใช้ทั่วไปอาจไม่ทราบ'}</p>

          <h2>{english ? 'How the estimate is built' : 'วิธีสร้างค่าประเมิน'}</h2>
          <p>{english ? 'The bill is converted to estimated electricity use using the applicable PEA or MEA residential tariff, including tiers, the applicable Ft charge and VAT. A conservative starting system is estimated from the bill, likely daytime consumption, property type and any optional roof-area details. Province, visible shade and any optional roof direction or slope adjust expected generation using long-run solar data rather than assuming constant clear weather. Savings are the estimated difference between the electricity bill before and after directly used solar electricity. Export income, tax relief, finance costs and future electricity-price changes are excluded. The 25-year estimate subtracts the planning installation price and an annual maintenance/component reserve, then applies 0.5% yearly module degradation.' : 'ยอดค่าไฟถูกแปลงเป็นการใช้ไฟโดยประมาณด้วยอัตราค่าไฟบ้านของ PEA หรือ MEA ที่ใช้กับพื้นที่นั้น รวมอัตราขั้นบันได ค่า Ft ที่ใช้บังคับ และ VAT จากนั้นประเมินขนาดระบบเริ่มต้นอย่างระมัดระวังจากยอดค่าไฟ การใช้ไฟช่วงกลางวันที่น่าจะเกิดขึ้น ประเภทบ้าน และข้อมูลพื้นที่หลังคาเสริม (ถ้ามี) จังหวัด เงาบังที่มองเห็น รวมถึงทิศหรือความลาดของหลังคาที่ผู้ใช้เพิ่มภายหลัง จะปรับการผลิตไฟจากข้อมูลพลังงานแสงอาทิตย์ระยะยาวโดยไม่สมมติว่าฟ้าใสตลอดเวลา เงินประหยัดคือส่วนต่างโดยประมาณระหว่างค่าไฟก่อนและหลังนำไฟโซลาร์ไปใช้โดยตรง ทั้งนี้ไม่รวมรายได้จากการขายไฟ สิทธิภาษี ต้นทุนทางการเงิน และการเปลี่ยนแปลงค่าไฟในอนาคต การประเมิน 25 ปีหักราคาติดตั้งเพื่อวางแผนและเงินสำรองค่าบำรุงรักษา/อุปกรณ์รายปี พร้อมคำนวณการเสื่อมของแผง 0.5% ต่อปี'}</p>

          <h2>{english ? 'What the result means' : 'ความหมายของผลลัพธ์'}</h2>
          <p>{english ? 'The result is a lead-qualification ballpark: useful for deciding whether to request a site assessment and what to ask a solar company. It is not an engineering design, quotation, financial guarantee, or approval from a utility or tax authority.' : 'ผลลัพธ์เป็นค่าประเมินเพื่อคัดกรองความสนใจ ช่วยตัดสินใจว่าจะขอประเมินหน้างานหรือไม่ และควรถามบริษัทโซลาร์เรื่องใด ไม่ใช่แบบวิศวกรรม ใบเสนอราคา การรับประกันทางการเงิน หรือการอนุมัติจากการไฟฟ้าหรือหน่วยงานภาษี'}</p>

          <h2>{english ? 'Primary evidence' : 'หลักฐานหลัก'}</h2>
          <ul>
            <li><a href="https://www.mea.or.th/our-services/tariff-calculation/other/evlowpriority" target="_blank" rel="noreferrer">MEA · {english ? 'residential tariff information' : 'ข้อมูลอัตราค่าไฟบ้าน'}</a></li>
            <li><a href="https://www.pea.co.th/our-services/tariff" target="_blank" rel="noreferrer">PEA · {english ? 'tariff register' : 'ทะเบียนอัตราค่าไฟ'}</a></li>
            <li><a href="https://www.erc.or.th/th/automatic" target="_blank" rel="noreferrer">ERC · Ft {english ? 'for September–December 2026' : 'กันยายน–ธันวาคม 2569'}</a></li>
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
            <div><dt>{english ? 'Electricity-use input' : 'ข้อมูลการใช้ไฟ'}</dt><dd>{english ? 'Monthly bill only; no kWh lookup' : 'ใช้ยอดค่าไฟรายเดือนเท่านั้น ไม่ต้องหา kWh'}</dd></div>
            <div><dt>{english ? 'Weather' : 'สภาพอากาศ'}</dt><dd>{english ? 'Long-run solar resource' : 'ข้อมูลแดดระยะยาว'}</dd></div>
            <div><dt>{english ? 'Tariff escalation' : 'ค่าไฟเพิ่มขึ้น'}</dt><dd>0%</dd></div>
            <div><dt>{english ? 'Module degradation' : 'การเสื่อมของแผง'}</dt><dd>0.5%/{english ? 'year' : 'ปี'}</dd></div>
            <div><dt>{english ? 'Annual maintenance/component reserve' : 'เงินสำรองค่าบำรุงรักษา/อุปกรณ์รายปี'}</dt><dd>1.02% {english ? 'of planning price/year' : 'ของราคาเพื่อวางแผน/ปี'}</dd></div>
            <div><dt>{english ? 'Export income and tax relief' : 'รายได้จากการขายไฟและสิทธิภาษี'}</dt><dd>{english ? 'Excluded from this estimate' : 'ไม่รวมในค่าประเมินนี้'}</dd></div>
            <div><dt>{english ? 'Finance costs' : 'ต้นทุนทางการเงิน'}</dt><dd>{english ? 'Excluded from this estimate' : 'ไม่รวมในค่าประเมินนี้'}</dd></div>
            <div><dt>{english ? 'Calculation horizon' : 'ช่วงคำนวณ'}</dt><dd>25 {english ? 'years' : 'ปี'}</dd></div>
          </dl>
        </aside>
      </section>
    </main>
  );
}
