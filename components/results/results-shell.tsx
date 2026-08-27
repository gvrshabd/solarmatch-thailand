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

const money = (value: number) => `฿${value.toLocaleString('th-TH')}`;
const number = (value: number) => value.toLocaleString('th-TH');

export function ResultsShell() {
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

  if (!result) return <main className="empty-result"><div className="site-shell"><p className="eyebrow">ยังไม่มีข้อมูลประเมิน</p><h1>เริ่มแบบประเมินก่อนดูผล</h1><p>เราไม่สร้างตัวเลขจากข้อมูลที่ไม่ครบ เพื่อให้ผลต้นแบบตรงไปตรงมาที่สุด</p><Link className="button" href="/estimate">เริ่มประเมิน</Link></div></main>;

  const savingMid = Math.round((result.estimatedMonthlySavingsThb.min + result.estimatedMonthlySavingsThb.max) / 2);
  const estimatedBill = Math.max(0, result.currentMonthlyBillThb - savingMid);
  return (
    <main className="results-page">
      <section className="results-hero">
        <div className="site-shell">
          <PrototypeNotice compact />
          <p className="eyebrow">ผลประเมินเบื้องต้น</p>
          <h1>บ้านของคุณอาจเหมาะกับระบบขนาด <em>{result.recommendedSystemKw.min}–{result.recommendedSystemKw.max} kW</em></h1>
          <p>นี่คือช่วงประมาณการจากคำตอบของคุณ ไม่ใช่แบบระบบหรือใบเสนอราคา การสำรวจหน้างานจริงอาจทำให้ผลเปลี่ยนแปลง</p>
          <div className={`confidence confidence-${result.confidence}`}><Gauge size={17} /> ความมั่นใจของข้อมูล: {result.confidence === 'high' ? 'ค่อนข้างสูง' : result.confidence === 'medium' ? 'ปานกลาง' : 'เบื้องต้น'}</div>
        </div>
      </section>
      <section className="site-shell result-metrics" aria-label="ตัวเลขประมาณการ">
        <article><Sun /><span>ขนาดระบบที่อาจเหมาะ</span><strong>{result.recommendedSystemKw.min}–{result.recommendedSystemKw.max} kW</strong><small>ต้องยืนยันจากพื้นที่และโครงสร้างหลังคา</small></article>
        <article><WalletCards /><span>ช่วงเงินที่อาจประหยัด</span><strong>{money(result.estimatedMonthlySavingsThb.min)}–{money(result.estimatedMonthlySavingsThb.max)}</strong><small>ต่อเดือน ภายใต้สมมติฐานต้นแบบ</small></article>
        <article><Zap /><span>ผลผลิตไฟฟ้าประมาณ</span><strong>{number(result.estimatedAnnualProductionKwh.min)}–{number(result.estimatedAnnualProductionKwh.max)}</strong><small>kWh ต่อปี</small></article>
        <article><CheckCircle2 /><span>ค่าไฟอาจลดลง</span><strong>{result.estimatedBillReductionPct.min}–{result.estimatedBillReductionPct.max}%</strong><small>ขึ้นกับการใช้ไฟช่วงกลางวัน</small></article>
      </section>

      <section className="site-shell result-detail-grid">
        <article className="result-panel">
          <div className="panel-heading"><div><p className="eyebrow">ภาพเปรียบเทียบ</p><h2>ค่าไฟก่อนและหลังแบบประมาณการ</h2></div><Info size={20} /></div>
          <SavingsChart currentBill={result.currentMonthlyBillThb} estimatedBill={estimatedBill} />
          <table className="chart-fallback"><caption>ตารางเปรียบเทียบค่าไฟต่อเดือน</caption><tbody><tr><th>ก่อนติดโซลาร์</th><td>{money(result.currentMonthlyBillThb)}</td></tr><tr><th>หลังติดโซลาร์ (ช่วงกลาง)</th><td>{money(estimatedBill)}</td></tr></tbody></table>
        </article>
        <aside className="assumption-panel">
          <p className="eyebrow">สิ่งที่ใช้คำนวณ</p>
          <h2>สมมติฐานของผลนี้</h2>
          <ul>{result.assumptionsUsed.map((item) => <li key={item}>{item}</li>)}</ul>
          <p className="assumption-version">เวอร์ชัน {result.assumptionVersion}</p>
          <Link className="text-link" href="/methodology">ดูวิธีคำนวณทั้งหมด</Link>
        </aside>
      </section>

      <section className="policy-note"><div className="site-shell policy-note-inner"><Info size={24} /><div><h2>ยังไม่รวมรายได้ขายไฟและสิทธิภาษี</h2><p>ข้อมูลอ้างอิงปัจจุบันเก็บไว้เพื่อการตรวจสอบ ได้แก่ FiT {solarAssumptions.fit.rateThbPerKwh} บาท/kWh (ไม่เกิน {solarAssumptions.fit.maxAcKw} kW AC, {solarAssumptions.fit.termYears} ปี) และเพดานสิทธิภาษี {money(solarAssumptions.tax.deductionCapThb)} แต่ยังไม่ถูกนำมาคำนวณผลหลักจนกว่าจะตรวจสอบเงื่อนไขผู้ใช้และนโยบายอีกครั้ง</p><small>ข้อมูลอ้างอิงตรวจล่าสุด {solarAssumptions.fit.lastVerified}</small></div></div></section>
      <div className="site-shell"><LeadCapture /><Link className="back-link" href="/estimate"><ArrowLeft size={17} /> แก้ไขคำตอบ</Link></div>
    </main>
  );
}
