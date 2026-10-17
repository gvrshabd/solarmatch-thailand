import { PageHero } from '@/components/content/page-hero';
import { CALCULATOR_MODEL_VERSION } from '@/lib/calculator/residential-estimator';
import { REFERENCE_ANNUAL_YIELD_KWH_PER_KWP } from '@/lib/calculator/energy-model';
import { solarPackages, SOLAR_PACKAGE_CATALOG_VERSION } from '@/config/solar-packages';
import { solarResourceV3 } from '@/config/solar-resource-v3';
import type { Locale } from '@/config/i18n';
import { legalReviewDisclosures, prelaunchNotice } from '@/config/legal-review';

export function MethodologyContent({ locale = 'th' }: { locale?: Locale }) {
  const english = locale === 'en';
  return (
    <main>
      <PageHero eyebrow="Methodology" title={english ? 'How we calculate your estimate' : 'เราคำนวณผลประเมินอย่างไร'}>
        <p>{english ? 'SolarMatch compares a finite set of rooftop systems using monthly solar reference data, synthetic hourly disaggregation and household load shapes. These hourly profiles have not been validated for your home. An installer still needs to survey the site and issue a design and price.' : 'SolarMatch เปรียบเทียบระบบโซลาร์ตามชุดอุปกรณ์ที่มีข้อมูล โดยใช้ผลผลิตอ้างอิงรายเดือน กระจายเป็นรายชั่วโมง และจำลองรูปแบบโหลดของบ้าน รูปแบบรายชั่วโมงนี้ยังไม่ได้ตรวจสอบกับบ้านของคุณ ผู้ติดตั้งยังต้องสำรวจหน้างาน ออกแบบ และเสนอราคาจริง'}</p>
        <p className="updated-date">{english ? 'Model reference 17 October 2026' : 'วันที่อ้างอิงแบบจำลอง 17 ตุลาคม 2569'} · {CALCULATOR_MODEL_VERSION} · {SOLAR_PACKAGE_CATALOG_VERSION}</p>
      </PageHero>

      <section className="site-shell methodology-grid">
        <article className="prose">
          <h2>{english ? 'What you provide' : 'ข้อมูลที่คุณตอบ'}</h2>
          <p>{english ? 'Start with a typical bill or actual kWh and billing-period length. A dated bill, utility and tariff category distinguish historical consumption from the tariff used to value future savings. Optional monthly records describe seasonality. Roof area, direction, tilt, electricity phase, weekday/weekend usage and appliance schedules refine the scenario; unknown facts remain visible assumptions.' : 'เริ่มจากยอดค่าไฟเดือนปกติ หรือหน่วยไฟจริงและจำนวนวันในรอบบิล วันที่ใบแจ้งค่าไฟ การไฟฟ้า และประเภทอัตรา ช่วยแยกการใช้ไฟย้อนหลังจากอัตราที่ใช้อ้างอิงผลประหยัดในอนาคต ข้อมูลแต่ละเดือนช่วยแสดงฤดูกาล พื้นที่หลังคา ทิศ มุมเอียง ระบบเฟส การใช้ไฟวันทำงานและวันหยุด รวมถึงช่วงเวลาใช้อุปกรณ์ช่วยปรับผลจำลอง โดยข้อมูลที่ไม่ทราบจะแสดงเป็นสมมติฐาน'}</p>

          <h2>{english ? 'How the estimate is built' : 'วิธีสร้างค่าประเมิน'}</h2>
          <p>{english ? 'Actual kWh takes precedence over bill inversion. Otherwise the dated ordinary residential tariff converts the bill to approximate consumption, including energy tiers, service charge, Ft and VAT. When the bill date or category is unknown, the result identifies its reference assumptions. Unsupported dates, categories such as TOU, and demand outside the supported residential range do not receive a fabricated financial recommendation.' : 'หากมีหน่วยไฟจริงจะใช้ก่อนการคำนวณย้อนจากยอดเงิน หากไม่มี จะใช้อัตราบ้านอยู่อาศัยแบบปกติตามวันที่เพื่อประมาณการใช้ไฟ รวมขั้นบันได ค่าบริการ ค่า Ft และ VAT หากไม่ทราบวันที่หรือประเภทอัตรา ผลจะแสดงสมมติฐานอ้างอิง วันที่หรือประเภทที่ยังไม่รองรับ เช่น TOU รวมถึงโหลดที่อยู่นอกขอบเขตบ้านอยู่อาศัย จะไม่แสดงคำแนะนำทางการเงินที่สร้างขึ้นโดยไม่มีข้อมูลรองรับ'}</p>
          <p>{english ? 'The model distributes monthly demand across synthetic hourly weekday and weekend shapes. Existing air conditioning, EV charging and pumps redistribute electricity already included in the bill; they do not add that energy again. Quantified future loads add demand only from their stated start month. An appliance name without energy, power and timing adds no guessed kWh.' : 'แบบจำลองกระจายการใช้ไฟรายเดือนลงในรูปแบบรายชั่วโมงของวันทำงานและวันหยุด เครื่องปรับอากาศ รถ EV และปั๊มที่มีอยู่แล้วจะปรับช่วงเวลาของไฟที่รวมอยู่ในบิล ไม่บวกหน่วยไฟซ้ำ โหลดในอนาคตที่ระบุปริมาณจะเพิ่มตั้งแต่เดือนเริ่มใช้ที่กำหนด ชื่ออุปกรณ์ที่ไม่มีข้อมูลพลังงาน กำลังไฟ และช่วงเวลาจะไม่ถูกแปลงเป็นหน่วยไฟโดยเดา'}</p>
          <p>{english ? 'The solar baseline is an auditable European Commission JRC PVGIS ERA5 snapshot for 2005–2023 at the Bangkok reference point (13.75°N, 100.5°E), checked on 17 October 2026: crystalline-silicon, building-integrated panels, 15° tilt facing south and 14% system losses. Its reference output is 1,398.23 kWh/kWp/year. Those losses are already included; no additional generic loss factor is applied. The monthly mean output is disaggregated into synthetic hourly mean-day profiles, with relative panel-plane and shade adjustments and an AC inverter cap. The hourly timing is not measured household or site weather data. This is a regional illustration: entering your coordinates does not retrieve local weather or validate your site.' : 'ฐานผลผลิตอ้างอิงมาจากข้อมูล PVGIS ERA5 ของ JRC คณะกรรมาธิการยุโรป ช่วงปี 2005–2023 ณ จุดอ้างอิงกรุงเทพฯ (13.75°N, 100.5°E) ตรวจเมื่อ 17 ตุลาคม 2569 โดยใช้แผงผลึกซิลิคอน ติดตั้งแบบรวมกับอาคาร มุมเอียง 15° หันใต้ และการสูญเสียระบบ 14% ให้ผลผลิตอ้างอิง 1,398.23 หน่วยต่อ kWp ต่อปี ค่านี้รวมการสูญเสียดังกล่าวแล้ว จึงไม่หักปัจจัยสูญเสียทั่วไปซ้ำ ผลผลิตเฉลี่ยรายเดือนถูกกระจายเป็นรูปแบบวันเฉลี่ยรายชั่วโมงจำลอง แล้วปรับแนวแผงและเงาบังเทียบกับฐาน รวมทั้งจำกัดด้วยกำลัง AC ของอินเวอร์เตอร์ เวลาเกิดผลผลิตรายชั่วโมงไม่ใช่ข้อมูลมิเตอร์หรืออากาศที่วัดจริง ณ บ้าน เป็นตัวอย่างระดับภูมิภาค การกรอกพิกัดไม่ได้ดึงข้อมูลอากาศท้องถิ่นหรือยืนยันหน้างาน'}</p>
          <p>{english ? 'Each hour matches solar generation to demand, caps output at inverter AC capacity, and separates direct use, grid imports and surplus. Savings are the difference between monthly utility bills before and after solar. The 25-year path reduces generation by 0.5% each year, then repeats hourly matching and tariff calculation; it does not simply reduce an initial cash saving by 0.5%. The reference tariff is held constant as a scenario, not a forecast of legally effective tariffs for 25 years.' : 'แต่ละชั่วโมงจับคู่ไฟที่ผลิตกับความต้องการ จำกัดผลผลิตตามกำลัง AC และแยกไฟที่ใช้โดยตรง ไฟที่ซื้อจากโครงข่าย และไฟส่วนเกิน ผลประหยัดคือส่วนต่างของค่าไฟรายเดือนก่อนและหลังติดตั้ง การคำนวณ 25 ปีลดการผลิตลง 0.5% ต่อปี แล้วจับคู่โหลดและคำนวณค่าไฟใหม่ ไม่ใช่ลดเงินประหยัดตั้งต้นลง 0.5% โดยตรง โดยคงอัตราอ้างอิงไว้เป็นฉากทัศน์ ไม่ใช่พยากรณ์ว่าอัตรานั้นจะมีผลตามกฎหมายตลอด 25 ปี'}</p>

          <h2>{english ? 'Which system and price are compared' : 'ระบบและราคาที่นำมาเปรียบเทียบ'}</h2>
          <p>{english ? 'The catalogue contains four supplier-published configurations: 3.30, 5.005, 5.50 and 10.45 kWp DC with their stated AC inverters and phase. These are finite choices, not a price curve scaled to any desired size. Usable roof area, phase and budget filter feasibility. A feasible choice with positive lifetime value may be suggested; if no choice is feasible or economic, the result says so. Unknown phase or roof facts make a recommendation conditional.' : 'แค็ตตาล็อกมีชุดอุปกรณ์ที่ผู้ขายเผยแพร่สี่ชุด: 3.30, 5.005, 5.50 และ 10.45 kWp DC พร้อมอินเวอร์เตอร์ AC และระบบเฟสตามที่ระบุ เป็นตัวเลือกจำกัด ไม่ใช่เส้นราคาที่ปรับเป็นขนาดใดก็ได้ พื้นที่หลังคาที่ใช้ได้ เฟส และงบประมาณใช้คัดความเป็นไปได้ ระบบที่เป็นไปได้และมีผลประโยชน์ตลอดอายุเป็นบวกอาจได้รับการแนะนำ หากไม่มีระบบที่ติดตั้งได้หรือคุ้มค่า ผลจะแจ้งตามนั้น หากไม่ทราบเฟสหรือพื้นที่หลังคา คำแนะนำจะยังมีเงื่อนไข'}</p>
          <p>{english ? 'Published starting prices have one 7% planning contingency because VAT status is not stated; this is not a confirmed tax charge. Structural work, utility fees, exact equipment availability and site scope need confirmation. A user quote keeps its exact stated DC size, inverter AC capacity and cash price. Module count × module Wp checks the stated DC size; a mismatch is rejected as unsupported until the equipment details are corrected. The quote never becomes a price anchor for other packages. Battery projects and expansion of an existing system need a separate model; an explicitly selected new-system solar-only illustration is labelled as such.' : 'ราคาเริ่มต้นที่เผยแพร่บวกเงินเผื่อวางแผน 7% ครั้งเดียว เนื่องจากไม่ได้ระบุสถานะ VAT จึงไม่ใช่การยืนยันภาษีจริง งานโครงสร้าง ค่าธรรมเนียมการไฟฟ้า อุปกรณ์ที่มีจำหน่าย และขอบเขตงานต้องตรวจสอบอีกครั้ง ใบเสนอราคาของผู้ใช้จะคงขนาด DC กำลัง AC และราคาเงินสดตามที่ระบุ โดยตรวจขนาด DC กับจำนวนแผง × วัตต์ต่อแผง หากไม่ตรงกันจะยังไม่คำนวณการเงินจนกว่าจะแก้ข้อมูลอุปกรณ์ และไม่ใช้ใบเสนอราคาเป็นฐานปรับราคาแพ็กเกจอื่น โครงการแบตเตอรี่หรือการขยายระบบเดิมต้องใช้แบบจำลองแยก หากเลือกดูตัวอย่างระบบใหม่เฉพาะโซลาร์ ผลจะระบุให้ชัดเจน'}</p>
          <p>{english ? 'Base lifetime benefit subtracts installation cost and a 1.02% annual maintenance/component reserve, including inverter risk once. Export income, personal tax relief and financing are excluded from the base. Optional scenarios remain separate. Sensitivity scenarios vary planning assumptions; they are not statistical confidence intervals.' : 'ผลประโยชน์พื้นฐานตลอดอายุหักค่าติดตั้งและเงินสำรองค่าดูแลกับอุปกรณ์ 1.02% ต่อปี โดยรวมความเสี่ยงอินเวอร์เตอร์ครั้งเดียว ไม่รวมรายได้ขายไฟ สิทธิภาษีบุคคลธรรมดา หรือการผ่อนชำระ ผลจำลองเพิ่มเติมแสดงแยกต่างหาก การวิเคราะห์ความไวปรับสมมติฐานเพื่อวางแผน ไม่ใช่ช่วงความเชื่อมั่นทางสถิติ'}</p>

          <h2>{english ? 'What the result means' : 'ความหมายของผลลัพธ์'}</h2>
          <p>{legalReviewDisclosures.estimate[locale]}</p>
          <p>{prelaunchNotice[locale]}</p>
          <p>{english ? 'The result is a preliminary planning estimate: useful for understanding whether solar may be worth exploring for your property and what to discuss with a solar provider. It is not an engineering design, quotation, financial guarantee, or approval from a utility or tax authority.' : 'ผลลัพธ์เป็นค่าประเมินเบื้องต้นเพื่อใช้ประกอบการวางแผน ช่วยให้เข้าใจว่าโซลาร์อาจเหมาะกับอสังหาริมทรัพย์ของคุณเพียงใด และควรพูดคุยเรื่องใดกับผู้ให้บริการด้านโซลาร์ ไม่ใช่แบบวิศวกรรม ใบเสนอราคา การรับประกันทางการเงิน หรือการอนุมัติจากการไฟฟ้าหรือหน่วยงานภาษี'}</p>

          <h2>{english ? 'Primary evidence' : 'หลักฐานหลัก'}</h2>
          <ul>
            <li><a href="https://www.mea.or.th/our-services/service-rates/other/D5xEaEwgU" target="_blank" rel="noreferrer">MEA · {english ? 'residential tariff information (independent page verification outstanding)' : 'ข้อมูลอัตราค่าไฟบ้าน (ยังต้องตรวจยืนยันหน้าแหล่งข้อมูลโดยตรง)'}</a></li>
            <li><a href="https://www.pea.co.th/our-services/tariff" target="_blank" rel="noreferrer">PEA · {english ? 'tariff register' : 'ทะเบียนอัตราค่าไฟ'}</a></li>
            <li><a href="https://www.erc.or.th/th/automatic" target="_blank" rel="noreferrer">ERC · Ft {english ? 'for September–December 2026' : 'กันยายน–ธันวาคม 2569'}</a></li>
            <li><a href={solarResourceV3.sourceUrl} target="_blank" rel="noreferrer">JRC · PVGIS 5.3 ERA5 · {english ? 'reproduce the monthly reference response' : 'ตรวจซ้ำผลอ้างอิงรายเดือนจาก API'}</a> · {solarResourceV3.retrievedDate}</li>
            {solarPackages.map(item => <li key={item.id}><a href={item.sourceUrl} target="_blank" rel="noreferrer">{item.supplier} · {english ? item.labelEn : item.labelTh}</a> · {english ? 'supplier configuration; availability and scope unconfirmed' : 'ข้อมูลชุดอุปกรณ์จากผู้ขาย ต้องยืนยันสินค้าและขอบเขตงาน'}</li>)}
          </ul>
        </article>

        <aside className="assumption-table">
          <h2>{english ? 'Headline safeguards' : 'หลักป้องกันตัวเลขเกินจริง'}</h2>
          <dl>
            <div><dt>{english ? 'Electricity-use input' : 'ข้อมูลการใช้ไฟ'}</dt><dd>{english ? 'Actual kWh or a dated bill; optional monthly records' : 'หน่วยไฟจริงหรือบิลพร้อมวันที่ เพิ่มข้อมูลรายเดือนได้'}</dd></div>
            <div><dt>{english ? 'Solar reference' : 'ผลผลิตอ้างอิง'}</dt><dd>{REFERENCE_ANNUAL_YIELD_KWH_PER_KWP.toLocaleString(english ? 'en-TH' : 'th-TH')} kWh/kWp/{english ? 'year · PVGIS ERA5 regional reference' : 'ปี · อ้างอิงภูมิภาคจาก PVGIS ERA5'}</dd></div>
            <div><dt>{english ? 'Hourly profiles' : 'รูปแบบรายชั่วโมง'}</dt><dd>{english ? 'Synthetic mean-day timing and load shapes, not measured site profiles' : 'จำลองวันเฉลี่ยและโหลด ไม่ใช่รูปแบบที่วัดจริงหน้างาน'}</dd></div>
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
