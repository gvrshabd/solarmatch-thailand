'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Gauge,
  Home,
  Info,
  Settings2,
  Sun,
  TrendingUp,
  WalletCards,
  Zap,
} from 'lucide-react';
import Link from '@/components/site/internal-link';
import { LeadCapture } from '@/components/lead/lead-capture';
import { PrototypeNotice } from '@/components/site/prototype-notice';
import { selectResidentialTariff } from '@/config/electricity-tariffs';
import { featureFlags } from '@/config/feature-flags';
import { localizedPath, type Locale } from '@/config/i18n';
import { solarAssumptions } from '@/config/solar-assumptions';
import { calculateEstimate } from '@/lib/calculator';
import type { EstimateAnswers, EstimateResult, FutureLoad } from '@/lib/calculator/types';
import { track } from '@/lib/analytics/track';
import { formatMoney, formatNumber } from '@/lib/format/numbers';
import { estimateAnswersSchema } from '@/lib/validation/estimate';
import { LifetimeCostChart } from './lifetime-cost-chart';
import { SavingsChart } from './savings-chart';

const confidenceLabels = {
  th: { high: 'ค่อนข้างสูง', medium: 'ปานกลาง', low: 'เบื้องต้น' },
  en: { high: 'fairly high', medium: 'moderate', low: 'initial' },
} as const;

const improvementCopy: Record<string, { th: string; en: string }> = {
  'tou-model': { th: 'ตรวจอัตรา TOU และหน่วย On/Off Peak', en: 'Validate the TOU rate and On/Off Peak units' },
  'private-rate': { th: 'ขออัตราค่าไฟจริงจากเจ้าของโครงการ', en: 'Obtain the actual private electricity rate' },
  'site-survey': { th: 'ให้ผู้เชี่ยวชาญตรวจเงาบังหน้างาน', en: 'Arrange an on-site shade assessment' },
  'more-bills': { th: 'เพิ่มข้อมูลค่าไฟอีก 2 เดือน', en: 'Add two more monthly bills' },
  'tariff-check': { th: 'ตรวจประเภทอัตราบนบิล', en: 'Confirm the tariff shown on the bill' },
  'roof-direction': { th: 'เพิ่มทิศและความลาดของหลังคา', en: 'Add roof direction and slope' },
  'shade-check': { th: 'ตรวจเงาบังช่วง 10:00–15:00', en: 'Check shade between 10am and 3pm' },
  'electricity-phase': { th: 'ตรวจไฟ 1 เฟสหรือ 3 เฟสจากบิล', en: 'Check single- or three-phase service on the bill' },
  'daytime-pattern': { th: 'ทบทวนการใช้ไฟช่วงกลางวัน', en: 'Review the daytime electricity pattern' },
  'outlier-review': { th: 'ตรวจตัวเลขจากบิลอีกครั้ง', en: 'Double-check the unusually high input' },
};

const evidenceReasonCopy: Record<string, { th: string; en: string }> = {
  'actual-kwh': { th: 'ใช้จำนวนหน่วยไฟฟ้า (kWh) จากบิล', en: 'Uses electricity consumption (kWh) from the bill' },
  'bill-derived-load': { th: 'คำนวณหน่วยไฟจากยอดบิลด้วยอัตราก้าวหน้า', en: 'Derives consumption from the bill using progressive residential rates' },
  'tariff-identified': { th: 'ยืนยันอัตราค่าไฟบ้านมาตรฐานแล้ว', en: 'Standard residential tariff is identified' },
  'daytime-pattern': { th: 'มีข้อมูลรูปแบบการใช้ไฟช่วงกลางวัน', en: 'Daytime electricity pattern is described' },
  'shade-observed': { th: 'มีข้อมูลเงาบังจากสิ่งที่สังเกตได้', en: 'Shade is described from an observable condition' },
  'roof-direction-slope': { th: 'มีข้อมูลทิศและความลาดของหลังคา', en: 'Roof direction and slope are provided' },
  'phase-known': { th: 'ยืนยันไฟ 1 เฟสหรือ 3 เฟสแล้ว', en: 'Single- or three-phase service is identified' },
  'comparable-quote': { th: 'มีใบเสนอราคาเงินสดที่เทียบกับระบบโซลาร์อย่างเดียวได้', en: 'Uses a comparable solar-only cash quotation' },
};

function AccuracyUpgrade({ answers, locale, onChange }: { answers: EstimateAnswers; locale: Locale; onChange: (answers: EstimateAnswers, message: string) => void }) {
  const english = locale === 'en';
  const [message, setMessage] = useState('');
  const update = <K extends keyof EstimateAnswers>(key: K, value: EstimateAnswers[K], note: string) => {
    const next = { ...answers, [key]: value };
    setMessage(note);
    onChange(next, note);
  };
  const optionSets = [
    {
      key: 'roofDirection' as const,
      title: english ? 'Which direction does the main usable roof area face?' : 'พื้นที่หลังคาหลักหันไปทางไหน?',
      note: english ? 'Roof direction updated the production estimate.' : 'ทิศหลังคาได้ปรับค่าผลผลิตแล้ว',
      options: [
        ['south-group', english ? 'South / southeast / southwest' : 'ใต้ / ตะวันออกเฉียงใต้ / ตะวันตกเฉียงใต้'], ['east', english ? 'East' : 'ตะวันออก'], ['west', english ? 'West' : 'ตะวันตก'], ['north', english ? 'North' : 'เหนือ'], ['flat', english ? 'Flat roof' : 'หลังคาแบน'], ['several', english ? 'Several directions' : 'หลายทิศ'], ['unknown', english ? 'Not sure' : 'ไม่แน่ใจ'],
      ],
    },
    {
      key: 'roofSlope' as const,
      title: english ? 'Roughly how steep is the roof?' : 'หลังคาลาดชันประมาณไหน?',
      note: english ? 'Roof slope updated the orientation adjustment.' : 'ความลาดหลังคาได้ปรับค่าทิศทางแล้ว',
      options: [['flat', english ? 'Flat or almost flat' : 'แบนหรือเกือบแบน'], ['gentle', english ? 'Gentle slope' : 'ลาดเล็กน้อย'], ['steep', english ? 'Clearly steep' : 'ลาดชันชัดเจน'], ['unknown', english ? 'Not sure' : 'ไม่แน่ใจ']],
    },
    {
      key: 'electricityPhase' as const,
      title: english ? 'Does the bill show single-phase or three-phase electricity?' : 'ในบิลระบุว่าเป็นไฟ 1 เฟส หรือ 3 เฟส?',
      note: english ? 'The phase selection updated the planning price.' : 'จำนวนเฟสได้ปรับราคากลางเพื่อวางแผนแล้ว',
      options: [['single', english ? 'Single phase' : '1 เฟส'], ['three', english ? 'Three phase' : '3 เฟส'], ['unknown', english ? 'Not sure' : 'ไม่แน่ใจ']],
    },
    {
      key: 'roofArea' as const,
      title: english ? 'Roughly how much mostly unshaded roof space is available?' : 'หลังคาที่แทบไม่มีเงามีพื้นที่ว่างประมาณเท่าไร?',
      note: english ? 'Roof area updated the feasibility check; it did not silently reduce production.' : 'พื้นที่หลังคาได้ปรับการตรวจความเป็นไปได้ โดยไม่ลดผลผลิตแบบซ่อนเร้น',
      options: [['small', english ? 'Less than about 15 m²' : 'น้อยกว่าประมาณ 15 ตร.ม.'], ['medium', english ? 'About 15–30 m²' : 'ประมาณ 15–30 ตร.ม.'], ['large', english ? 'More than 30 m²' : 'มากกว่า 30 ตร.ม.'], ['unknown', english ? 'Not sure' : 'ไม่แน่ใจ']],
    },
  ];

  function toggleFuture(value: FutureLoad) {
    const current = answers.futureLoads ?? [];
    const exclusive = value === 'none' || value === 'unknown';
    const next = current.includes(value) ? current.filter((item) => item !== value) : exclusive ? [value] : [...current.filter((item) => item !== 'none' && item !== 'unknown'), value];
    update('futureLoads', next, english ? 'Future loads are shown separately and do not inflate current savings.' : 'โหลดไฟในอนาคตจะแสดงแยก และไม่เพิ่มเงินประหยัดปัจจุบัน');
  }

  return (
    <details className="accuracy-upgrade" open>
      <summary><Settings2 aria-hidden="true" /><span><strong>{english ? 'Want a more precise estimate?' : 'อยากให้ผลละเอียดขึ้นไหม?'}</strong><small>{english ? 'Add roof, phase, or quotation details. No contact information is required.' : 'เพิ่มข้อมูลหลังคา เฟสไฟ หรือใบเสนอราคา โดยไม่ต้องกรอกข้อมูลติดต่อ'}</small></span></summary>
      <div className="accuracy-upgrade-body">
        {optionSets.map((set) => <fieldset className="upgrade-fieldset" key={set.key}><legend>{set.title}</legend><div className="upgrade-options">{set.options.map(([value, label]) => <button key={value} type="button" aria-pressed={answers[set.key] === value} className={answers[set.key] === value ? 'selected' : ''} onClick={() => update(set.key, value as never, set.note)}>{label}</button>)}</div></fieldset>)}

        <fieldset className="upgrade-fieldset"><legend>{english ? 'Do you expect major new electrical loads within two years?' : 'ใน 2 ปีข้างหน้า มีแผนเพิ่มอุปกรณ์ที่ใช้ไฟมากไหม?'}</legend><div className="upgrade-options">{([
          ['ev', english ? 'EV' : 'รถไฟฟ้า'], ['air-conditioning', english ? 'Additional air conditioning' : 'แอร์เพิ่ม'], ['pump', english ? 'Pool or larger pump' : 'สระหรือปั๊มขนาดใหญ่'], ['home-business', english ? 'Home-business equipment' : 'อุปกรณ์กิจการที่บ้าน'], ['none', english ? 'None planned' : 'ไม่มีแผนเพิ่ม'], ['unknown', english ? 'Not sure' : 'ไม่แน่ใจ'],
        ] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={answers.futureLoads?.includes(value) ?? false} className={answers.futureLoads?.includes(value) ? 'selected' : ''} onClick={() => toggleFuture(value)}>{label}</button>)}</div></fieldset>

        <fieldset className="upgrade-fieldset quote-upgrade"><legend>{english ? 'Already have a solar-only cash quotation? (optional)' : 'มีใบเสนอราคาโซลาร์แบบเงินสดแล้วหรือยัง? (ไม่บังคับ)'}</legend><div className="quote-inputs"><label>{english ? 'Quoted system size (kWp)' : 'ขนาดระบบในใบเสนอราคา (kWp)'}<input type="number" inputMode="decimal" min="1" max="30" value={answers.quoteSystemKw ?? ''} onChange={(event) => update('quoteSystemKw', Number(event.target.value) || undefined, english ? 'The quoted system size now drives the same roof-production model.' : 'ขนาดระบบในใบเสนอราคาถูกใช้กับแบบจำลองผลผลิตเดิมแล้ว')} /></label><label>{english ? 'Total cash price incl. VAT (THB)' : 'ราคารวมเงินสด รวม VAT (บาท)'}<input type="number" inputMode="numeric" min="10000" max="3000000" value={answers.quoteCashPriceThb ?? ''} onChange={(event) => update('quoteCashPriceThb', Number(event.target.value) || undefined, english ? 'A comparable cash quote replaced the market planning price.' : 'ใบเสนอราคาเงินสดที่เทียบได้แทนราคากลางเพื่อวางแผนแล้ว')} /></label></div><label className="quote-check"><input type="checkbox" checked={answers.quoteBatteryIncluded ?? false} onChange={(event) => update('quoteBatteryIncluded', event.target.checked, english ? 'Battery-inclusive pricing is kept out of the solar-only comparison.' : 'ราคาที่รวมแบตเตอรี่จะไม่ถูกนำไปเทียบกับระบบโซลาร์อย่างเดียว')} /> {english ? 'The quoted price includes a battery' : 'ราคาในใบเสนอราคารวมแบตเตอรี่'}</label></fieldset>
        {message && <p className="upgrade-status" role="status"><BadgeCheck aria-hidden="true" /> {message}</p>}
      </div>
    </details>
  );
}

export function ResultsShell({ locale = 'th' }: { locale?: Locale }) {
  const english = locale === 'en';
  const money = (value: number) => formatMoney(value, locale, value > 0 && value < 10
    ? { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    : {});
  const number = (value: number, digits = 0) => formatNumber(value, locale, { maximumFractionDigits: digits });
  const [answers, setAnswers] = useState<EstimateAnswers | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let restored: EstimateAnswers | null = null;
    try {
      const saved = sessionStorage.getItem('solarmatch:estimate');
      if (saved) {
        const parsed = estimateAnswersSchema.safeParse(JSON.parse(saved));
        if (parsed.success) restored = parsed.data;
      }
    } catch { /* An empty state is safer than guessing. */ }
    queueMicrotask(() => {
      if (restored) setAnswers(restored);
      setHydrated(true);
    });
  }, []);

  const result = useMemo<EstimateResult | null>(() => answers ? calculateEstimate(answers) : null, [answers]);
  useEffect(() => { if (result) track('estimate_result_viewed', { confidence: result.confidence }); }, [result]);

  if (!hydrated) return <main className="empty-result result-loading" aria-busy="true"><div className="site-shell"><p className="eyebrow">{english ? 'Loading saved estimate' : 'กำลังโหลดผลที่บันทึกไว้'}</p><h1>{english ? 'Preparing your planning result' : 'กำลังเตรียมผลเพื่อวางแผน'}</h1></div></main>;
  if (!result || !answers) return <main className="empty-result"><div className="site-shell"><p className="eyebrow">{english ? 'No estimate data yet' : 'ยังไม่มีข้อมูลประเมิน'}</p><h1>{english ? 'Complete the estimate before viewing results' : 'เริ่มแบบประเมินก่อนดูผล'}</h1><p>{english ? 'We do not invent figures from incomplete information.' : 'เราไม่สร้างตัวเลขจากข้อมูลที่ไม่ครบ'}</p><Link className="button" href={localizedPath('/estimate', locale)}>{english ? 'Start estimate' : 'เริ่มประเมิน'}</Link></div></main>;

  const afterBill = result.planningMonthlySavingsThb === null ? null : Math.max(0, result.currentMonthlyBillThb - result.planningMonthlySavingsThb);
  const tariff = selectResidentialTariff();
  const tableYears = new Set([0, 5, 10, 15, 20, solarAssumptions.analysisYears]);
  const lifetimeRows = result.lifetimeCostSeries.filter((point) => tableYears.has(point.year));
  const updateAnswers = (next: EstimateAnswers) => {
    setAnswers(next);
    try { sessionStorage.setItem('solarmatch:estimate', JSON.stringify(next)); } catch { /* Live recalculation still works. */ }
  };
  const actions = result.improvementActions.map((key) => improvementCopy[key]?.[locale]).filter(Boolean);

  const headline = !result.financialResultAvailable
    ? (english ? 'Your production estimate is ready' : 'ผลประเมินการผลิตพร้อมแล้ว')
    : result.upToMonthlySavingsThb !== null
      ? (english ? <>Your bill could fall by up to about <em>{money(result.upToMonthlySavingsThb)}</em> per month</> : <>ค่าไฟอาจลดได้สูงสุดประมาณ <em>{money(result.upToMonthlySavingsThb)}</em> ต่อเดือน</>)
      : (english ? <>For planning, use about <em>{money(result.planningMonthlySavingsThb ?? 0)}</em> per month</> : <>เพื่อวางแผน ให้ใช้ประมาณ <em>{money(result.planningMonthlySavingsThb ?? 0)}</em> ต่อเดือน</>);

  return (
    <main className="results-page results-planning-page">
      <section className="results-hero results-hero-v2 planning-result-hero">
        <div className="site-shell">
          <PrototypeNotice compact locale={locale} />
          <p className="eyebrow">{english ? 'First-year planning estimate · self-use first' : 'ผลเพื่อวางแผนปีแรก · ใช้ไฟเองก่อน'}</p>
          <h1>{headline}</h1>
          {result.financialResultAvailable
            ? <p className="planning-line">{english ? <>Planning figure: about <strong>{money(result.planningMonthlySavingsThb ?? 0)}/month</strong> in the first year. The “up to” ceiling uses the same home and system, excludes export, tax, finance, and tariff escalation, and is never more than 20% above planning.</> : <>ตัวเลขเพื่อวางแผน: ประมาณ <strong>{money(result.planningMonthlySavingsThb ?? 0)}/เดือน</strong> ในปีแรก ตัวเลข “สูงสุด” ใช้บ้านและระบบเดียวกัน ไม่รวมขายไฟ ภาษี เงินกู้ หรือค่าไฟที่เพิ่มขึ้น และไม่เกินตัวเลขวางแผนมากกว่า 20%</>}</p>
            : <p className="planning-line">{english ? 'The tariff you selected cannot safely use the standard residential financial model. System size and production remain visible; savings and payback are withheld.' : 'ประเภทค่าไฟที่เลือกไม่ควรใช้แบบจำลองการเงินอัตราบ้านมาตรฐาน จึงยังแสดงขนาดและผลผลิต แต่ไม่แสดงเงินประหยัดและระยะคืนทุน'}</p>}
          <div className={`confidence confidence-${result.confidence}`}><Gauge aria-hidden="true" /> {english ? 'Evidence confidence: ' : 'ความมั่นใจจากหลักฐาน: '}{confidenceLabels[locale][result.confidence]} <span>({result.confidenceScore})</span></div>
          {result.upToMonthlySavingsThb === null && result.financialResultAvailable && <p className="up-to-suppressed"><Info aria-hidden="true" /> {english ? 'No “up to” claim is shown because roof, shade, or tariff evidence is not yet strong enough.' : 'ยังไม่แสดงคำว่า “สูงสุด” เพราะข้อมูลหลังคา เงาบัง หรืออัตราค่าไฟยังไม่ชัดพอ'}</p>}
        </div>
      </section>

      <section className="site-shell result-metrics result-metrics-v2 planning-metrics" aria-label={english ? 'Planning figures' : 'ตัวเลขเพื่อวางแผน'}>
        <article><Sun aria-hidden="true" /><span>{english ? 'Suggested starting system' : 'ขนาดเริ่มต้นที่แนะนำ'}</span><strong>{english ? 'About ' : 'ประมาณ '}{number(result.planningSystemKw, 1)} kWp</strong><small>{result.roofFeasibility === 'check' ? (english ? 'electricity-based target; selected roof area may be too small' : 'เป้าหมายจากการใช้ไฟ; พื้นที่หลังคาที่เลือกอาจไม่พอ') : (english ? 'site survey and structure check still required' : 'ยังต้องสำรวจพื้นที่และโครงสร้าง')}</small></article>
        <article><WalletCards aria-hidden="true" /><span>{english ? 'Planning cash price' : 'ราคาเงินสดเพื่อวางแผน'}</span><strong>{english ? 'About ' : 'ประมาณ '}{money(result.planningInstalledCostThb)}</strong><small>{answers.quoteCashPriceThb && !answers.quoteBatteryIncluded ? (english ? 'using your comparable quotation' : 'ใช้ใบเสนอราคาที่คุณกรอก') : (english ? 'current market anchor, not a quotation' : 'ราคากลางปัจจุบัน ไม่ใช่ใบเสนอราคา')}</small></article>
        <article><TrendingUp aria-hidden="true" /><span>{english ? 'Simple cash payback' : 'ระยะคืนทุนเงินสดอย่างง่าย'}</span><strong>{result.planningPaybackYears === null ? (english ? 'Needs more information' : 'ต้องมีข้อมูลเพิ่ม') : `${english ? 'About ' : 'ประมาณ '}${number(result.planningPaybackYears, 1)} ${english ? 'years' : 'ปี'}`}</strong><small>{english ? 'after routine upkeep; excludes export, tax and finance' : 'หลังค่าดูแลประจำ ไม่รวมขายไฟ ภาษี และเงินกู้'}</small></article>
        <article><Zap aria-hidden="true" /><span>{english ? 'First-year production' : 'ผลผลิตปีแรก'}</span><strong>{english ? 'About ' : 'ประมาณ '}{number(result.planningAnnualProductionKwh)} kWh</strong><small>{english ? 'based on location and stated roof conditions' : 'จากตำแหน่งและสภาพหลังคาที่ระบุ'}</small></article>
      </section>

      {result.weakEconomics && <section className="site-shell weak-fit-callout"><Info aria-hidden="true" /><div><h2>{english ? 'Solar may not yet be an obvious financial fit' : 'โซลาร์อาจยังไม่ใช่ตัวเลือกที่คุ้มชัดเจน'}</h2><p>{english ? 'Based on the information provided, compare a smaller system or obtain better tariff and roof evidence before making a decision.' : 'จากข้อมูลที่ให้มา ควรเปรียบเทียบระบบที่เล็กลงหรือเพิ่มข้อมูลค่าไฟและหลังคาก่อนตัดสินใจ'}</p></div></section>}

      <section className="site-shell result-confidence-panel" aria-labelledby="confidence-title">
        <div><p className="eyebrow">{english ? 'Why this confidence level?' : 'ทำไมจึงได้ความมั่นใจระดับนี้?'}</p><h2 id="confidence-title">{english ? 'Confidence follows the evidence—not the number of screens completed' : 'ความมั่นใจขึ้นกับหลักฐาน ไม่ใช่จำนวนหน้าที่ตอบ'}</h2></div>
        <div><ul>{result.confidenceReasons.map((reason) => <li key={reason}><BadgeCheck aria-hidden="true" /> {evidenceReasonCopy[reason]?.[locale] ?? reason.replaceAll('-', ' ')}</li>)}</ul>{actions.length > 0 && <div className="next-evidence"><strong>{english ? 'Best next steps' : 'ขั้นตอนที่ช่วยได้มากที่สุด'}</strong><ol>{actions.map((action) => <li key={action}>{action}</li>)}</ol></div>}</div>
      </section>

      <section className="site-shell energy-flow-section" aria-labelledby="energy-flow-title">
        <div className="energy-flow-heading"><div><p className="eyebrow">{english ? 'Energy flow' : 'พลังงานไปไหน'}</p><h2 id="energy-flow-title">{english ? 'One planning estimate, with detail when you want it' : 'ตัวเลขวางแผนหนึ่งค่า พร้อมรายละเอียดเมื่อคุณต้องการ'}</h2></div><p>{english ? 'Direct use is valued at the avoided progressive retail bill. Surplus stays separate and conditional.' : 'ไฟที่ใช้เองคิดจากส่วนต่างบิลอัตราก้าวหน้า ส่วนไฟเกินแยกออกและยังมีเงื่อนไข'}</p></div>
        <div className="energy-flow-grid">
          <article><Home aria-hidden="true" /><span>{english ? 'Used directly in the home' : 'ใช้เองภายในบ้าน'}</span><strong>{english ? 'About ' : 'ประมาณ '}{number(result.planningAnnualSelfConsumedKwh)} kWh</strong><small>{result.planningAnnualSavingsThb !== null ? (english ? `About ${money(result.planningAnnualSavingsThb)} first-year bill reduction` : `ลดบิลปีแรกประมาณ ${money(result.planningAnnualSavingsThb)}`) : (english ? 'Financial value withheld for this tariff' : 'ยังไม่แสดงมูลค่าการเงินสำหรับอัตรานี้')}</small></article>
          <article className="conditional-result"><Zap aria-hidden="true" /><span>{english ? 'Likely surplus · conditional only' : 'ไฟส่วนเกินที่คาด · เฉพาะกรณี'}</span><strong>{english ? 'About ' : 'ประมาณ '}{number(result.planningAnnualExportedKwh)} kWh</strong><small>{english ? 'Not included in headline savings. Purchase requires programme eligibility, quota and utility approval.' : 'ไม่รวมในเงินประหยัดตัวหลัก การรับซื้อต้องผ่านสิทธิ โควตา และการอนุมัติของการไฟฟ้า'}</small></article>
        </div>
      </section>

      {result.financialResultAvailable && afterBill !== null && <section className="site-shell result-detail-grid planning-detail-grid">
        <article className="result-panel"><div className="panel-heading"><div><p className="eyebrow">{english ? 'Monthly planning view' : 'ภาพวางแผนรายเดือน'}</p><h2>{english ? 'Before and after direct solar use' : 'ก่อนและหลังใช้ไฟโซลาร์เอง'}</h2></div><Info aria-hidden="true" /></div><SavingsChart currentBill={result.currentMonthlyBillThb} estimatedBill={afterBill} locale={locale} /><table className="chart-fallback"><caption>{english ? 'Monthly electricity bill comparison' : 'ตารางเปรียบเทียบค่าไฟต่อเดือน'}</caption><tbody><tr><th>{english ? 'Before solar' : 'ก่อนติดโซลาร์'}</th><td>{money(result.currentMonthlyBillThb)}</td></tr><tr><th>{english ? 'After solar (planning)' : 'หลังติดโซลาร์ (เพื่อวางแผน)'}</th><td>{money(afterBill)}</td></tr></tbody></table></article>
        <aside className="assumption-panel"><p className="eyebrow">{english ? 'Calculation basis' : 'ฐานการคำนวณ'}</p><h2>{english ? 'The assumptions stay beside the result' : 'สมมติฐานอยู่ใกล้กับผล'}</h2><ul>{(english ? [
          'Province-level PVGIS yield adjusted for the stated roof direction, slope and shade.',
          'Avoided value is the exact difference between progressive residential bills before and after monthly direct solar use.',
          'System sizing prioritises self-use and never increases automatically to compensate for shade.',
          'The cash base includes routine upkeep, 0.5% annual module degradation, and one inverter-replacement reserve in year 13.',
          'Export, tax, finance, and electricity-price escalation are excluded from every headline figure.',
        ] : result.assumptionsUsed).map((item) => <li key={item}>{item}</li>)}</ul><dl className="result-assumption-facts"><div><dt>{english ? 'Estimated monthly use' : 'หน่วยใช้ไฟประมาณ'}</dt><dd>{number(result.estimatedMonthlyConsumptionKwh)} kWh</dd></div><div><dt>{english ? 'Routine upkeep allowance' : 'ค่าเผื่อดูแลประจำ'}</dt><dd>{money(result.estimatedAnnualOperationsAndMaintenanceThb.min)}/{english ? 'year' : 'ปี'}</dd></div><div><dt>{english ? 'Tariff version' : 'เวอร์ชันอัตราค่าไฟ'}</dt><dd>{tariff.label}</dd></div></dl><p className="assumption-version">{english ? 'Model' : 'แบบจำลอง'} {result.assumptionVersion}</p><Link className="text-link" href={localizedPath('/methodology', locale)}>{english ? 'Read the full methodology' : 'อ่านวิธีคำนวณทั้งหมด'}</Link></aside>
      </section>}

      <section className="site-shell"><AccuracyUpgrade answers={answers} locale={locale} onChange={(next) => updateAnswers(next)} /></section>

      {featureFlags.FEATURE_LONG_TERM_COST_CHART && result.financialResultAvailable && <details className="site-shell lifetime-section lifetime-details"><summary>{english ? 'See the 10- and 25-year cash view' : 'ดูมุมมองเงินสด 10 และ 25 ปี'}</summary><div className="lifetime-heading"><div><p className="eyebrow">{english ? 'Secondary long-term view' : 'มุมมองระยะยาวรอง'}</p><h2>{english ? 'Cumulative household electricity cost' : 'ต้นทุนไฟฟ้าสะสมของบ้าน'}</h2></div><div className="lifetime-range"><span>{english ? 'Planning difference after 25 years' : 'ส่วนต่างเพื่อวางแผนหลัง 25 ปี'}</span><strong>{result.planningTwentyFiveYearNetBenefitThb === null ? '—' : money(result.planningTwentyFiveYearNetBenefitThb)}</strong></div></div><p className="chart-explainer">{english ? `Ten-year planning difference: ${money(result.planningTenYearNetBenefitThb ?? 0)}. The chart includes routine upkeep, 0.5% annual degradation and a year-13 inverter reserve. It assumes 0% tariff escalation and excludes export, tax and finance.` : `ส่วนต่างเพื่อวางแผน 10 ปี: ${money(result.planningTenYearNetBenefitThb ?? 0)} กราฟรวมค่าดูแล การเสื่อม 0.5% ต่อปี และเงินสำรองอินเวอร์เตอร์ปีที่ 13 โดยสมมติค่าไฟเพิ่ม 0% และไม่รวมขายไฟ ภาษี และเงินกู้`}</p><LifetimeCostChart data={result.lifetimeCostSeries} locale={locale} /><div className="chart-table-scroll" role="region" aria-label={english ? 'Scrollable cumulative-cost data table' : 'ตารางข้อมูลต้นทุนสะสมที่เลื่อนได้'} tabIndex={0}><table className="chart-data-table"><caption>{english ? 'Cumulative-cost data at five-year intervals' : 'ข้อมูลต้นทุนสะสมทุกห้าปี'}</caption><thead><tr><th>{english ? 'Year' : 'ปี'}</th><th>{english ? 'Without solar' : 'ไม่ติดโซลาร์'}</th><th>{english ? 'Solar · lower sensitivity' : 'โซลาร์ · ค่าต่ำ'}</th><th>{english ? 'Solar · higher sensitivity' : 'โซลาร์ · ค่าสูง'}</th></tr></thead><tbody>{lifetimeRows.map((point) => <tr key={point.year}><th>{number(point.year)}</th><td>{money(point.withoutSolarThb)}</td><td>{money(point.withSolarLowThb)}</td><td>{money(point.withSolarHighThb)}</td></tr>)}</tbody></table></div></details>}

      <section className="policy-note"><div className="site-shell policy-note-inner"><Info aria-hidden="true" /><div><h2>{english ? 'Surplus purchases and tax relief remain conditional' : 'การรับซื้อไฟส่วนเกินและสิทธิภาษียังมีเงื่อนไข'}</h2><p>{english ? `Eligible surplus may be purchased separately at ${money(solarAssumptions.fit.rateThbPerKwh)}/kWh for ${solarAssumptions.fit.termYears} years, subject to a ${solarAssumptions.fit.maxAcKw} kW AC export limit, quota and utility approval. The tax measure is a qualifying-spend deduction capped at ${money(solarAssumptions.tax.deductionCapThb)}, not a cash refund. Neither is included above.` : `ไฟส่วนเกินที่เข้าเงื่อนไขอาจขายแยกได้ที่ ${money(solarAssumptions.fit.rateThbPerKwh)}/หน่วย นาน ${solarAssumptions.fit.termYears} ปี ภายใต้เพดานส่งออก ${solarAssumptions.fit.maxAcKw} kW AC โควตา และการอนุมัติ ส่วนสิทธิภาษีเป็นเพดานค่าใช้จ่ายที่เข้าเงื่อนไข ${money(solarAssumptions.tax.deductionCapThb)} ไม่ใช่เงินคืน และยังไม่รวมทั้งสองรายการในผลด้านบน`}</p></div></div></section>
      <div className="site-shell"><LeadCapture locale={locale} /><Link className="back-link" href={localizedPath('/estimate', locale)}><ArrowLeft aria-hidden="true" /> {english ? 'Edit quick-estimate answers' : 'แก้ไขคำตอบแบบประเมิน'}</Link></div>
    </main>
  );
}
