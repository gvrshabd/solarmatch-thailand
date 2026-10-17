'use client';

import { useMemo, useState } from 'react';
import {
  calculateExportScenario, calculateFinanceScenario, calculateSolarTaxScenario,
  type ExportSurplusInterval, type SolarTaxEligibilityInput,
} from '@/lib/calculator/scenarios';

export interface OptionalScenariosProps {
  locale: 'en' | 'th';
  installationPriceThb: number;
  annualBillSavingsThb: number;
  annualReserveThb: number;
  lifetimeBenefitThb: number;
  systemDcKwp: number;
  inverterAcKw: number;
  exportIntervals?: ExportSurplusInterval[];
}

const taxFlags = [
  ['personalTaxpayer', 'Individual liable for Thai personal income tax (not a partnership, group or undivided estate)', 'เป็นบุคคลธรรมดาที่มีหน้าที่เสียภาษีเงินได้ (ไม่ใช่ห้างหุ้นส่วน คณะบุคคล หรือกองมรดกที่ยังไม่ได้แบ่ง)'],
  ['residentialType1', 'Residential electricity account, category 1, connected to MEA/PEA', 'เป็นผู้ใช้ไฟฟ้าประเภท 1 บ้านอยู่อาศัย และเชื่อมต่อ กฟน./กฟภ.'],
  ['qualifyingBuilding', 'Installed on a roof, terrace or usable part of a building', 'ติดตั้งบนหลังคา ดาดฟ้า หรือส่วนของอาคารที่เข้าอยู่หรือใช้สอยได้'],
  ['claimantMatchesElectricityAccount', 'Claimant is the named electricity account holder', 'ผู้ใช้สิทธิเป็นผู้มีชื่อในบัญชีผู้ใช้ไฟฟ้า'],
  ['claimantMatchesGridApplicant', 'Claimant is the named grid connection applicant', 'ผู้ใช้สิทธิเป็นผู้มีชื่อขออนุญาตเชื่อมต่อโครงข่าย'],
  ['claimantMatchesGridApproval', 'Claimant is named in the grid connection approval', 'ผู้ใช้สิทธิเป็นผู้มีชื่อได้รับอนุญาตเชื่อมต่อโครงข่าย'],
  ['qualifyingETaxInvoice', 'Qualifying e-Tax invoice from an eligible VAT supplier, with solar description where required for its issue date', 'มีใบกำกับภาษีอิเล็กทรอนิกส์ที่เข้าเงื่อนไข จากผู้ประกอบการ VAT ที่มีสิทธิออก และระบุรายการโซลาร์ตามเกณฑ์ของวันที่ออกเอกสาร'],
  ['claimantMatchesInvoice', 'Invoice taxpayer ID belongs to the same claimant', 'เลขประจำตัวผู้เสียภาษีในใบกำกับภาษีเป็นของผู้ใช้สิทธิคนเดียวกัน'],
  ['notPreviouslyClaimed', 'This claimant has not used this solar tax relief before', 'ผู้ใช้สิทธิยังไม่เคยใช้สิทธิภาษีโซลาร์ตามมาตรการนี้'],
  ['singleSystem', 'This claim covers only one system', 'การใช้สิทธินี้ครอบคลุมระบบเดียว'],
  ['notUsedOtherTaxRelief', 'These expenses have not been used for other tax relief', 'ไม่ได้ใช้ค่าใช้จ่ายนี้เพื่อสิทธิยกเว้นภาษีอื่นซ้ำ'],
  ['notUsedInputVat', 'Input VAT on this invoice has not been deducted from output VAT', 'ไม่ได้นำภาษีซื้อในใบกำกับภาษีนี้ไปหักภาษีขาย'],
  ['utilityTaxNotification', 'Claimant has notified the utility to send tax-relief data to RD', 'แจ้งความประสงค์ใช้สิทธิต่อการไฟฟ้าเพื่อส่งข้อมูลให้กรมสรรพากรแล้ว'],
] as const;
const taxDates = [
  ['contractDate', 'Contract / purchase agreement date', 'วันที่ทำสัญญาหรือข้อตกลงซื้อ'],
  ['paymentDate', 'Qualifying payment date', 'วันที่จ่ายเงินที่เข้าเงื่อนไข'],
  ['installationDate', 'Installation date', 'วันที่ติดตั้ง'],
  ['gridApplicationDate', 'Grid connection application date', 'วันที่ขออนุญาตเชื่อมต่อโครงข่าย'],
  ['gridConnectionDate', 'Successful grid connection date', 'วันที่เชื่อมต่อโครงข่ายสำเร็จ'],
] as const;

function optionalNumber(value: string): number | undefined {
  return value.trim() === '' ? undefined : Number(value);
}

/** All optional inputs are component memory only; never connect these setters to draft/lead state. */
export function OptionalScenarios(props: OptionalScenariosProps) {
  const en = props.locale === 'en';
  const t = (english: string, thai: string) => en ? english : thai;
  const money = (value: number | null) => value === null ? '—'
    : new Intl.NumberFormat(en ? 'en-TH' : 'th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(value);
  const [taxFacts, setTaxFacts] = useState<SolarTaxEligibilityInput>({ mode: 'prospective' });
  const [taxCalculationBasis, setTaxCalculationBasis] = useState<'' | 'ordinary-progressive' | 'complex-or-unsure'>('');
  const [income, setIncome] = useState('');
  const [spend, setSpend] = useState('');
  const [capacity, setCapacity] = useState('');
  const [deposit, setDeposit] = useState('');
  const [term, setTerm] = useState('');
  const [rate, setRate] = useState('');
  const [basis, setBasis] = useState<'' | 'flat' | 'reducing'>('');
  const [upfrontFees, setUpfrontFees] = useState('');
  const [financedFees, setFinancedFees] = useState('');
  const [actualPayment, setActualPayment] = useState('');
  const [exportVerified, setExportVerified] = useState(false);
  const [exportRate, setExportRate] = useState('');
  const [exportStart, setExportStart] = useState('');
  const [exportEnd, setExportEnd] = useState('');
  const [exportCap, setExportCap] = useState('');
  const tax = useMemo(() => calculateSolarTaxScenario({
    eligibility: { ...taxFacts, totalInstalledCapacityKw: optionalNumber(capacity) },
    taxCalculationBasis: taxCalculationBasis || undefined,
    netTaxableIncomeBeforeSolarBaht: optionalNumber(income), qualifyingSpendBaht: optionalNumber(spend),
  }), [taxFacts, taxCalculationBasis, capacity, income, spend]);
  const finance = useMemo(() => calculateFinanceScenario({
    systemCostBaht: props.installationPriceThb,
    depositBaht: optionalNumber(deposit) ?? NaN, termMonths: optionalNumber(term) ?? NaN,
    annualRatePercent: optionalNumber(rate) ?? NaN, rateBasis: basis as 'flat' | 'reducing',
    upfrontFeesBaht: optionalNumber(upfrontFees), financedFeesBaht: optionalNumber(financedFees),
    actualMonthlyPaymentBaht: optionalNumber(actualPayment),
    monthlyBenefitBaht: Math.max(0, props.annualBillSavingsThb) / 12,
  }), [props.installationPriceThb, props.annualBillSavingsThb, deposit, term, rate, basis, upfrontFees, financedFees, actualPayment]);
  const exportScenario = useMemo(() => calculateExportScenario({
    contract: exportVerified ? { verified: true, rateBahtPerKwh: optionalNumber(exportRate) ?? NaN,
      startDate: exportStart, endDate: exportEnd, acExportCapKw: optionalNumber(exportCap) ?? NaN } : undefined,
    intervals: props.exportIntervals ?? [],
  }), [exportVerified, exportRate, exportStart, exportEnd, exportCap, props.exportIntervals]);
  const taxStatus = tax.status === 'compatible'
    ? t('Compatible with the supplied conditions — conditional', 'ข้อมูลสอดคล้องกับเงื่อนไขเบื้องต้น — ยังมีเงื่อนไข')
    : tax.status === 'ineligible' ? t('Ineligible on the supplied facts', 'ไม่เข้าเงื่อนไขตามข้อมูลที่ระบุ')
      : t('Insufficient information to assess eligibility', 'ข้อมูลยังไม่พอประเมินสิทธิ');
  const reset = () => {
    setTaxFacts({ mode: 'prospective' }); setTaxCalculationBasis(''); setIncome(''); setSpend(''); setCapacity('');
    setDeposit(''); setTerm(''); setRate(''); setBasis(''); setUpfrontFees(''); setFinancedFees(''); setActualPayment('');
    setExportVerified(false); setExportRate(''); setExportStart(''); setExportEnd(''); setExportCap('');
  };

  return <section className="card xcard" aria-labelledby="optional-scenarios-title">
    <h2 id="optional-scenarios-title">{t('Extras you may qualify for', 'สิทธิประโยชน์ที่คุณอาจได้รับ')}</h2>
    <p className="note">{t('These scenarios are separate from your electricity savings and installation invoice. Optional inputs stay in this page’s memory and are excluded from saved estimates, share links and enquiries.', 'ผลจำลองแยกจากยอดประหยัดค่าไฟและราคาในใบเสนอราคา ข้อมูลที่กรอกส่วนนี้อยู่ในหน่วยความจำของหน้านี้ ไม่รวมในผลประเมินที่บันทึก ลิงก์แชร์ หรือคำขอใบเสนอราคา')}</p>
    <details className="disc scenario-disclosure"><summary className="xrow"><span className="t"><b>{t('Personal solar tax relief (optional)', 'สิทธิภาษีโซลาร์บุคคลธรรมดา (ไม่บังคับ)')}</b><span>{t('Conditional, one-time income exemption', 'ยกเว้นเงินได้ครั้งเดียวตามเงื่อนไข')}</span></span><i className="scenario-switch" aria-hidden="true"/></summary><div className="in">
      <p>{t('This is an exemption from taxable income, up to ฿200,000 of qualifying spending, not a cash rebate. It applies to qualifying events from 3 March 2026 to 31 December 2028; the claim year is the year grid connection succeeds. This model covers ordinary progressive income tax only.', 'เป็นการยกเว้นเงินได้ตามค่าใช้จ่ายที่เข้าเงื่อนไข สูงสุด 200,000 บาท ไม่ใช่เงินคืนค่าติดตั้ง เหตุการณ์ที่เข้าเงื่อนไขต้องอยู่ในช่วง 3 มีนาคม 2569 ถึง 31 ธันวาคม 2571 ใช้สิทธิในปีที่เชื่อมต่อโครงข่ายสำเร็จ แบบจำลองนี้คำนวณเฉพาะภาษีเงินได้อัตราก้าวหน้าปกติ')}</p>
      <p className="note">{t('For a future purchase, “Yes” means a planned condition, not completed evidence or guaranteed approval. Leave anything unknown as “Unsure”. Joint/spouse claims and special filing cases need individual review.', 'หากยังไม่ได้ซื้อ การเลือก “ใช่” หมายถึงเงื่อนไขที่วางแผนไว้ ยังไม่ใช่หลักฐานที่ทำสำเร็จหรือการรับรองสิทธิ หากไม่ทราบให้เลือก “ไม่แน่ใจ” กรณีคู่สมรสหรือการยื่นภาษีเป็นกรณีพิเศษต้องตรวจสอบแยก')}</p>
      <p className="note">{t('For e-Tax invoices issued from 30 September 2026, the additional solar equipment/installation description is required. Confirm that your invoice meets the rules for its issue date.', 'ใบกำกับภาษีอิเล็กทรอนิกส์ที่ออกตั้งแต่ 30 กันยายน 2569 ต้องมีข้อความเพิ่มเติมระบุอุปกรณ์และการติดตั้งโซลาร์ โปรดตรวจสอบเอกสารตามเกณฑ์ของวันที่ออก')}</p>
      <div className="grid accuracy-fields">
        <label>{t('Scenario timing', 'ช่วงเวลาของข้อมูล')}<select value={taxFacts.mode} onChange={event => setTaxFacts(current => ({ ...current, mode: event.target.value as SolarTaxEligibilityInput['mode'] }))}>
          <option value="prospective">{t('Future purchase / conditional plans', 'วางแผนซื้อในอนาคต / ยังมีเงื่อนไข')}</option><option value="completed">{t('Completed purchase and connection', 'ซื้อ ติดตั้ง และเชื่อมต่อสำเร็จแล้ว')}</option>
        </select></label>
        <label>{t('Tax calculation basis', 'วิธีคำนวณภาษีของคุณ')}<select value={taxCalculationBasis} onChange={event => setTaxCalculationBasis(event.target.value as typeof taxCalculationBasis)}>
          <option value="">{t('Unsure / not checked', 'ไม่แน่ใจ / ยังไม่ได้ตรวจสอบ')}</option>
          <option value="ordinary-progressive">{t('Ordinary progressive income tax only', 'ภาษีเงินได้อัตราก้าวหน้าปกติเท่านั้น')}</option>
          <option value="complex-or-unsure">{t('Alternative tax, tax credits or complex filing / unsure', 'ภาษีวิธีอื่น เครดิตภาษี หรือการยื่นซับซ้อน / ไม่แน่ใจ')}</option>
        </select></label>
        <label>{t('Annual net taxable income BEFORE solar relief (THB)', 'เงินได้สุทธิทั้งปีก่อนใช้สิทธิโซลาร์ (บาท)')}<input type="number" min="0" inputMode="decimal" autoComplete="off" value={income} onChange={event => setIncome(event.target.value)} /></label>
        <label>{t('Qualifying spending (THB)', 'ค่าใช้จ่ายที่เข้าเงื่อนไข (บาท)')}<input type="number" min="0" inputMode="decimal" autoComplete="off" value={spend} placeholder={String(Math.round(props.installationPriceThb))} onChange={event => setSpend(event.target.value)} /></label>
        <label>{t('Total installed capacity at this home (kW, maximum 10)', 'กำลังผลิตติดตั้งรวมของบ้านนี้ (กิโลวัตต์ ไม่เกิน 10)')}<input type="number" min="0" step="any" inputMode="decimal" value={capacity} onChange={event => setCapacity(event.target.value)} /></label>
      </div>
      <p className="note">{t('Choose ordinary progressive tax only if that basis applies to your filing. Alternative minimum tax, tax credits and complex filing calculations are not supported; if unsure, no precise tax saving is shown.', 'เลือกอัตราก้าวหน้าปกติเฉพาะเมื่อใช้วิธีนี้ในการยื่นภาษีของคุณ แบบจำลองไม่รองรับภาษีขั้นต่ำหรือวิธีอื่น เครดิตภาษี และการยื่นกรณีซับซ้อน หากไม่แน่ใจจะไม่แสดงยอดภาษีที่ประหยัดได้เป็นตัวเลขเฉพาะ')}</p>
      <p className="note">{t('Enter net taxable income after expenses and other allowances, not gross salary. The base estimate is ', 'กรอกเงินได้สุทธิหลังหักค่าใช้จ่ายและค่าลดหย่อนอื่น ไม่ใช่เงินเดือนก่อนหัก ระบบที่ประเมินเบื้องต้นคือ ')}{props.systemDcKwp.toLocaleString(en ? 'en-TH' : 'th-TH')} kWp{t('; confirm the legal installed-capacity basis from your documents.', ' โปรดตรวจสอบกำลังผลิตตามเกณฑ์จากเอกสารของคุณ')}</p>
      <div className="grid accuracy-fields">{taxDates.map(([key, english, thai]) => <label key={key}>{t(english, thai)}<input type="date" value={taxFacts[key] ?? ''} onChange={event => setTaxFacts(current => ({ ...current, [key]: event.target.value || undefined }))} /></label>)}</div>
      <div className="grid accuracy-fields">{taxFlags.map(([key, english, thai]) => <label key={key}>{t(english, thai)}<select value={taxFacts[key] === undefined ? '' : String(taxFacts[key])} onChange={event => setTaxFacts(current => ({ ...current, [key]: event.target.value === '' ? undefined : event.target.value === 'true' }))}>
        <option value="">{t('Unsure / not checked', 'ไม่แน่ใจ / ยังไม่ได้ตรวจสอบ')}</option><option value="true">{t('Yes', 'ใช่')}</option><option value="false">{t('No', 'ไม่ใช่')}</option>
      </select></label>)}</div>
      <p role="status"><strong>{taxStatus}</strong></p>
      {tax.status === 'insufficient-information' && <p className="note">{t('Confirm ordinary progressive tax and complete every requirement, date, capacity and amount to calculate this scenario. Unknown facts do not establish eligibility.', 'ยืนยันว่าใช้ภาษีอัตราก้าวหน้าปกติ และระบุเงื่อนไข วันที่ กำลังผลิต และจำนวนเงินให้ครบเพื่อคำนวณ ข้อมูลที่ยังไม่ทราบไม่ถือว่าเข้าเงื่อนไข')}</p>}
      {tax.status === 'ineligible' && <p className="note">{t('At least one answer does not meet the conditions, including the date window or 10 kW limit. No tax benefit is added.', 'มีคำตอบอย่างน้อยหนึ่งข้อที่ไม่ตรงตามเงื่อนไข ซึ่งรวมถึงช่วงวันที่และกำลังผลิตไม่เกิน 10 กิโลวัตต์ จึงไม่รวมสิทธิภาษีในผลจำลอง')}</p>}
      {tax.status === 'compatible' && <>
        <div className="kv">
          <div><span>{t('Modelled income exemption', 'เงินได้ที่ยกเว้นในแบบจำลอง')}</span><b>{money(tax.deductionBaht)}</b></div>
          <div><span>{t('Progressive tax before solar relief', 'ภาษีอัตราก้าวหน้าก่อนใช้สิทธิ')}</span><b>{money(tax.taxBeforeBaht)}</b></div>
          <div><span>{t('Progressive tax after solar relief', 'ภาษีอัตราก้าวหน้าหลังใช้สิทธิ')}</span><b>{money(tax.taxAfterBaht)}</b></div>
          <div><span>{t('One-time conditional tax saving', 'ภาษีที่อาจประหยัดได้ครั้งเดียวตามเงื่อนไข')}</span><b>{money(tax.taxSavingBaht)}</b></div>
          <div><span>{t('Lifetime benefit without personal tax relief', 'ผลประโยชน์ตลอดอายุระบบก่อนรวมสิทธิภาษีบุคคลธรรมดา')}</span><b>{money(props.lifetimeBenefitThb)}</b></div>
          <div><span>{t('Lifetime benefit with this conditional tax saving', 'ผลประโยชน์ตลอดอายุระบบเมื่อรวมภาษีที่อาจประหยัดได้')}</span><b>{money(props.lifetimeBenefitThb + (tax.taxSavingBaht ?? 0))}</b></div>
        </div>
        <p className="note">{t('Conditional claim year: ', 'ปีที่ใช้สิทธิตามเงื่อนไข: ')}{tax.eligibility.claimYear === null ? '—' : tax.eligibility.claimYear + (en ? 0 : 543)}{t('. This does not reduce your installation invoice or your monthly electricity bill. Actual tax depends on your final filing, documents and RD review.', ' สิทธินี้ไม่ลดราคาในใบเสนอราคาติดตั้งหรือค่าไฟรายเดือน ภาษีจริงขึ้นอยู่กับแบบภาษี เอกสาร และการตรวจสอบของกรมสรรพากร')}</p>
      </>}
      <p className="note">{t('Rule checked 17 October 2026. ', 'ตรวจสอบเกณฑ์เมื่อ 17 ตุลาคม 2569 ')}<a href="https://ratchakitcha.soc.go.th/documents/104277.pdf" target="_blank" rel="noreferrer">{t('Royal Decree 805', 'พระราชกฤษฎีกาฯ ฉบับที่ 805')}</a>{' · '}<a href="https://www.rd.go.th/fileadmin/user_upload/kormor/newlaw/dg470A.pdf" target="_blank" rel="noreferrer">{t('RD conditions 470', 'ประกาศอธิบดีฯ ฉบับที่ 470')}</a>{' · '}<a href="https://www.rd.go.th/59670.html" target="_blank" rel="noreferrer">{t('Tax brackets', 'อัตราภาษี')}</a></p>
    </div></details>

    <details className="disc scenario-disclosure"><summary className="xrow"><span className="t"><b>{t('Financing from your actual quote (optional)', 'จำลองการผ่อนจากใบเสนอราคาของคุณ (ไม่บังคับ)')}</b><span>{t('Use your deposit, rate and repayment terms', 'ใช้เงินดาวน์ อัตราดอกเบี้ยและเงื่อนไขผ่อนจริง')}</span></span><i className="scenario-switch" aria-hidden="true"/></summary><div className="in">
      <p>{t('Enter the deposit, term and stated rate basis from your quote. Flat-rate and reducing-balance rates are different calculations. No lender or approval is assumed.', 'กรอกเงินดาวน์ ระยะเวลาผ่อน และวิธีคิดดอกเบี้ยตามใบเสนอราคา ดอกเบี้ยแบบคงที่กับแบบลดต้นลดดอกคำนวณต่างกัน ผลนี้ไม่ได้สมมติผู้ให้กู้หรือการอนุมัติสินเชื่อ')}</p>
      <div className="grid accuracy-fields">
        <label>{t('Deposit (THB)', 'เงินดาวน์ (บาท)')}<input type="number" min="0" inputMode="decimal" value={deposit} onChange={event => setDeposit(event.target.value)} /></label>
        <label>{t('Term (months)', 'ระยะเวลาผ่อน (เดือน)')}<input type="number" min="1" step="1" inputMode="numeric" value={term} onChange={event => setTerm(event.target.value)} /></label>
        <label>{t('Annual rate (%)', 'อัตราดอกเบี้ยต่อปี (%)')}<input type="number" min="0" step="any" inputMode="decimal" value={rate} onChange={event => setRate(event.target.value)} /></label>
        <label>{t('Rate basis', 'วิธีคิดดอกเบี้ย')}<select value={basis} onChange={event => setBasis(event.target.value as typeof basis)}><option value="">{t('Check your quote', 'ตรวจสอบจากใบเสนอราคา')}</option><option value="flat">{t('Flat (original principal)', 'คงที่ (คิดจากเงินต้นเริ่มต้น)')}</option><option value="reducing">{t('Reducing balance, fixed monthly rate', 'ลดต้นลดดอก อัตรารายเดือนคงที่')}</option></select></label>
        <label>{t('Upfront fees (THB, optional)', 'ค่าธรรมเนียมจ่ายล่วงหน้า (บาท ไม่บังคับ)')}<input type="number" min="0" inputMode="decimal" value={upfrontFees} onChange={event => setUpfrontFees(event.target.value)} /></label>
        <label>{t('Fees added to the loan (THB, optional)', 'ค่าธรรมเนียมรวมในยอดกู้ (บาท ไม่บังคับ)')}<input type="number" min="0" inputMode="decimal" value={financedFees} onChange={event => setFinancedFees(event.target.value)} /></label>
        <label>{t('Actual monthly payment from quote (THB, optional)', 'ค่างวดรายเดือนจริงตามใบเสนอราคา (บาท ไม่บังคับ)')}<input type="number" min="0" inputMode="decimal" value={actualPayment} onChange={event => setActualPayment(event.target.value)} /></label>
      </div>
      {finance.status === 'modelled' ? <>
        <div className="kv">
          <div><span>{t('Loan principal, including financed fees', 'ยอดเงินต้น รวมค่าธรรมเนียมที่กู้เพิ่ม')}</span><b>{money(finance.principalBaht)}</b></div>
          <div><span>{t('Initial cash: deposit + upfront fees', 'เงินสดเริ่มต้น: เงินดาวน์ + ค่าธรรมเนียมล่วงหน้า')}</span><b>{money(finance.upfrontCashBaht)}</b></div>
          <div><span>{t('Monthly instalment', 'ค่างวดรายเดือน')}</span><b>{money(finance.monthlyPaymentBaht)}</b></div>
          <div><span>{t('Interest from stated-rate calculation', 'ดอกเบี้ยจากการคำนวณตามอัตราที่ระบุ')}</span><b>{money(finance.modelInterestBaht)}</b></div>
          <div><span>{t('Scheduled instalments total', 'ยอดค่างวดรวมตามระยะเวลาที่ระบุ')}</span><b>{money(finance.scheduledPaymentsTotalBaht)}</b></div>
          <div><span>{t('Monthly electricity savings, before reserve', 'ประหยัดค่าไฟต่อเดือน ก่อนเงินสำรอง')}</span><b>{money(props.annualBillSavingsThb / 12)}</b></div>
          <div><span>{t('Monthly reserve', 'เงินสำรองต่อเดือน')}</span><b>{money(props.annualReserveThb / 12)}</b></div>
          <div><span>{t('Monthly cash flow after instalment and reserve', 'กระแสเงินสดต่อเดือนหลังหักค่างวดและเงินสำรอง')}</span><b>{money((finance.monthlyNetCashFlowBaht ?? 0) - props.annualReserveThb / 12)}</b></div>
        </div>
        {!finance.feeInputsComplete && <p className="note">{t('Blank fee fields are treated as zero for this calculation; confirm the actual fees with your quote.', 'ช่องค่าธรรมเนียมที่เว้นว่างคำนวณเป็นศูนย์ โปรดตรวจสอบค่าธรรมเนียมจริงในใบเสนอราคา')}</p>}
        {finance.reasonCodes.includes('actual-quote-payment-differs-check-final-payment-and-fees') && <p className="note">{t('The actual quoted payment differs from the rate-based calculation. Cash flow uses your quoted payment; confirm final instalment, fees and any outstanding balance.', 'ค่างวดจริงที่กรอกต่างจากค่างวดที่คำนวณตามอัตรา กระแสเงินสดใช้ค่างวดจริงที่กรอก โปรดตรวจสอบงวดสุดท้าย ค่าธรรมเนียม และยอดคงเหลือ')}</p>}
        <p className="note">{t('Cash flow shown is during the loan term, using current savings and a monthly average reserve. Tax relief and export income are excluded. This is not an effective APR calculation.', 'กระแสเงินสดนี้เป็นช่วงที่ผ่อน โดยใช้ผลประหยัดปัจจุบันและเงินสำรองเฉลี่ยรายเดือน ไม่รวมสิทธิภาษีหรือรายได้ขายไฟ และไม่ใช่การคำนวณอัตราดอกเบี้ยที่แท้จริงรวมค่าธรรมเนียม')}</p>
      </> : <p role="status">{t('Enter a valid deposit, whole-month term, annual rate and rate basis to calculate.', 'กรอกเงินดาวน์ ระยะเวลาจำนวนเต็มเดือน อัตรารายปี และวิธีคิดดอกเบี้ยให้ถูกต้องเพื่อคำนวณ')}</p>}
    </div></details>

    <details className="disc scenario-disclosure"><summary className="xrow"><span className="t"><b>{t('Export under a verified purchase contract (optional)', 'ขายไฟตามสัญญารับซื้อที่ตรวจสอบแล้ว (ไม่บังคับ)')}</b><span>{t('Only interval surplus within your contract', 'เฉพาะไฟส่วนเกินรายช่วงเวลาภายในสัญญา')}</span></span><i className="scenario-switch" aria-hidden="true"/></summary><div className="in">
      <p>{t('A programme announcement does not establish your contract. Enter only the verified rate, exact term and AC export limit in your own contract. The base estimate includes no export income.', 'ประกาศโครงการไม่ได้ยืนยันว่าคุณมีสัญญารับซื้อ ให้กรอกเฉพาะอัตรา ช่วงวันที่ และเพดานกำลังไฟส่งออก AC ที่ตรวจสอบจากสัญญาของคุณ ผลประเมินพื้นฐานไม่รวมรายได้ขายไฟ')}</p>
      <p className="note">{t('This page uses synthetic intervals for the representative year 2027, not measured export or a forecast. The scenario does not establish contract approval.', 'หน้านี้ใช้ข้อมูลรายช่วงเวลาจำลองของปีตัวแทน 2027 ไม่ใช่ไฟส่งออกที่วัดจริงหรือการพยากรณ์ ผลจำลองไม่ได้ยืนยันการอนุมัติสัญญารับซื้อ')}</p>
      <p className="note">{t('PEA’s 2026 programme announcement states ฿2.20/kWh for 10 years and up to 5 kW AC, subject to application and programme conditions. These are not automatic contract values.', 'ประกาศโครงการ กฟภ. ปี 2569 ระบุ 2.20 บาทต่อหน่วย ระยะเวลา 10 ปี และไม่เกิน 5 กิโลวัตต์ AC โดยต้องสมัครและเข้าเงื่อนไขโครงการ ข้อมูลนี้ไม่ได้ถูกใช้แทนเงื่อนไขสัญญาของคุณโดยอัตโนมัติ')}{' '}<a href="https://www.pea.co.th/news/corporate-news/2133" target="_blank" rel="noreferrer">{t('Official announcement', 'ประกาศทางการ')}</a></p>
      <label className="check"><input type="checkbox" checked={exportVerified} onChange={event => setExportVerified(event.target.checked)} /> {t('I have verified these terms in my own purchase contract', 'ฉันตรวจสอบเงื่อนไขเหล่านี้จากสัญญารับซื้อของตนเองแล้ว')}</label>
      <div className="grid accuracy-fields">
        <label>{t('Contract rate (THB/kWh)', 'อัตราตามสัญญา (บาทต่อหน่วย)')}<input type="number" min="0" step="any" inputMode="decimal" value={exportRate} onChange={event => setExportRate(event.target.value)} /></label>
        <label>{t('Contract start date', 'วันเริ่มรับซื้อตามสัญญา')}<input type="date" value={exportStart} onChange={event => setExportStart(event.target.value)} /></label>
        <label>{t('Contract final date (inclusive)', 'วันสุดท้ายที่รับซื้อ (รวมวันนี้)')}<input type="date" value={exportEnd} onChange={event => setExportEnd(event.target.value)} /></label>
        <label>{t('Contract AC export limit (kW)', 'เพดานกำลังไฟส่งออก AC ตามสัญญา (กิโลวัตต์)')}<input type="number" min="0" step="any" inputMode="decimal" value={exportCap} onChange={event => setExportCap(event.target.value)} /></label>
      </div>
      <p className="note">{t('The estimated inverter is ', 'อินเวอร์เตอร์ที่ประเมินไว้คือ ')}{props.inverterAcKw.toLocaleString(en ? 'en-TH' : 'th-TH')} kW AC{t('; this is not confirmation of your permitted export capacity.', ' ค่านี้ไม่ใช่การยืนยันกำลังไฟที่อนุญาตให้ส่งออก')}</p>
      {exportScenario.status === 'modelled' ? <>
        <div className="kv"><div><span>{t('Export within contract and interval AC limits', 'ไฟส่วนเกินภายในช่วงสัญญาและเพดาน AC ของแต่ละช่วง')}</span><b>{exportScenario.exportKwh.toLocaleString(en ? 'en-TH' : 'th-TH', { maximumFractionDigits: 1 })} kWh</b></div><div><span>{t('Export income for the supplied intervals only', 'รายได้ขายไฟเฉพาะช่วงข้อมูลที่นำมาคำนวณ')}</span><b>{money(exportScenario.exportIncomeBaht)}</b></div></div>
        <p className="note">{t('Uses interval-average surplus after home consumption, capped separately in each interval. Only time inside the supplied contract dates counts; boundary intervals are prorated. No automatic 20-year extension or annual extrapolation is applied.', 'ใช้ไฟส่วนเกินเฉลี่ยในแต่ละช่วงหลังหักการใช้ในบ้าน และจำกัดเพดานแยกแต่ละช่วง นับเฉพาะเวลาภายในวันที่ตามสัญญา โดยเฉลี่ยตามสัดส่วนเวลาหากคร่อมวันเริ่มหรือสิ้นสุดสัญญา ไม่มีการต่อระยะเวลาเป็น 20 ปีหรือขยายเป็นรายได้ทั้งปีอัตโนมัติ')}</p>
      </> : <p role="status">{!props.exportIntervals?.length
        ? t('Insufficient information: interval surplus data is unavailable. Entering contract terms alone cannot establish export income.', 'ข้อมูลยังไม่พอ: ไม่มีข้อมูลไฟส่วนเกินแยกตามช่วงเวลา เงื่อนไขสัญญาเพียงอย่างเดียวยังใช้คำนวณรายได้ขายไฟไม่ได้')
        : t('Insufficient information: verify all contract terms and valid surplus intervals to calculate.', 'ข้อมูลยังไม่พอ: ต้องยืนยันเงื่อนไขสัญญาครบถ้วนและมีข้อมูลไฟส่วนเกินแต่ละช่วงที่ถูกต้องเพื่อคำนวณ')}</p>}
    </div></details>
    <button type="button" className="btn btn-soft btn-sm clear-optional" onClick={reset}>{t('Clear optional scenario inputs', 'ล้างข้อมูลจำลองเพิ่มเติม')}</button>
  </section>;
}
