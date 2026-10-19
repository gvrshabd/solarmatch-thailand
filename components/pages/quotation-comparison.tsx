'use client';

import { useState, useSyncExternalStore } from 'react';
import Link from '@/components/site/internal-link';
import { PageHero } from '@/components/content/page-hero';
import './quotation-comparison.css';

type Locale = 'th' | 'en';
type Quote = Record<string, string>;
type Field = { id: string; th: string; en: string; multiline?: boolean };
type Group = { id: string; th: string; en: string; fields: Field[] };

const groups: Group[] = [
  { id: 'identity', th: 'ข้อเสนอและราคาเงินสด', en: 'Quote and cash price', fields: [
    { id: 'company', th: 'บริษัทที่ทำสัญญา', en: 'Contracting company' },
    { id: 'date', th: 'วันที่ออกใบเสนอราคา', en: 'Quote date' },
    { id: 'validity', th: 'ราคานี้ใช้ได้ถึง', en: 'Valid until' },
    { id: 'cash', th: 'ราคารวมเงินสด', en: 'Total cash price' },
    { id: 'vat', th: 'ภาษีมูลค่าเพิ่มในราคานี้', en: 'VAT treatment' },
    { id: 'deposit', th: 'เงินมัดจำ', en: 'Deposit' },
    { id: 'milestones', th: 'งวดชำระที่เหลือ', en: 'Remaining payment milestones', multiline: true },
  ] },
  { id: 'equipment', th: 'อุปกรณ์และกำลังระบบ', en: 'Equipment and capacity', fields: [
    { id: 'panels', th: 'รุ่นและจำนวนแผง', en: 'Panel model and quantity' },
    { id: 'dc', th: 'กำลังรวมแผง (kWp DC)', en: 'Total panel capacity (kWp DC)' },
    { id: 'inverter', th: 'รุ่นอินเวอร์เตอร์', en: 'Inverter model' },
    { id: 'ac', th: 'กำลังอินเวอร์เตอร์ (kW AC)', en: 'Inverter capacity (kW AC)' },
    { id: 'battery', th: 'แบตเตอรี่: รุ่น/ความจุ/รวมในราคาหรือไม่', en: 'Battery: model/capacity/price inclusion' },
    { id: 'backup', th: 'ไฟสำรอง: วงจร/ระยะเวลา/รวมในราคาหรือไม่', en: 'Backup: circuits/duration/price inclusion' },
  ] },
  { id: 'site', th: 'งานหน้างานและการอนุมัติ', en: 'Site work and approvals', fields: [
    { id: 'mounting', th: 'ระบบยึดแผงกับหลังคา', en: 'Roof mounting' },
    { id: 'structure', th: 'ตรวจและเสริมโครงสร้าง', en: 'Structural check/reinforcement' },
    { id: 'waterproofing', th: 'งานกันรั่วซึมหลังคา', en: 'Roof waterproofing' },
    { id: 'switchboard', th: 'งานตู้ไฟ/เบรกเกอร์', en: 'Switchboard/breaker work' },
    { id: 'meter', th: 'งานมิเตอร์', en: 'Meter work' },
    { id: 'phase', th: 'การตรวจหรือปรับระบบไฟ 1/3 เฟส', en: 'Single/three-phase check or upgrade' },
    { id: 'applications', th: 'คำขอ/ใบอนุญาต/ผู้รับผิดชอบ/ค่าธรรมเนียม', en: 'Applications/approvals/owner/fees', multiline: true },
  ] },
  { id: 'outcomes', th: 'สมมติฐานและการรับประกัน', en: 'Assumptions and warranties', fields: [
    { id: 'generation', th: 'ผลิตไฟคาดการณ์ต่อปีและสมมติฐาน', en: 'Annual generation and assumptions', multiline: true },
    { id: 'savings', th: 'ประหยัดคาดการณ์และสมมติฐาน', en: 'Savings and assumptions', multiline: true },
    { id: 'equipmentWarranty', th: 'รับประกันอุปกรณ์', en: 'Equipment warranty' },
    { id: 'performanceWarranty', th: 'รับประกันประสิทธิภาพแผง', en: 'Panel performance warranty' },
    { id: 'workmanshipWarranty', th: 'รับประกันงานติดตั้ง', en: 'Workmanship warranty' },
    { id: 'roofWarranty', th: 'รับประกันงานหลังคา', en: 'Roof-work warranty' },
    { id: 'claimCosts', th: 'ค่าแรง/เดินทาง/รื้อถอน/ติดตั้งคืนเมื่อเคลม', en: 'Claim labour/travel/removal/reinstallation', multiline: true },
  ] },
  { id: 'delivery', th: 'ส่งมอบและเงื่อนไขอื่น', en: 'Delivery and other terms', fields: [
    { id: 'monitoring', th: 'ระบบติดตามผลและระยะเวลาบริการ', en: 'Monitoring and service term' },
    { id: 'commissioning', th: 'ทดสอบระบบก่อนส่งมอบ', en: 'Commissioning tests' },
    { id: 'handover', th: 'เอกสารส่งมอบ', en: 'Handover documents' },
    { id: 'aftercare', th: 'บริการหลังติดตั้ง/ช่องทางติดต่อ', en: 'Aftercare/contact' },
    { id: 'timeframe', th: 'ระยะเวลาติดตั้งและเงื่อนไข', en: 'Installation timeframe and conditions' },
    { id: 'exclusions', th: 'รายการที่ไม่รวม', en: 'Exclusions', multiline: true },
    { id: 'finance', th: 'ทางเลือกผ่อนชำระ (แยกจากราคาเงินสด)', en: 'Financing option (separate from cash price)', multiline: true },
  ] },
];

// All entries are invented illustrations, not offers or claims about real companies.
const exampleTh: Quote[] = [
  { company: 'บริษัทตัวอย่าง A / Example A Co.', date: '1 ต.ค. 2026', validity: '15 ต.ค. 2026', cash: '฿210,000', vat: 'รวม VAT / Included', deposit: '30%', milestones: '60% ก่อนติดตั้ง; 10% หลังทดสอบ', panels: 'Example P-500 × 10', dc: '5.0 kWp', inverter: 'Example INV-5', ac: '5.0 kW', battery: 'ไม่รวม / Excluded', backup: 'ไม่รวม / Excluded', mounting: 'รางอลูมิเนียมสำหรับหลังคากระเบื้อง', structure: 'สำรวจเบื้องต้น; ค่าเสริมโครงสร้างแยก', waterproofing: 'ซีลจุดยึด; รับประกัน 2 ปี', switchboard: 'เพิ่มเบรกเกอร์เฉพาะระบบ', meter: 'ค่าเปลี่ยนมิเตอร์ไม่รวม', phase: 'ตรวจหน้างานก่อนยืนยันราคา', applications: 'ผู้ติดตั้งเตรียมเอกสาร; เจ้าของบ้านชำระค่าธรรมเนียม', generation: '7,000 kWh/ปี; สมมติไม่มีเงา', savings: '฿24,000/ปี; ใช้เอง 70%, อัตราค่าไฟคงที่', equipmentWarranty: 'แผง 12 ปี; อินเวอร์เตอร์ 5 ปี', performanceWarranty: 'แผง 25 ปี ตามเงื่อนไขผู้ผลิต', workmanshipWarranty: '2 ปี', roofWarranty: '2 ปีเฉพาะจุดยึด', claimCosts: 'ค่าแรงปีแรก; หลังจากนั้นคิดค่าเดินทาง/รื้อถอน', monitoring: 'แอป 2 ปี', commissioning: 'ทดสอบกำลังและระบบป้องกัน', handover: 'แบบไฟฟ้าและคู่มือ', aftercare: 'โทรศัพท์ในเวลาทำการ', timeframe: '4–6 สัปดาห์หลังอนุมัติ', exclusions: 'เสริมโครงสร้าง, เปลี่ยนมิเตอร์', finance: 'มีทางเลือกผ่อน; ขอใบแสดงยอดรวมแยก' },
  { company: 'บริษัทตัวอย่าง B / Example B Co.', date: '3 ต.ค. 2026', validity: '31 ต.ค. 2026', cash: '฿235,000', vat: 'รวม VAT / Included', deposit: '20%', milestones: '50% วันติดตั้ง; 30% หลังส่งมอบ', panels: 'Example P-550 × 10', dc: '5.5 kWp', inverter: 'Example INV-5', ac: '5.0 kW', battery: 'ไม่รวม / Excluded', backup: 'ไม่รวม / Excluded', mounting: 'รางสำหรับหลังคากระเบื้องพร้อมแผ่นรอง', structure: 'รวมการตรวจ; เสริมโครงสร้างเสนอราคาเพิ่ม', waterproofing: 'ซีลและทดสอบน้ำ; รับประกัน 5 ปี', switchboard: 'รวมเบรกเกอร์และอุปกรณ์ป้องกัน', meter: 'รวมค่าเตรียมงาน; ค่าธรรมเนียมการไฟฟ้าแยก', phase: 'ยืนยันหลังสำรวจ', applications: 'ผู้ติดตั้งยื่นคำขอ; ค่าธรรมเนียมการไฟฟ้าไม่รวม', generation: '7,500 kWh/ปี; สมมติเงาน้อย', savings: '฿26,000/ปี; ใช้เอง 65%, ไม่มีรายได้ขายไฟ', equipmentWarranty: 'แผง 15 ปี; อินเวอร์เตอร์ 10 ปี', performanceWarranty: 'แผง 30 ปี ตามเงื่อนไขผู้ผลิต', workmanshipWarranty: '5 ปี', roofWarranty: '5 ปีเฉพาะจุดยึด', claimCosts: 'รวมค่าแรง/เดินทาง 2 ปี; หลังจากนั้นขอรายละเอียด', monitoring: 'แอป 5 ปี', commissioning: 'ทดสอบและรายงานผล', handover: 'แบบไฟฟ้า, คู่มือ, รายงานทดสอบ', aftercare: 'ช่องทางแจ้งปัญหา; เวลาตอบกลับต้องยืนยัน', timeframe: '6–8 สัปดาห์หลังอนุมัติ', exclusions: 'เสริมโครงสร้าง, ค่าธรรมเนียมการไฟฟ้า', finance: 'ไม่มีรายละเอียด / Not specified' },
  { company: 'บริษัทตัวอย่าง C / Example C Co.', date: '5 ต.ค. 2026', validity: '20 ต.ค. 2026', cash: '฿260,000', vat: 'ขอให้ยืนยัน / Confirm', deposit: '40%', panels: 'Example P-500 × 10', dc: '5.0 kWp', inverter: 'Example Hybrid-5', ac: '5.0 kW', battery: 'แบตเตอรี่ 5 kWh รวมในราคา', backup: 'สำรองเฉพาะวงจรไฟ/ตู้เย็น; ระยะเวลาขึ้นกับโหลด', mounting: 'ขอรายละเอียด / Confirm', applications: 'เจ้าของบ้านลงนามเอกสาร; ค่าใช้จ่ายขอรายละเอียด', generation: '6,900 kWh/ปี; สมมติมีเงาบ่าย', equipmentWarranty: 'แผง 12 ปี; อินเวอร์เตอร์ 5 ปี; แบตเตอรี่ 10 ปี', performanceWarranty: 'แผง 25 ปี ตามเงื่อนไขผู้ผลิต', timeframe: 'ขอให้ยืนยันหลังสำรวจ', finance: 'ผ่อน 60 เดือน; ขออัตราดอกเบี้ยและยอดรวม' },
];

const exampleEn: Quote[] = [
  { company: 'Example A Co. (fictional)', date: '1 Oct 2026', validity: '15 Oct 2026', cash: '฿210,000', vat: 'Included', deposit: '30%', milestones: '60% before installation; 10% after commissioning', panels: 'Example P-500 × 10', dc: '5.0 kWp', inverter: 'Example INV-5', ac: '5.0 kW', battery: 'Excluded', backup: 'Excluded', mounting: 'Aluminium rails for a tiled roof', structure: 'Initial survey only; reinforcement priced separately', waterproofing: 'Seal mounting points; 2-year warranty', switchboard: 'Add a dedicated system breaker', meter: 'Meter replacement fee excluded', phase: 'Site check required before final price', applications: 'Installer prepares documents; homeowner pays fees', generation: '7,000 kWh/year; assumes no shade', savings: '฿24,000/year; 70% self-use, fixed electricity price', equipmentWarranty: 'Panels 12 years; inverter 5 years', performanceWarranty: 'Panels 25 years, subject to manufacturer terms', workmanshipWarranty: '2 years', roofWarranty: '2 years for mounting points only', claimCosts: 'Labour included for year 1; travel and removal charged afterward', monitoring: 'App for 2 years', commissioning: 'Output and protection-system tests', handover: 'Electrical drawings and manual', aftercare: 'Telephone during business hours', timeframe: '4–6 weeks after approval', exclusions: 'Structural reinforcement, meter replacement', finance: 'Instalment option available; request a separate total-cost schedule' },
  { company: 'Example B Co. (fictional)', date: '3 Oct 2026', validity: '31 Oct 2026', cash: '฿235,000', vat: 'Included', deposit: '20%', milestones: '50% on installation day; 30% after handover', panels: 'Example P-550 × 10', dc: '5.5 kWp', inverter: 'Example INV-5', ac: '5.0 kW', battery: 'Excluded', backup: 'Excluded', mounting: 'Tiled-roof rails with protective pads', structure: 'Structural check included; reinforcement quoted separately', waterproofing: 'Seal and water-test; 5-year warranty', switchboard: 'Breakers and protection devices included', meter: 'Preparatory work included; utility fee separate', phase: 'To be confirmed after site survey', applications: 'Installer files applications; utility fees excluded', generation: '7,500 kWh/year; assumes little shade', savings: '฿26,000/year; 65% self-use, no export income', equipmentWarranty: 'Panels 15 years; inverter 10 years', performanceWarranty: 'Panels 30 years, subject to manufacturer terms', workmanshipWarranty: '5 years', roofWarranty: '5 years for mounting points only', claimCosts: 'Labour and travel included for 2 years; ask about later costs', monitoring: 'App for 5 years', commissioning: 'Tests and written report', handover: 'Electrical drawings, manual, test report', aftercare: 'Issue-reporting channel; response time to be confirmed', timeframe: '6–8 weeks after approval', exclusions: 'Structural reinforcement, utility fees', finance: 'Not specified' },
  { company: 'Example C Co. (fictional)', date: '5 Oct 2026', validity: '20 Oct 2026', cash: '฿260,000', vat: 'Ask for confirmation', deposit: '40%', panels: 'Example P-500 × 10', dc: '5.0 kWp', inverter: 'Example Hybrid-5', ac: '5.0 kW', battery: '5 kWh battery included in price', backup: 'Lighting and fridge circuits only; duration depends on load', mounting: 'Ask for details', applications: 'Homeowner signs documents; request a breakdown of fees', generation: '6,900 kWh/year; assumes afternoon shade', equipmentWarranty: 'Panels 12 years; inverter 5 years; battery 10 years', performanceWarranty: 'Panels 25 years, subject to manufacturer terms', timeframe: 'To be confirmed after site survey', finance: '60 monthly payments; ask for interest rate and total payable' },
];

const copy = {
  th: { title: 'ตารางเปรียบเทียบใบเสนอราคาโซลาร์', lede: 'บันทึกรายละเอียดจากใบเสนอราคาจริงของคุณ แล้วเทียบขอบเขตงานและเงื่อนไขทีละข้อก่อนตัดสินใจ', privacy: 'ข้อมูลอยู่ในหน้านี้ชั่วคราวเท่านั้น ไม่บันทึกไว้ เมื่อรีเฟรช ปิดหน้า ออกจากหน้านี้ หรือเปลี่ยนภาษา ข้อมูลจะหาย และการพิมพ์ขึ้นกับการตั้งค่าเครื่องของคุณ', missing: 'ไม่ระบุ (Not specified)', a: 'ใบเสนอราคา A', b: 'ใบเสนอราคา B', c: 'ใบเสนอราคา C', addC: 'เพิ่มใบเสนอราคา C', example: 'แทนข้อมูลที่กรอกด้วยตัวอย่างสมมติ', clear: 'ล้างข้อมูล', print: 'พิมพ์ / บันทึกเป็น PDF ในเครื่อง', caution: 'ช่องที่ไม่ระบุไม่ถือว่ารวมอยู่ในราคา หรือไม่มีค่าใช้จ่าย ควรถามผู้ติดตั้งเป็นลายลักษณ์อักษร', questions: 'คำถามจากตัวอย่าง', q: ['A และ B รวมค่าเปลี่ยนมิเตอร์ ค่าธรรมเนียม และงานเสริมโครงสร้างจริงหรือไม่?', 'B มีราคาสูงกว่า A แต่เพิ่มขนาดแผงและระยะประกันงานติดตั้ง คุ้มกับรูปแบบใช้ไฟจริงหรือไม่?', 'C รวมแบตเตอรี่ แต่ไม่ได้ระบุหลายรายการ ควรขอขอบเขตไฟสำรอง VAT งานหลังคา และค่าเคลมให้ชัดเจน', 'สมมติฐานการใช้ไฟเอง เงา และอัตราค่าไฟของแต่ละข้อเสนอเทียบกันได้หรือไม่?'], exampleNote: 'ตัวอย่างทั้งหมดเป็นเรื่องสมมติ ชื่อ รุ่น ราคา และตัวเลขผลผลิตไม่ใช่ข้อเสนอหรือข้อมูลผู้ติดตั้งจริง', guide: 'อ่านคู่มือซื้อโซลาร์', estimate: 'ลองประเมินขนาดระบบ' },
  en: { title: 'Solar quotation comparison worksheet', lede: 'Copy details from your actual quotes and compare scope and terms point by point before deciding.', privacy: 'Entries stay only in this open page. They are not saved. Refreshing, closing, navigating away or changing language clears them; printing depends on your device settings.', missing: 'Not specified', a: 'Quote A', b: 'Quote B', c: 'Quote C', addC: 'Add Quote C', example: 'Replace entries with fictional example', clear: 'Clear entries', print: 'Print / save PDF on your device', caution: 'An unspecified item is neither included nor free. Ask the installer to confirm it in writing.', questions: 'Questions raised by the example', q: ['Do A and B include the actual meter fee, approval fees and any structural reinforcement?', 'B costs more than A but has more panel capacity and a longer workmanship warranty. Do those differences suit your usage?', 'C includes a battery but leaves many items unstated. Ask about backup circuits, VAT, roof work and claim costs.', 'Are the self-use, shade and electricity-price assumptions comparable across the quotes?'], exampleNote: 'Every company, model, price and generation figure here is fictional and is not a real installer offer.', guide: 'Read the buying guide', estimate: 'Explore an initial estimate' },
} as const;

// SSR controls must not accept entries before React can retain their changes.
const subscribeToReadiness = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

export function QuotationComparison({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const ready = useSyncExternalStore(subscribeToReadiness, clientReady, serverReady);
  const [quotes, setQuotes] = useState<Quote[]>([{},{},{}]);
  const [showC, setShowC] = useState(false);
  const [showExample, setShowExample] = useState(false);
  const visible = showC ? 3 : 2;
  const update = (quote: number, field: string, value: string) => setQuotes(current => current.map((item, index) => index === quote ? { ...item, [field]: value } : item));
  const loadExample = () => { setQuotes((locale === 'th' ? exampleTh : exampleEn).map(item => ({ ...item }))); setShowC(true); setShowExample(true); };
  const clear = () => { setQuotes([{},{},{}]); setShowC(false); setShowExample(false); };

  return <main className="quote-worksheet" aria-busy={!ready}>
    <PageHero eyebrow="SolarMatch · Worksheet" title={t.title}><p>{t.lede}</p></PageHero>
    <div className="site-shell quote-worksheet-body">
      <div className="quote-worksheet-notice"><p>{t.privacy}</p><p>{t.caution}</p></div>
      <div className="quote-worksheet-actions">
        <button type="button" className="button button-secondary" disabled={!ready} onClick={loadExample}>{t.example}</button>
        <button type="button" className="button button-secondary" disabled={!ready} onClick={clear}>{t.clear}</button>
        <button type="button" className="button" disabled={!ready} onClick={() => window.print()}>{t.print}</button>
      </div>
      <label className="quote-worksheet-toggle"><input type="checkbox" disabled={!ready} checked={showC} onChange={event => setShowC(event.target.checked)} />{t.addC}</label>
      {showExample && <aside className="quote-worksheet-example" aria-label={locale === 'th' ? 'ตัวอย่างสมมติ' : 'Fictional example'}>
        <strong>{t.exampleNote}</strong><h2>{t.questions}</h2><ol>{t.q.map(question => <li key={question}>{question}</li>)}</ol>
      </aside>}
      <div className="quote-worksheet-column-heads" style={{ '--quote-count': visible } as React.CSSProperties}><span aria-hidden="true" />{[t.a,t.b,t.c].slice(0,visible).map(label => <strong key={label}>{label}</strong>)}</div>
      {groups.map(group => <section className="quote-worksheet-group" key={group.id} aria-labelledby={`quote-group-${group.id}`}>
        <h2 id={`quote-group-${group.id}`}>{group[locale]}</h2>
        {group.fields.map(field => <div className="quote-worksheet-row" key={field.id} style={{ '--quote-count': visible } as React.CSSProperties}>
          <div className="quote-worksheet-field-name">{field[locale]}</div>
          {[t.a,t.b,t.c].slice(0,visible).map((quoteName,index) => {
            const id = `quote-${index}-${field.id}`;
            const value = quotes[index][field.id] ?? '';
            return <label className="quote-worksheet-cell" key={id} htmlFor={id}>
              <span className="quote-worksheet-mobile-name">{quoteName}</span>
              {field.multiline ? <textarea id={id} disabled={!ready} aria-label={`${quoteName}: ${field[locale]}`} value={value} onChange={event => update(index,field.id,event.target.value)} placeholder={t.missing} rows={2} /> : <input id={id} disabled={!ready} aria-label={`${quoteName}: ${field[locale]}`} value={value} onChange={event => update(index,field.id,event.target.value)} placeholder={t.missing} />}
              {value.trim() && <span className="quote-worksheet-print-value">{value}</span>}
              {!value.trim() && <span className="quote-worksheet-print-missing">{t.missing}</span>}
            </label>;
          })}
        </div>)}
      </section>)}
      <nav className="quote-worksheet-links" aria-label={locale === 'th' ? 'อ่านต่อ' : 'Further reading'}><Link href={locale === 'th' ? '/solar-guide' : '/en/solar-guide'}>{t.guide}</Link><Link href={locale === 'th' ? '/estimate' : '/en/estimate'}>{t.estimate}</Link></nav>
    </div>
  </main>;
}
