'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Gauge, Info, Sun, WalletCards, Zap } from 'lucide-react';
import { calculateEstimate } from '@/lib/calculator';
import type { EstimateAnswers, EstimateResult } from '@/lib/calculator/types';
import { estimateAnswersSchema } from '@/lib/validation/estimate';
import { solarAssumptions } from '@/config/solar-assumptions';
import { track } from '@/lib/analytics/track';
import { PrototypeNotice } from '@/components/site/prototype-notice';
import { SavingsChart } from './savings-chart';
import { LeadCapture } from '@/components/lead/lead-capture';
import { localizedPath, type Locale } from '@/config/i18n';

export function ResultsShell({ locale = 'th' }: { locale?: Locale }) {
  const english = locale === 'en';
  const numberLocale = english ? 'en-US' : 'th-TH';
  const money = (value: number) => `฿${value.toLocaleString(numberLocale)}`;
  const number = (value: number) => value.toLocaleString(numberLocale);
  const [answers, setAnswers] = useState<EstimateAnswers | null>(null);
  useEffect(() => {
    const saved = sessionStorage.getItem('solarmatch:estimate');
    if (!saved) return;
    try {
      const parsed = estimateAnswersSchema.safeParse(JSON.parse(saved));
      // Browser storage is an external system; hydrate it after the server-safe first render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (parsed.success) setAnswers(parsed.data);
    } catch { /* An empty state is safer than guessing. */ }
  }, []);
  const result = useMemo<EstimateResult | null>(() => answers ? calculateEstimate(answers) : null, [answers]);
  useEffect(() => { if (result) track('estimate_result_viewed', { confidence: result.confidence }); }, [result]);

  if (!result) return <main className="empty-result"><div className="site-shell"><p className="eyebrow">{english ? 'No estimate data yet' : 'ยังไม่มีข้อมูลประเมิน'}</p><h1>{english ? 'Complete the estimate before viewing results' : 'เริ่มแบบประเมินก่อนดูผล'}</h1><p>{english ? 'We do not invent figures from incomplete information, so the prototype result stays transparent.' : 'เราไม่สร้างตัวเลขจากข้อมูลที่ไม่ครบ เพื่อให้ผลต้นแบบตรงไปตรงมาที่สุด'}</p><Link className="button" href={localizedPath('/estimate', locale)}>{english ? 'Start estimate' : 'เริ่มประเมิน'}</Link></div></main>;

  const savingMid = Math.round((result.estimatedMonthlySavingsThb.min + result.estimatedMonthlySavingsThb.max) / 2);
  const estimatedBill = Math.max(0, result.currentMonthlyBillThb - savingMid);
  return (
    <main className="results-page">
      <section className="results-hero">
        <div className="site-shell">
          <PrototypeNotice compact locale={locale} />
          <p className="eyebrow">{english ? 'Initial estimate' : 'ผลประเมินเบื้องต้น'}</p>
          <h1>{english ? 'Your home may suit a system in the range of ' : 'บ้านของคุณอาจเหมาะกับระบบขนาด '}<em>{result.recommendedSystemKw.min}–{result.recommendedSystemKw.max} kW</em></h1>
          <p>{english ? 'This is a range based on your answers, not a system design or quotation. A proper site survey may change the result.' : 'นี่คือช่วงประมาณการจากคำตอบของคุณ ไม่ใช่แบบระบบหรือใบเสนอราคา การสำรวจหน้างานจริงอาจทำให้ผลเปลี่ยนแปลง'}</p>
          <div className={`confidence confidence-${result.confidence}`}><Gauge size={17} /> {english ? 'Information confidence: ' : 'ความมั่นใจของข้อมูล: '}{result.confidence === 'high' ? (english ? 'fairly high' : 'ค่อนข้างสูง') : result.confidence === 'medium' ? (english ? 'moderate' : 'ปานกลาง') : (english ? 'initial' : 'เบื้องต้น')}</div>
        </div>
      </section>
      <section className="site-shell result-metrics" aria-label={english ? 'Estimated figures' : 'ตัวเลขประมาณการ'}>
        <article><Sun /><span>{english ? 'Possible system size' : 'ขนาดระบบที่อาจเหมาะ'}</span><strong>{result.recommendedSystemKw.min}–{result.recommendedSystemKw.max} kW</strong><small>{english ? 'Must be confirmed against roof area and structure' : 'ต้องยืนยันจากพื้นที่และโครงสร้างหลังคา'}</small></article>
        <article><WalletCards /><span>{english ? 'Possible savings range' : 'ช่วงเงินที่อาจประหยัด'}</span><strong>{money(result.estimatedMonthlySavingsThb.min)}–{money(result.estimatedMonthlySavingsThb.max)}</strong><small>{english ? 'per month under prototype assumptions' : 'ต่อเดือน ภายใต้สมมติฐานต้นแบบ'}</small></article>
        <article><Zap /><span>{english ? 'Estimated electricity production' : 'ผลผลิตไฟฟ้าประมาณ'}</span><strong>{number(result.estimatedAnnualProductionKwh.min)}–{number(result.estimatedAnnualProductionKwh.max)}</strong><small>{english ? 'kWh per year' : 'kWh ต่อปี'}</small></article>
        <article><CheckCircle2 /><span>{english ? 'Possible bill reduction' : 'ค่าไฟอาจลดลง'}</span><strong>{result.estimatedBillReductionPct.min}–{result.estimatedBillReductionPct.max}%</strong><small>{english ? 'depends on daytime electricity use' : 'ขึ้นกับการใช้ไฟช่วงกลางวัน'}</small></article>
      </section>

      <section className="site-shell result-detail-grid">
        <article className="result-panel">
          <div className="panel-heading"><div><p className="eyebrow">{english ? 'Comparison' : 'ภาพเปรียบเทียบ'}</p><h2>{english ? 'Estimated bill before and after solar' : 'ค่าไฟก่อนและหลังแบบประมาณการ'}</h2></div><Info size={20} /></div>
          <SavingsChart currentBill={result.currentMonthlyBillThb} estimatedBill={estimatedBill} locale={locale} />
          <table className="chart-fallback"><caption>{english ? 'Monthly electricity bill comparison' : 'ตารางเปรียบเทียบค่าไฟต่อเดือน'}</caption><tbody><tr><th>{english ? 'Before solar' : 'ก่อนติดโซลาร์'}</th><td>{money(result.currentMonthlyBillThb)}</td></tr><tr><th>{english ? 'After solar (mid-range)' : 'หลังติดโซลาร์ (ช่วงกลาง)'}</th><td>{money(estimatedBill)}</td></tr></tbody></table>
        </article>
        <aside className="assumption-panel">
          <p className="eyebrow">{english ? 'Calculation inputs' : 'สิ่งที่ใช้คำนวณ'}</p>
          <h2>{english ? 'Assumptions used for this result' : 'สมมติฐานของผลนี้'}</h2>
          <ul>{(english ? [
            'The electricity bill is converted to estimated consumption using a simplified prototype rate.',
            `Reference yield of ${solarAssumptions.referenceAnnualYieldKwhPerKwp.toLocaleString('en-US')} kWh per kWp per year.`,
            'Income from exporting excess electricity is excluded.',
            'Tax benefits are excluded.',
          ] : result.assumptionsUsed).map((item) => <li key={item}>{item}</li>)}</ul>
          <p className="assumption-version">{english ? 'Version' : 'เวอร์ชัน'} {result.assumptionVersion}</p>
          <Link className="text-link" href={localizedPath('/methodology', locale)}>{english ? 'View the full methodology' : 'ดูวิธีคำนวณทั้งหมด'}</Link>
        </aside>
      </section>

      <section className="policy-note"><div className="site-shell policy-note-inner"><Info size={24} /><div><h2>{english ? 'Export income and tax benefits are not included' : 'ยังไม่รวมรายได้ขายไฟและสิทธิภาษี'}</h2><p>{english ? `Reference data retained for validation includes a FiT of ฿${solarAssumptions.fit.rateThbPerKwh}/kWh (up to ${solarAssumptions.fit.maxAcKw} kW AC for ${solarAssumptions.fit.termYears} years) and a tax-deduction cap of ${money(solarAssumptions.tax.deductionCapThb)}. These are not included in the main result until eligibility and current policy conditions are verified.` : `ข้อมูลอ้างอิงปัจจุบันเก็บไว้เพื่อการตรวจสอบ ได้แก่ FiT ${solarAssumptions.fit.rateThbPerKwh} บาท/kWh (ไม่เกิน ${solarAssumptions.fit.maxAcKw} kW AC, ${solarAssumptions.fit.termYears} ปี) และเพดานสิทธิภาษี ${money(solarAssumptions.tax.deductionCapThb)} แต่ยังไม่ถูกนำมาคำนวณผลหลักจนกว่าจะตรวจสอบเงื่อนไขผู้ใช้และนโยบายอีกครั้ง`}</p><small>{english ? 'Reference last checked' : 'ข้อมูลอ้างอิงตรวจล่าสุด'} {solarAssumptions.fit.lastVerified}</small></div></div></section>
      <div className="site-shell"><LeadCapture locale={locale} /><Link className="back-link" href={localizedPath('/estimate', locale)}><ArrowLeft size={17} /> {english ? 'Edit answers' : 'แก้ไขคำตอบ'}</Link></div>
    </main>
  );
}
