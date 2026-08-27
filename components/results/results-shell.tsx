'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CircleDollarSign,
  Gauge,
  Home,
  Info,
  Sun,
  TrendingUp,
  WalletCards,
  Zap,
} from 'lucide-react';
import Link from '@/components/site/internal-link';
import { LeadCapture } from '@/components/lead/lead-capture';
import { PrototypeNotice } from '@/components/site/prototype-notice';
import { activeResidentialTariff } from '@/config/electricity-tariffs';
import { featureFlags } from '@/config/feature-flags';
import { localizedPath, type Locale } from '@/config/i18n';
import { solarAssumptions } from '@/config/solar-assumptions';
import { calculateEstimate } from '@/lib/calculator';
import type { EstimateAnswers, EstimateResult } from '@/lib/calculator/types';
import { track } from '@/lib/analytics/track';
import { estimateAnswersSchema } from '@/lib/validation/estimate';
import { LifetimeCostChart } from './lifetime-cost-chart';
import { SavingsChart } from './savings-chart';

export function ResultsShell({ locale = 'th' }: { locale?: Locale }) {
  const english = locale === 'en';
  const numberLocale = english ? 'en-US' : 'th-TH';
  const money = (value: number) => `${value < 0 ? '−' : ''}฿${Math.abs(value).toLocaleString(numberLocale)}`;
  const number = (value: number) => value.toLocaleString(numberLocale);
  const [answers, setAnswers] = useState<EstimateAnswers | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('solarmatch:estimate');
      if (!saved) return;
      const parsed = estimateAnswersSchema.safeParse(JSON.parse(saved));
      // Browser storage is an external system; hydrate it after the server-safe first render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (parsed.success) setAnswers(parsed.data);
    } catch { /* An empty state is safer than guessing. */ }
    finally {
      setHydrated(true);
    }
  }, []);
  const result = useMemo<EstimateResult | null>(() => answers ? calculateEstimate(answers) : null, [answers]);
  useEffect(() => { if (result) track('estimate_result_viewed', { confidence: result.confidence }); }, [result]);

  if (!hydrated) return <main className="empty-result result-loading" aria-busy="true"><div className="site-shell"><p className="eyebrow">{english ? 'Loading saved estimate' : 'กำลังโหลดผลที่บันทึกไว้'}</p><h1>{english ? 'Preparing your transparent result' : 'กำลังเตรียมผลประเมินอย่างโปร่งใส'}</h1><p>{english ? 'Your non-sensitive answers stay in this browser session.' : 'คำตอบที่ไม่อ่อนไหวของคุณอยู่ในเซสชันเบราว์เซอร์นี้'}</p></div></main>;

  if (!result) return <main className="empty-result"><div className="site-shell"><p className="eyebrow">{english ? 'No estimate data yet' : 'ยังไม่มีข้อมูลประเมิน'}</p><h1>{english ? 'Complete the estimate before viewing results' : 'เริ่มแบบประเมินก่อนดูผล'}</h1><p>{english ? 'We do not invent figures from incomplete information, so the prototype result stays transparent.' : 'เราไม่สร้างตัวเลขจากข้อมูลที่ไม่ครบ เพื่อให้ผลต้นแบบตรงไปตรงมาที่สุด'}</p><Link className="button" href={localizedPath('/estimate', locale)}>{english ? 'Start estimate' : 'เริ่มประเมิน'}</Link></div></main>;

  const savingMid = Math.round((result.estimatedMonthlySavingsThb.min + result.estimatedMonthlySavingsThb.max) / 2);
  const estimatedBill = Math.max(0, result.currentMonthlyBillThb - savingMid);
  const payback = result.estimatedPaybackYears;
  const tableYears = new Set([0, 5, 10, 15, 20, solarAssumptions.analysisYears]);
  const lifetimeRows = result.lifetimeCostSeries.filter((point) => tableYears.has(point.year));

  return (
    <main className="results-page">
      <section className="results-hero results-hero-v2">
        <div className="site-shell">
          <PrototypeNotice compact locale={locale} />
          <p className="eyebrow">{english ? 'Initial estimate · self-consumption first' : 'ผลประเมินเบื้องต้น · ใช้ไฟเองก่อน'}</p>
          <h1>{english ? 'A useful starting range is ' : 'ช่วงเริ่มต้นที่อาจเหมาะคือ '}<em>{result.recommendedSystemKw.min}–{result.recommendedSystemKw.max} kW</em></h1>
          <p>{english ? 'This range is based on your bill and usage pattern. It is not a system design, quotation, or savings guarantee; a site survey can change it.' : 'ช่วงนี้อ้างอิงค่าไฟและรูปแบบการใช้ไฟของคุณ ไม่ใช่แบบระบบ ใบเสนอราคา หรือคำรับรองผลประหยัด การสำรวจหน้างานอาจทำให้ผลเปลี่ยนแปลง'}</p>
          <div className={`confidence confidence-${result.confidence}`}><Gauge size={17} aria-hidden="true" /> {english ? 'Input confidence: ' : 'ความมั่นใจของข้อมูล: '}{result.confidence === 'high' ? (english ? 'fairly high' : 'ค่อนข้างสูง') : result.confidence === 'medium' ? (english ? 'moderate' : 'ปานกลาง') : (english ? 'initial' : 'เบื้องต้น')}</div>
        </div>
      </section>

      <section className="site-shell result-metrics result-metrics-v2" aria-label={english ? 'Estimated figures' : 'ตัวเลขประมาณการ'}>
        <article><Sun aria-hidden="true" /><span>{english ? 'Possible system size' : 'ขนาดระบบที่อาจเหมาะ'}</span><strong>{result.recommendedSystemKw.min}–{result.recommendedSystemKw.max} kW</strong><small>{english ? 'roof and structure must be checked' : 'ต้องตรวจพื้นที่และโครงสร้างหลังคา'}</small></article>
        <article><WalletCards aria-hidden="true" /><span>{english ? 'Published-package cost range' : 'ช่วงราคาแพ็กเกจอ้างอิง'}</span><strong>{money(result.estimatedInstalledCostThb.min)}–{money(result.estimatedInstalledCostThb.max)}</strong><small>{english ? 'not a quotation' : 'ไม่ใช่ใบเสนอราคา'}</small></article>
        <article><CircleDollarSign aria-hidden="true" /><span>{english ? 'Direct-use value' : 'มูลค่าจากการใช้ไฟเอง'}</span><strong>{money(result.estimatedMonthlySavingsThb.min)}–{money(result.estimatedMonthlySavingsThb.max)}</strong><small>{english ? 'per month, before annual upkeep' : 'ต่อเดือน ก่อนค่าดูแลรายปี'}</small></article>
        <article><TrendingUp aria-hidden="true" /><span>{english ? 'Self-use-only payback' : 'คืนทุนจากการใช้ไฟเอง'}</span><strong>{payback ? `${payback.min}–${payback.max}` : '—'} {payback && (english ? 'years' : 'ปี')}</strong><small>{english ? 'excludes export income and tax relief' : 'ไม่รวมรายได้ขายไฟและสิทธิภาษี'}</small></article>
      </section>

      <section className="site-shell energy-flow-section" aria-labelledby="energy-flow-title">
        <div className="energy-flow-heading"><div><p className="eyebrow">{english ? 'Energy flow' : 'พลังงานไปไหน'}</p><h2 id="energy-flow-title">{english ? 'Value the electricity used in the home first' : 'ให้มูลค่ากับไฟที่บ้านใช้เองก่อน'}</h2></div><p>{english ? 'Without interval-meter data, export is too uncertain to include in the main result.' : 'หากไม่มีข้อมูลการใช้ไฟรายช่วงเวลา ปริมาณส่งออกยังไม่แน่นอนพอจะรวมในผลหลัก'}</p></div>
        <div className="energy-flow-grid">
          <article><Home aria-hidden="true" /><span>{english ? 'Used directly in the home' : 'ใช้เองภายในบ้าน'}</span><strong>{number(result.estimatedAnnualSelfConsumedKwh.min)}–{number(result.estimatedAnnualSelfConsumedKwh.max)} kWh</strong><small>{english ? `${money(result.estimatedAnnualSelfConsumptionValueThb.min)}–${money(result.estimatedAnnualSelfConsumptionValueThb.max)} avoided retail bill per year` : `ลดบิลอัตราขายปลีกประมาณ ${money(result.estimatedAnnualSelfConsumptionValueThb.min)}–${money(result.estimatedAnnualSelfConsumptionValueThb.max)} ต่อปี`}</small></article>
          <article className="conditional-result"><Zap aria-hidden="true" /><span>{english ? 'Possible surplus · conditional only' : 'ไฟส่วนเกินที่อาจเกิดขึ้น · เฉพาะกรณี'}</span><strong>{number(result.estimatedAnnualExportedKwh.min)}–{number(result.estimatedAnnualExportedKwh.max)} kWh</strong><small>{english ? `Potential gross value ${money(result.conditionalAnnualExportRevenueThb.min)}–${money(result.conditionalAnnualExportRevenueThb.max)}/year before programme and technical limits; excluded from every headline figure.` : `มูลค่ารวมที่อาจเป็นไปได้ ${money(result.conditionalAnnualExportRevenueThb.min)}–${money(result.conditionalAnnualExportRevenueThb.max)}/ปี ก่อนเงื่อนไขโครงการและข้อจำกัดทางเทคนิค และไม่รวมในตัวเลขหลักทั้งหมด`}</small></article>
        </div>
      </section>

      <section className="site-shell result-detail-grid">
        <article className="result-panel">
          <div className="panel-heading"><div><p className="eyebrow">{english ? 'Monthly view' : 'ภาพรายเดือน'}</p><h2>{english ? 'Estimated bill before and after direct solar use' : 'ค่าไฟก่อนและหลังใช้ไฟโซลาร์เอง'}</h2></div><Info size={20} aria-hidden="true" /></div>
          <SavingsChart currentBill={result.currentMonthlyBillThb} estimatedBill={estimatedBill} locale={locale} />
          <table className="chart-fallback"><caption>{english ? 'Monthly electricity bill comparison' : 'ตารางเปรียบเทียบค่าไฟต่อเดือน'}</caption><tbody><tr><th>{english ? 'Before solar' : 'ก่อนติดโซลาร์'}</th><td>{money(result.currentMonthlyBillThb)}</td></tr><tr><th>{english ? 'After solar (mid-range)' : 'หลังติดโซลาร์ (ช่วงกลาง)'}</th><td>{money(estimatedBill)}</td></tr></tbody></table>
        </article>
        <aside className="assumption-panel">
          <p className="eyebrow">{english ? 'Calculation basis' : 'ฐานการคำนวณ'}</p>
          <h2>{english ? 'The assumptions stay beside the result' : 'สมมติฐานอยู่ใกล้กับผล'}</h2>
          <ul>{(english ? [
            'Avoided cost is the difference between progressive residential bills before and after direct solar use.',
            `Reference production is about ${solarAssumptions.referenceAnnualYieldKwhPerKwp.toLocaleString('en-US')} kWh/kWp/year after typical system losses.`,
            'Installed cost is a published-package reference range, not a quotation.',
            'Base savings and payback exclude surplus sales and tax relief.',
            'The long-term view assumes 0% tariff escalation and 0.5% annual panel degradation.',
          ] : result.assumptionsUsed).map((item) => <li key={item}>{item}</li>)}</ul>
          <dl className="result-assumption-facts">
            <div><dt>{english ? 'Estimated monthly use' : 'หน่วยใช้ไฟประมาณ'}</dt><dd>{number(result.estimatedMonthlyConsumptionKwh)} kWh</dd></div>
            <div><dt>{english ? 'Annual upkeep allowance' : 'ค่าเผื่อดูแลรายปี'}</dt><dd>{money(result.estimatedAnnualOperationsAndMaintenanceThb.min)}–{money(result.estimatedAnnualOperationsAndMaintenanceThb.max)}</dd></div>
            <div><dt>{english ? 'Active tariff reference' : 'อัตราค่าไฟอ้างอิง'}</dt><dd>{english ? 'Bills through Aug 2026' : 'รอบบิลถึง ส.ค. 2569'}</dd></div>
          </dl>
          <p className="assumption-version">{english ? 'Version' : 'เวอร์ชัน'} {result.assumptionVersion}</p>
          <Link className="text-link" href={localizedPath('/methodology', locale)}>{english ? 'Read the full methodology' : 'อ่านวิธีคำนวณทั้งหมด'}</Link>
        </aside>
      </section>

      {featureFlags.FEATURE_LONG_TERM_COST_CHART && <section className="site-shell lifetime-section" aria-labelledby="lifetime-title">
        <div className="lifetime-heading"><div><p className="eyebrow">{english ? `${solarAssumptions.analysisYears}-year view` : `มุมมอง ${solarAssumptions.analysisYears} ปี`}</p><h2 id="lifetime-title">{english ? 'Cumulative household electricity cost' : 'ต้นทุนไฟฟ้าสะสมของบ้าน'}</h2></div><div className="lifetime-range"><span>{english ? 'Estimated net difference after 25 years' : 'ส่วนต่างสุทธิประมาณการหลัง 25 ปี'}</span><strong>{money(result.estimatedLifetimeNetBenefitThb.min)} – {money(result.estimatedLifetimeNetBenefitThb.max)}</strong></div></div>
        <p className="chart-explainer">{english ? 'The two solar lines show the cost range, including the installed-cost range and annual upkeep. The comparison excludes export income, tax relief, finance, major component replacement, and electricity-price growth.' : 'เส้นโซลาร์สองเส้นแสดงช่วงต้นทุน โดยรวมช่วงราคาติดตั้งและค่าเผื่อดูแลรายปี การเปรียบเทียบนี้ไม่รวมรายได้ขายไฟ สิทธิภาษี เงินกู้ การเปลี่ยนอุปกรณ์หลัก และการเพิ่มขึ้นของค่าไฟ'}</p>
        <LifetimeCostChart data={result.lifetimeCostSeries} locale={locale} />
        <div className="chart-table-scroll" role="region" aria-label={english ? 'Scrollable cumulative-cost data table' : 'ตารางข้อมูลต้นทุนสะสมที่เลื่อนได้'} tabIndex={0}>
          <table className="chart-data-table"><caption>{english ? 'Accessible cumulative-cost data at five-year intervals' : 'ข้อมูลต้นทุนสะสมทุกห้าปี'}</caption><thead><tr><th>{english ? 'Year' : 'ปี'}</th><th>{english ? 'Without solar' : 'ไม่ติดโซลาร์'}</th><th>{english ? 'With solar · lower' : 'ติดโซลาร์ · ช่วงต่ำ'}</th><th>{english ? 'With solar · higher' : 'ติดโซลาร์ · ช่วงสูง'}</th></tr></thead><tbody>{lifetimeRows.map((point) => <tr key={point.year}><th>{point.year}</th><td>{money(point.withoutSolarThb)}</td><td>{money(point.withSolarLowThb)}</td><td>{money(point.withSolarHighThb)}</td></tr>)}</tbody></table>
        </div>
      </section>}

      <section className="policy-note"><div className="site-shell policy-note-inner"><Info size={24} aria-hidden="true" /><div><h2>{english ? 'Surplus purchase and tax relief are conditional—not assumed' : 'การรับซื้อไฟส่วนเกินและสิทธิภาษีมีเงื่อนไข—ไม่ถูกสมมติให้โดยอัตโนมัติ'}</h2><p>{english ? `The 2026 residential programme first serves home consumption. If approved, eligible surplus may be purchased separately at ฿${solarAssumptions.fit.rateThbPerKwh}/kWh for ${solarAssumptions.fit.termYears} years, subject to a ${solarAssumptions.fit.maxAcKw} kW AC export limit, quota, and utility approval. That limit is not a general solar-system size cap. Royal Decree No. 805 provides a qualifying personal-income-tax deduction capped at ${money(solarAssumptions.tax.deductionCapThb)}; it is not a cash refund. Neither item is included above.` : `โครงการภาคประชาชนปี 2569 ให้ผลิตไฟเพื่อใช้ในบ้านก่อน หากได้รับอนุมัติ ไฟส่วนเกินที่เข้าเงื่อนไขอาจขายแยกได้ที่ ${solarAssumptions.fit.rateThbPerKwh} บาท/หน่วย นาน ${solarAssumptions.fit.termYears} ปี ภายใต้เพดานส่งออก ${solarAssumptions.fit.maxAcKw} kW AC โควตา และการอนุมัติของการไฟฟ้า เพดานนี้ไม่ใช่เพดานขนาดระบบทั่วไป ส่วนพระราชกฤษฎีกาฯ ฉบับที่ 805 เป็นสิทธิลดหย่อน/ยกเว้นภาษีเงินได้ตามค่าใช้จ่ายที่เข้าเงื่อนไข สูงสุด ${money(solarAssumptions.tax.deductionCapThb)} ไม่ใช่เงินคืน ทั้งสองส่วนยังไม่รวมในผลด้านบน`}</p><p className="policy-links"><a href={solarAssumptions.fit.sources[0]} target="_blank" rel="noreferrer">PEA</a><a href={solarAssumptions.fit.sources[1]} target="_blank" rel="noreferrer">MEA</a><a href={solarAssumptions.tax.source} target="_blank" rel="noreferrer">{english ? 'Revenue Department' : 'กรมสรรพากร'}</a><a href={activeResidentialTariff.source} target="_blank" rel="noreferrer">{english ? 'Tariff reference' : 'อัตราค่าไฟอ้างอิง'}</a></p><small>{english ? 'Sources last checked' : 'ตรวจแหล่งข้อมูลล่าสุด'} {solarAssumptions.assumptionsLastVerified}</small></div></div></section>
      <div className="site-shell"><LeadCapture locale={locale} /><Link className="back-link" href={localizedPath('/estimate', locale)}><ArrowLeft size={17} aria-hidden="true" /> {english ? 'Edit answers' : 'แก้ไขคำตอบ'}</Link></div>
    </main>
  );
}
