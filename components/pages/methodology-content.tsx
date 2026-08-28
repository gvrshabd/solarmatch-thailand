import { PageHero } from '@/components/content/page-hero';
import { solarAssumptions } from '@/config/solar-assumptions';
import type { Locale } from '@/config/i18n';

export function MethodologyContent({ locale = 'th' }: { locale?: Locale }) {
  const english = locale === 'en';
  return (
    <main>
      <PageHero eyebrow="Methodology · Prototype" title={english ? 'One planning estimate, with the method kept open' : 'ตัวเลขวางแผนหนึ่งค่า พร้อมวิธีคำนวณที่ตรวจสอบได้'}>
        <p>{english ? 'The calculator is a household planning model—not an engineering design, quotation, production guarantee, or financial advice.' : 'เครื่องคำนวณนี้เป็นแบบจำลองเพื่อวางแผนสำหรับบ้าน ไม่ใช่แบบวิศวกรรม ใบเสนอราคา คำรับรองผลผลิต หรือคำแนะนำทางการเงิน'}</p>
        <p className="updated-date">{english ? 'Assumption version' : 'สมมติฐานเวอร์ชัน'} {solarAssumptions.version} · {english ? 'sources checked 2026-08-28' : 'ตรวจแหล่งข้อมูล 28 สิงหาคม 2569'}</p>
      </PageHero>

      <section className="site-shell methodology-grid">
        <article className="prose">
          <h2>{english ? 'What the model uses' : 'ข้อมูลที่แบบจำลองใช้'}</h2>
          <ol>
            <li>{english ? 'Keep the typed address in browser session storage. The address text is not geocoded; the user confirms coordinates on an OpenStreetMap map and can correct the province.' : 'เก็บข้อความที่อยู่ใน session storage ของเบราว์เซอร์ ไม่ส่งข้อความไปค้นหาพิกัด ผู้ใช้ยืนยันพิกัดบนแผนที่ OpenStreetMap และแก้ไขจังหวัดได้'}</li>
            <li>{english ? 'Prefer actual monthly kWh. If only a bill amount is known, invert the residential tariff effective for the billing date, including progressive tiers, Ft, service charge and VAT.' : 'ใช้จำนวนหน่วย kWh ก่อน หากมีเพียงยอดค่าไฟ จะย้อนคำนวณด้วยอัตราบ้านอยู่อาศัยที่มีผลตามวันที่ รวมขั้นบันได ค่า Ft ค่าบริการ และ VAT'}</li>
            <li>{english ? 'Classify daytime use from observable household situations and appliances. Appliance choices select a load archetype; they are not treated as measured consumption.' : 'จัดกลุ่มการใช้ไฟกลางวันจากสถานการณ์ที่สังเกตได้และอุปกรณ์ที่ใช้ คำตอบใช้เลือกแบบโหลด ไม่ถูกแปลงเป็นหน่วยไฟตายตัว'}</li>
            <li>{english ? 'Size for present household self-use. Location, direction, slope and shade change production; the model does not quietly recommend a larger system to compensate for a poor roof.' : 'กำหนดขนาดจากการใช้ไฟเองของบ้านปัจจุบัน ตำแหน่ง ทิศ ความลาด และเงาบังปรับผลผลิต แต่แบบจำลองไม่เพิ่มขนาดระบบเงียบ ๆ เพื่อชดเชยหลังคาที่ไม่เหมาะ'}</li>
            <li>{english ? 'Calculate each month’s progressive bill before and after direct solar use. Export, tax, financing and tariff escalation stay outside every headline result.' : 'คำนวณบิลอัตราก้าวหน้าของแต่ละเดือนก่อนและหลังใช้ไฟโซลาร์เอง รายได้ขายไฟ ภาษี เงินกู้ และค่าไฟที่เพิ่มขึ้นไม่รวมในตัวเลขหลักทั้งหมด'}</li>
          </ol>

          <h2>{english ? 'Tariff versioning' : 'การเลือกเวอร์ชันอัตราค่าไฟ'}</h2>
          <p>{english ? 'For bills through August 2026, the model uses the May 2023 residential schedule: 0–150 kWh at ฿3.2484, 151–400 at ฿4.2218 and above 400 at ฿4.4217, plus ฿24.62/month, Ft of ฿0.1623/kWh and 7% VAT.' : 'สำหรับรอบบิลถึงสิงหาคม 2569 แบบจำลองใช้อัตราที่มีผลตั้งแต่พฤษภาคม 2566: 0–150 หน่วย 3.2484 บาท, 151–400 หน่วย 4.2218 บาท และเกิน 400 หน่วย 4.4217 บาท พร้อมค่าบริการ 24.62 บาท/เดือน ค่า Ft 0.1623 บาท/หน่วย และ VAT 7%'}</p>
          <p>{english ? 'From September 2026, automatic selection uses the published schedule: 0–200 kWh at ฿3.0000, 201–400 at ฿4.1584 and above 400 at ฿4.3583, with the same service charge, September–December Ft and VAT. TOU and private billing are never forced through the standard model; their financial result is withheld.' : 'ตั้งแต่กันยายน 2569 ระบบจะเลือกอัตราที่ประกาศไว้โดยอัตโนมัติ: 0–200 หน่วย 3.0000 บาท, 201–400 หน่วย 4.1584 บาท และเกิน 400 หน่วย 4.3583 บาท พร้อมค่าบริการ ค่า Ft รอบกันยายน–ธันวาคม และ VAT เดิม บิล TOU หรือค่าไฟเอกชนจะไม่ถูกบังคับใช้สูตรมาตรฐาน และจะงดผลการเงิน'}</p>

          <h2>{english ? 'Solar production and self-use' : 'ผลผลิตและการใช้ไฟเอง'}</h2>
          <p>{english ? 'The current PVGIS-derived annual planning yields are 1,380 kWh/kWp in Bangkok, 1,376 in Nonthaburi, 1,357 in Pathum Thani and 1,398 in Samut Prakan. A 1,375 fallback is used elsewhere. Monthly production shares are used so avoided bills are not calculated as one annual average.' : 'ค่าผลผลิตเพื่อวางแผนจาก PVGIS ปัจจุบันคือ 1,380 kWh/kWp ในกรุงเทพฯ, 1,376 ในนนทบุรี, 1,357 ในปทุมธานี และ 1,398 ในสมุทรปราการ ส่วนพื้นที่อื่นใช้ค่า fallback 1,375 พร้อมสัดส่วนผลผลิตรายเดือนเพื่อไม่ให้คำนวณบิลจากค่าเฉลี่ยปีเดียว'}</p>
          <p>{english ? 'Direction factors range from 1.00 for the south group to 0.92 for north; a steep north roof uses 0.86. Shade factors are 1.00, 0.96, 0.85 and a 0.75 sensitivity for heavy shade. Unknown shade uses 0.95 but lowers confidence. Self-consumption changes with the daytime-load archetype and the PV-to-household-load ratio; these are transitional planning assumptions, not measured Thai interval data.' : 'ปัจจัยทิศอยู่ระหว่าง 1.00 สำหรับกลุ่มทิศใต้ถึง 0.92 สำหรับทิศเหนือ และหลังคาทิศเหนือที่ชันใช้ 0.86 ปัจจัยเงาบังคือ 1.00, 0.96, 0.85 และ 0.75 เพื่อทดสอบกรณีเงาหนัก ส่วนไม่ทราบใช้ 0.95 แต่ลดความมั่นใจ สัดส่วนใช้ไฟเองเปลี่ยนตามกลุ่มโหลดกลางวันและอัตราผลผลิตเทียบโหลดบ้าน ค่านี้เป็นสมมติฐานเปลี่ยนผ่าน ไม่ใช่ข้อมูลมิเตอร์รายช่วงเวลาที่วัดในไทย'}</p>

          <h2>{english ? 'Planning price and long-term cash view' : 'ราคาเพื่อวางแผนและมุมมองเงินสดระยะยาว'}</h2>
          <p>{english ? 'Cash-price anchors are ฿99,000 at 1.5 kWp, ฿115,000 at 3 kWp, ฿155,000 single-phase or ฿175,000 three-phase at 5 kWp, and approximately ฿250,000–฿260,000 at 10 kWp. Values between anchors are interpolated and rounded to ฿5,000. A comparable battery-free cash quote can replace the market anchor.' : 'ราคากลางเงินสดคือ 99,000 บาทที่ 1.5 kWp, 115,000 บาทที่ 3 kWp, 155,000 บาทแบบ 1 เฟสหรือ 175,000 บาทแบบ 3 เฟสที่ 5 kWp และประมาณ 250,000–260,000 บาทที่ 10 kWp ค่าระหว่างจุดอ้างอิงถูกคั่นและปัดเป็น 5,000 บาท ใบเสนอราคาเงินสดที่ไม่รวมแบตเตอรี่และเทียบได้สามารถแทนราคากลาง'}</p>
          <p>{english ? 'Routine upkeep is ฿3,000, ฿4,000 or ฿5,000 per year by system size. Module production degrades 0.5% annually. Year 13 includes an inverter reserve equal to 23% of planning price, bounded at ฿25,000–฿60,000. The base assumes 0% electricity-price escalation.' : 'ค่าเผื่อดูแลประจำคือ 3,000, 4,000 หรือ 5,000 บาทต่อปีตามขนาดระบบ ผลผลิตแผงลดลง 0.5% ต่อปี และปีที่ 13 สำรองค่าอินเวอร์เตอร์ 23% ของราคา โดยไม่น้อยกว่า 25,000 และไม่เกิน 60,000 บาท กรณีฐานสมมติค่าไฟเพิ่ม 0%'}</p>

          <h2>{english ? 'Planning value, “up to,” and confidence' : 'ค่ากลาง คำว่า “สูงสุด” และความมั่นใจ'}</h2>
          <p>{english ? 'The dominant result is one rounded planning value. Where evidence permits, the “up to” ceiling uses the same household and system with a modest correlated favourable case: 8% above planning at higher confidence or 15% at medium confidence, always capped at 20% and rounded down to ฿50. It never includes export, tax, finance or tariff escalation.' : 'ผลหลักเป็นค่ากลางเพื่อวางแผนหนึ่งค่าที่ปัดแล้ว หากหลักฐานเพียงพอ ตัวเลข “สูงสุด” ใช้บ้านและระบบเดียวกันในกรณีที่ดีขึ้นเล็กน้อย: สูงกว่าค่ากลาง 8% เมื่อมั่นใจสูง หรือ 15% เมื่อมั่นใจปานกลาง จำกัดไม่เกิน 20% และปัดลงทีละ 50 บาท โดยไม่รวมขายไฟ ภาษี เงินกู้ หรือค่าไฟที่เพิ่มขึ้น'}</p>
          <p>{english ? '“Up to” is removed for low confidence, heavy or unknown shade, unresolved TOU/private tariffs, or weak roof evidence. Narrow payback is also removed at low confidence. The internal score cannot override those gates.' : 'คำว่า “สูงสุด” จะถูกถอดเมื่อความมั่นใจต่ำ มีเงาหนักหรือไม่ทราบเงา อัตรา TOU/เอกชนยังไม่ชัด หรือข้อมูลหลังคาอ่อน และจะไม่แสดงคืนทุนแบบแคบเมื่อความมั่นใจต่ำ คะแนนภายในไม่สามารถข้ามเงื่อนไขเหล่านี้ได้'}</p>

          <h2>{english ? 'Primary and policy sources' : 'แหล่งข้อมูลหลักและนโยบาย'}</h2>
          <ul>
            <li><a href="https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis_en" target="_blank" rel="noreferrer">European Commission JRC · PVGIS</a></li>
            <li><a href="https://www.pea.co.th/our-services/tariff" target="_blank" rel="noreferrer">PEA · {english ? 'tariff register' : 'ทะเบียนอัตราค่าไฟ'}</a></li>
            <li><a href="https://www.pea.co.th/our-services/tariff/ft" target="_blank" rel="noreferrer">PEA · Ft</a></li>
            <li><a href="https://ppim.pea.co.th/app/v1/project/solar/detail/6a3df059ee9f0e286c0a1766" target="_blank" rel="noreferrer">PEA · {english ? 'surplus-purchase programme' : 'โครงการรับซื้อไฟส่วนเกิน'}</a></li>
            <li><a href="https://www.rd.go.th/fileadmin/user_upload/kormor/newlaw/dc805.pdf" target="_blank" rel="noreferrer">{english ? 'Revenue Department · Royal Decree No. 805' : 'กรมสรรพากร · พระราชกฤษฎีกาฉบับที่ 805'}</a></li>
            <li><a href="https://operations.osmfoundation.org/policies/tiles/" target="_blank" rel="noreferrer">OpenStreetMap · {english ? 'tile usage policy' : 'นโยบายการใช้แผนที่'}</a></li>
          </ul>
        </article>

        <aside className="assumption-table">
          <h2>{english ? 'Current settings' : 'สรุปค่าปัจจุบัน'}</h2>
          <dl>
            <div><dt>{english ? 'System sizing' : 'การกำหนดขนาด'}</dt><dd>{english ? 'Present self-use first' : 'ใช้ไฟเองปัจจุบันก่อน'}</dd></div>
            <div><dt>{english ? 'System range' : 'ช่วงขนาด'}</dt><dd>1.5–10 kWp</dd></div>
            <div><dt>{english ? 'Module degradation' : 'การเสื่อมของแผง'}</dt><dd>0.5%/{english ? 'year' : 'ปี'}</dd></div>
            <div><dt>{english ? 'Routine upkeep' : 'ค่าดูแลประจำ'}</dt><dd>฿3,000–฿5,000/{english ? 'year' : 'ปี'}</dd></div>
            <div><dt>{english ? 'Inverter reserve' : 'สำรองอินเวอร์เตอร์'}</dt><dd>{english ? 'Year 13 · 23% · ฿25k–฿60k' : 'ปี 13 · 23% · 25k–60k บาท'}</dd></div>
            <div><dt>{english ? 'Tariff escalation' : 'ค่าไฟเพิ่มขึ้น'}</dt><dd>0%</dd></div>
            <div><dt>{english ? 'Surplus purchase' : 'รับซื้อไฟส่วนเกิน'}</dt><dd>฿2.20/kWh · {english ? 'conditional, excluded' : 'มีเงื่อนไข ไม่รวมผล'}</dd></div>
            <div><dt>{english ? 'Tax' : 'ภาษี'}</dt><dd>{english ? 'Conditional, excluded' : 'มีเงื่อนไข ไม่รวมผล'}</dd></div>
            <div><dt>{english ? 'Finance' : 'เงินกู้'}</dt><dd>{english ? 'Not modelled' : 'ยังไม่คำนวณ'}</dd></div>
            <div><dt>{english ? 'Last checked' : 'ตรวจล่าสุด'}</dt><dd>2026-08-28</dd></div>
          </dl>
        </aside>
      </section>
    </main>
  );
}
