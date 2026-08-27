'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, CircleHelp } from 'lucide-react';
import { estimateFlow } from '@/config/estimate-flow';
import { featureFlags } from '@/config/feature-flags';
import { track } from '@/lib/analytics/track';
import { estimateAnswersSchema } from '@/lib/validation/estimate';
import type { EstimateAnswers } from '@/lib/calculator/types';
import { PrototypeNotice } from '@/components/site/prototype-notice';

type Draft = Partial<EstimateAnswers>;
const storageKey = 'solarmatch:estimate';

export function EstimateShell() {
  const router = useRouter();
  const visibleFlow = useMemo(() => estimateFlow.filter((question) => question.id !== 'energyInterest' || featureFlags.ASK_ENERGY_INTEREST), []);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>({});
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const question = visibleFlow[step];

  useEffect(() => {
    const starter = sessionStorage.getItem('solarmatch:starter');
    if (starter) {
      // Browser storage is an external system; hydrate it after the server-safe first render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      try { setDraft((current) => ({ ...current, ...JSON.parse(starter) })); } catch { /* Ignore malformed browser drafts. */ }
    }
    track('estimate_started', { source: starter ? 'home' : 'estimate' });
    queueMicrotask(() => setReady(true));
  }, []);

  function setValue<K extends keyof EstimateAnswers>(key: K, value: EstimateAnswers[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setError('');
  }

  function validCurrent() {
    if (question.type === 'number') return Number(draft.monthlyBillThb) >= 500;
    if (question.type === 'roof') return typeof draft.roofKnown === 'boolean';
    return Boolean(draft[question.id as keyof Draft]);
  }

  function next() {
    if (!validCurrent()) {
      setError(question.type === 'number' ? 'กรุณากรอกค่าไฟตั้งแต่ 500 บาทขึ้นไป' : 'กรุณาเลือกคำตอบก่อนดำเนินการต่อ');
      return;
    }
    track('estimate_step_completed', { stepId: question.id, stepNumber: step + 1 });
    if (step < visibleFlow.length - 1) {
      setStep((current) => current + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const parsed = estimateAnswersSchema.safeParse(draft);
    if (!parsed.success) {
      setError('ยังมีข้อมูลบางส่วนไม่ครบ กรุณาตรวจสอบอีกครั้ง');
      return;
    }
    sessionStorage.setItem(storageKey, JSON.stringify(parsed.data));
    router.push('/estimate/results');
  }

  const selected = (id: string, value: string) => draft[id as keyof Draft] === value;

  return (
    <main className="estimate-page">
      <div className="site-shell estimate-layout">
        <aside className="estimate-aside">
          <p className="eyebrow">SolarMatch Estimate</p>
          <h1>เริ่มจากข้อมูลที่คุณรู้</h1>
          <p>ไม่ต้องอัปโหลดบิล ไม่ต้องรู้ขนาดหลังคา และยังไม่ต้องกรอกเบอร์โทร</p>
          <PrototypeNotice compact />
        </aside>
        <section className="estimate-card" aria-labelledby="estimate-question">
          <div className="progress-meta"><span>ขั้นตอน {step + 1} จาก {visibleFlow.length}</span><span>{Math.round(((step + 1) / visibleFlow.length) * 100)}%</span></div>
          <div className="progress-track" aria-hidden="true"><span style={{ width: `${((step + 1) / visibleFlow.length) * 100}%` }} /></div>
          <fieldset className="hydration-fieldset" disabled={!ready} aria-busy={!ready}>
          <div className="question-heading">
            <h2 id="estimate-question">{question.title}</h2>
            <p><CircleHelp size={17} aria-hidden="true" /> {question.reason}</p>
          </div>

          {question.type === 'choice' && <div className="choice-grid" role="radiogroup" aria-labelledby="estimate-question">
            {question.options?.map((option) => {
              const isSelected = selected(question.id, option.value);
              return <button key={option.value} type="button" role="radio" aria-checked={isSelected} className={`choice-card ${isSelected ? 'selected' : ''}`} onClick={() => setValue(question.id as keyof EstimateAnswers, option.value)}>
                <span className="choice-indicator">{isSelected && <Check size={15} />}</span>
                <span><strong>{option.label}</strong>{option.description && <small>{option.description}</small>}</span>
              </button>;
            })}
          </div>}

          {question.type === 'number' && <div className="bill-question">
            <label htmlFor="monthly-bill">ค่าไฟเฉลี่ยต่อเดือน</label>
            <div className="large-currency-input"><span>฿</span><input id="monthly-bill" type="number" inputMode="numeric" min="500" max="50000" value={draft.monthlyBillThb ?? ''} placeholder="3,500" onChange={(event) => setValue('monthlyBillThb', Number(event.target.value))} /><small>/ เดือน</small></div>
            <input className="bill-slider" aria-label="ปรับค่าไฟ" type="range" min="500" max="20000" step="100" value={draft.monthlyBillThb ?? 3500} onChange={(event) => setValue('monthlyBillThb', Number(event.target.value))} />
            <div className="range-labels"><span>฿500</span><span>฿20,000+</span></div>
          </div>}

          {question.type === 'roof' && <div className="roof-question">
            <div className="choice-grid two">
              <button type="button" className={`choice-card ${draft.roofKnown === true ? 'selected' : ''}`} onClick={() => setValue('roofKnown', true)}><span className="choice-indicator">{draft.roofKnown === true && <Check size={15} />}</span><strong>พอรู้ข้อมูล</strong></button>
              <button type="button" className={`choice-card ${draft.roofKnown === false ? 'selected' : ''}`} onClick={() => { setValue('roofKnown', false); setValue('shade', 'unknown'); }}><span className="choice-indicator">{draft.roofKnown === false && <Check size={15} />}</span><strong>ไม่แน่ใจ / ข้ามได้</strong></button>
            </div>
            {draft.roofKnown === true && <div className="roof-details">
              <label>วัสดุหลังคา<select value={draft.roofMaterial ?? ''} onChange={(event) => setValue('roofMaterial', event.target.value)}><option value="">เลือกถ้าทราบ</option><option value="tile">กระเบื้อง</option><option value="metal">เมทัลชีท</option><option value="concrete">ดาดฟ้าคอนกรีต</option><option value="other">อื่น ๆ / ไม่แน่ใจ</option></select></label>
              <label>เงาบัง<select value={draft.shade ?? 'unknown'} onChange={(event) => setValue('shade', event.target.value as EstimateAnswers['shade'])}><option value="none">แทบไม่มี</option><option value="partial">มีบางช่วง</option><option value="high">มีค่อนข้างมาก</option><option value="unknown">ไม่แน่ใจ</option></select></label>
            </div>}
          </div>}

          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="estimate-actions">
            <button className="button button-secondary" type="button" disabled={step === 0} onClick={() => { setStep((current) => Math.max(0, current - 1)); setError(''); }}><ArrowLeft size={18} /> ย้อนกลับ</button>
            <button className="button" type="button" disabled={!validCurrent()} onClick={next}>{step === visibleFlow.length - 1 ? 'ดูผลประเมิน' : 'ถัดไป'} <ArrowRight size={18} /></button>
          </div>
          </fieldset>
        </section>
      </div>
    </main>
  );
}
