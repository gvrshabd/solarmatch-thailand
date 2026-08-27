'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BatteryCharging,
  Building2,
  CalendarDays,
  Check,
  CircleHelp,
  Clock3,
  FlaskConical,
  Home,
  House,
  KeyRound,
  MapPin,
  MoonStar,
  Search,
  SunMedium,
  Sunrise,
  Trees,
  Users,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';
import { estimateFlow, estimateFlowEn } from '@/config/estimate-flow';
import { featureFlags } from '@/config/feature-flags';
import { localizedPath, type Locale } from '@/config/i18n';
import { track } from '@/lib/analytics/track';
import { estimateAnswersSchema, estimateDraftSchema } from '@/lib/validation/estimate';
import type { EstimateAnswers } from '@/lib/calculator/types';

type Draft = Partial<EstimateAnswers>;
type SavedDraft = { version: 1; answers: Draft; step: number };

const resultStorageKey = 'solarmatch:estimate';
const draftStorageKey = 'solarmatch:estimate-draft';
const starterStorageKey = 'solarmatch:starter';

const optionIcons: Record<string, LucideIcon> = {
  bangkok: Building2,
  nonthaburi: Home,
  'pathum-thani': Trees,
  'samut-prakan': Warehouse,
  high: SunMedium,
  medium: Sunrise,
  low: MoonStar,
  owner: KeyRound,
  family: Users,
  renter: House,
  detached: Home,
  'semi-detached': House,
  townhome: Building2,
  '0-3': Clock3,
  '3-6': CalendarDays,
  '6-12': CalendarDays,
  '12+': CalendarDays,
  research: Search,
  solar: SunMedium,
  'solar-battery': BatteryCharging,
  unknown: CircleHelp,
  other: MapPin,
};

const roofMaterials = [
  { value: 'tile', th: 'กระเบื้อง', en: 'Tile', icon: House },
  { value: 'metal', th: 'เมทัลชีท', en: 'Metal sheet', icon: Warehouse },
  { value: 'concrete', th: 'ดาดฟ้าคอนกรีต', en: 'Concrete deck', icon: Building2 },
  { value: 'other', th: 'อื่น ๆ / ไม่แน่ใจ', en: 'Other / not sure', icon: CircleHelp },
];

const shadeOptions: { value: NonNullable<EstimateAnswers['shade']>; th: string; en: string; icon: LucideIcon }[] = [
  { value: 'none', th: 'แทบไม่มี', en: 'Almost none', icon: SunMedium },
  { value: 'partial', th: 'มีบางช่วง', en: 'Some periods', icon: Sunrise },
  { value: 'high', th: 'มีค่อนข้างมาก', en: 'Significant shade', icon: Trees },
  { value: 'unknown', th: 'ไม่แน่ใจ', en: 'Not sure', icon: CircleHelp },
];

function parseJson(value: string | null): unknown {
  if (!value) return null;
  try { return JSON.parse(value) as unknown; } catch { return null; }
}

function readSessionValue(key: string) {
  try { return sessionStorage.getItem(key); } catch { return null; }
}

function removeSessionValue(key: string) {
  try { sessionStorage.removeItem(key); } catch { /* Storage may be unavailable. */ }
}

export function EstimateShell({ locale = 'th' }: { locale?: Locale }) {
  const english = locale === 'en';
  const visibleFlow = useMemo(
    () => (english ? estimateFlowEn : estimateFlow).filter((question) => question.id !== 'energyInterest' || featureFlags.ASK_ENERGY_INTEREST),
    [english],
  );
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>({});
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const questionHeadingRef = useRef<HTMLHeadingElement>(null);
  const question = visibleFlow[step];

  useEffect(() => {
    const starterResult = estimateAnswersSchema.partial().safeParse(parseJson(readSessionValue(starterStorageKey)));
    const rawSavedDraft = parseJson(readSessionValue(draftStorageKey));
    const migratedSavedDraft = rawSavedDraft && typeof rawSavedDraft === 'object' && !('version' in rawSavedDraft)
      ? { ...rawSavedDraft, version: 1 }
      : rawSavedDraft;
    const savedDraftResult = estimateDraftSchema.safeParse(migratedSavedDraft);
    const completedResult = estimateAnswersSchema.safeParse(parseJson(readSessionValue(resultStorageKey)));
    const starter = starterResult.success ? starterResult.data : null;
    const savedDraft = savedDraftResult.success ? savedDraftResult.data : null;
    const completed = completedResult.success ? completedResult.data : null;
    const restored = starter ?? savedDraft?.answers ?? completed ?? {};

    // Browser storage hydrates only after the server-safe initial render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(restored);
    if (!starter && savedDraft) setStep(Math.min(Math.max(savedDraft.step, 0), visibleFlow.length - 1));
    removeSessionValue(starterStorageKey);
    track('estimate_started', { source: starter ? 'home' : savedDraft ? 'resume' : completed ? 'edit' : 'estimate' });
    queueMicrotask(() => setReady(true));
  }, [visibleFlow.length]);

  useEffect(() => {
    if (!ready) return;
    try {
      sessionStorage.setItem(draftStorageKey, JSON.stringify({ version: 1, answers: draft, step } satisfies SavedDraft));
    } catch { /* The estimator remains usable without browser storage. */ }
  }, [draft, ready, step]);

  useEffect(() => {
    if (!ready) return;
    const frame = requestAnimationFrame(() => questionHeadingRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [ready, step]);

  function setValue<K extends keyof EstimateAnswers>(key: K, value: EstimateAnswers[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setError('');
  }

  function validCurrent() {
    if (question.type === 'number') {
      const amount = Number(draft.monthlyBillThb);
      return Number.isFinite(amount) && amount >= 500 && amount <= 50000;
    }
    if (question.type === 'roof') return typeof draft.roofKnown === 'boolean';
    return Boolean(draft[question.id as keyof Draft]);
  }

  function next() {
    if (!validCurrent()) {
      setError(question.type === 'number'
        ? (english ? 'Please enter a monthly electricity bill from ฿500 to ฿50,000.' : 'กรุณากรอกค่าไฟต่อเดือนระหว่าง 500–50,000 บาท')
        : (english ? 'Please choose an answer before continuing.' : 'กรุณาเลือกคำตอบก่อนดำเนินการต่อ'));
      return;
    }
    track('estimate_step_completed', { stepId: question.id, stepNumber: step + 1 });
    if (step < visibleFlow.length - 1) {
      setStep((current) => current + 1);
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      return;
    }
    const parsed = estimateAnswersSchema.safeParse(draft);
    if (!parsed.success) {
      setError(english ? 'Some information is still incomplete. Please check your answers.' : 'ยังมีข้อมูลบางส่วนไม่ครบ กรุณาตรวจสอบอีกครั้ง');
      return;
    }
    try { sessionStorage.setItem(resultStorageKey, JSON.stringify(parsed.data)); } catch { /* Navigation still shows the safe empty state if storage is unavailable. */ }
    removeSessionValue(draftStorageKey);
    window.location.assign(localizedPath('/estimate/results', locale));
  }

  function previous() {
    setStep((current) => Math.max(0, current - 1));
    setError('');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  function restart() {
    removeSessionValue(starterStorageKey);
    removeSessionValue(draftStorageKey);
    removeSessionValue(resultStorageKey);
    setDraft({});
    setStep(0);
    setError('');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    requestAnimationFrame(() => questionHeadingRef.current?.focus());
  }

  function handleRadioKeys(event: KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    const radios = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]:not(:disabled)'));
    if (radios.length === 0) return;
    const currentIndex = Math.max(0, radios.indexOf(document.activeElement as HTMLButtonElement));
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? radios.length - 1
        : ['ArrowDown', 'ArrowRight'].includes(event.key)
          ? (currentIndex + 1) % radios.length
          : (currentIndex - 1 + radios.length) % radios.length;
    event.preventDefault();
    radios[nextIndex].focus();
    radios[nextIndex].click();
  }

  const selected = (id: string, value: string) => draft[id as keyof Draft] === value;

  return (
    <main className="estimate-page">
      <div className="site-shell estimate-focus-layout">
        <section className="estimate-card focus-card" aria-labelledby="estimate-question">
          <div
            className="segment-progress"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={visibleFlow.length}
            aria-valuenow={step + 1}
            aria-label={english ? `Step ${step + 1} of ${visibleFlow.length}` : `ขั้นตอน ${step + 1} จาก ${visibleFlow.length}`}
          >
            {visibleFlow.map((item, index) => <span key={item.id} className={index <= step ? 'active' : ''} />)}
          </div>
          <p className="sr-only" aria-live="polite">{english ? `Step ${step + 1} of ${visibleFlow.length}` : `ขั้นตอน ${step + 1} จาก ${visibleFlow.length}`}</p>

          <fieldset className="hydration-fieldset" disabled={!ready} aria-busy={!ready}>
            <div className="question-stage" key={`${locale}-${question.id}`}>
              <div className="question-heading">
                <h1 id="estimate-question" ref={questionHeadingRef} tabIndex={-1}>{question.title}</h1>
                <p><CircleHelp size={17} aria-hidden="true" /> {question.reason}</p>
              </div>

              {question.type === 'choice' && <div className={`choice-grid visual-options visual-options-${question.id}`} role="radiogroup" aria-labelledby="estimate-question" aria-describedby={error ? 'estimate-error' : undefined} onKeyDown={handleRadioKeys}>
                {question.options?.map((option) => {
                  const isSelected = selected(question.id, option.value);
                  const hasSelection = question.options?.some((candidate) => selected(question.id, candidate.value));
                  const Icon = optionIcons[option.value] ?? CircleHelp;
                  return <button key={option.value} type="button" role="radio" aria-checked={isSelected} tabIndex={isSelected || (!hasSelection && option === question.options?.[0]) ? 0 : -1} className={`choice-card visual-choice ${isSelected ? 'selected' : ''}`} onClick={() => setValue(question.id as keyof EstimateAnswers, option.value)}>
                    <Icon className="choice-icon" size={22} aria-hidden="true" />
                    <span><strong>{option.label}</strong>{option.description && <small>{option.description}</small>}</span>
                    <span className="choice-indicator" aria-hidden="true">{isSelected && <Check size={15} />}</span>
                  </button>;
                })}
              </div>}

              {question.type === 'number' && <div className="bill-question">
                <label htmlFor="monthly-bill">{english ? 'Average monthly electricity bill' : 'ค่าไฟเฉลี่ยต่อเดือน'}</label>
                <div className="large-currency-input"><span>฿</span><input id="monthly-bill" type="number" inputMode="numeric" min="500" max="50000" value={draft.monthlyBillThb ?? ''} placeholder="3,500" aria-invalid={Boolean(error)} aria-describedby={error ? 'estimate-error' : undefined} onChange={(event) => setValue('monthlyBillThb', Number(event.target.value))} /><small>{english ? '/ month' : '/ เดือน'}</small></div>
                <input className="bill-slider" aria-label={english ? 'Adjust electricity bill' : 'ปรับค่าไฟ'} type="range" min="500" max="20000" step="100" value={draft.monthlyBillThb ?? 3500} onChange={(event) => setValue('monthlyBillThb', Number(event.target.value))} />
                <div className="range-labels"><span>฿500</span><span>฿20,000+</span></div>
              </div>}

              {question.type === 'roof' && <div className="roof-question">
                <div className="choice-grid two" role="radiogroup" aria-label={english ? 'Knowledge of roof details' : 'ความรู้เกี่ยวกับหลังคา'} aria-describedby={error ? 'estimate-error' : undefined} onKeyDown={handleRadioKeys}>
                  <button type="button" role="radio" aria-checked={draft.roofKnown === true} tabIndex={draft.roofKnown !== false ? 0 : -1} className={`choice-card visual-choice ${draft.roofKnown === true ? 'selected' : ''}`} onClick={() => setValue('roofKnown', true)}><House className="choice-icon" /><strong>{english ? 'I know some details' : 'พอรู้ข้อมูล'}</strong><span className="choice-indicator">{draft.roofKnown === true && <Check size={15} />}</span></button>
                  <button type="button" role="radio" aria-checked={draft.roofKnown === false} tabIndex={draft.roofKnown === false ? 0 : -1} className={`choice-card visual-choice ${draft.roofKnown === false ? 'selected' : ''}`} onClick={() => { setValue('roofKnown', false); setValue('shade', 'unknown'); }}><CircleHelp className="choice-icon" /><strong>{english ? 'Not sure / skip details' : 'ไม่แน่ใจ / ข้ามได้'}</strong><span className="choice-indicator">{draft.roofKnown === false && <Check size={15} />}</span></button>
                </div>
                {draft.roofKnown === true && <div className="roof-visual-details">
                  <div><p>{english ? 'Roof material' : 'วัสดุหลังคา'}</p><div className="compact-choice-grid">{roofMaterials.map((item) => { const Icon = item.icon; const active = draft.roofMaterial === item.value; return <button key={item.value} type="button" aria-pressed={active} className={active ? 'selected' : ''} onClick={() => setValue('roofMaterial', item.value)}><Icon /><span>{english ? item.en : item.th}</span></button>; })}</div></div>
                  <div><p>{english ? 'Shade' : 'เงาบัง'}</p><div className="compact-choice-grid">{shadeOptions.map((item) => { const Icon = item.icon; const active = draft.shade === item.value; return <button key={item.value} type="button" aria-pressed={active} className={active ? 'selected' : ''} onClick={() => setValue('shade', item.value)}><Icon /><span>{english ? item.en : item.th}</span></button>; })}</div></div>
                </div>}
              </div>}

              {error && <p className="form-error" id="estimate-error" role="alert">{error}</p>}
              <div className="estimate-actions">
                <button className="button button-secondary" type="button" disabled={step === 0 || !ready} onClick={previous}><ArrowLeft size={18} /> {english ? 'Back' : 'ย้อนกลับ'}</button>
                <button className="button" type="button" disabled={!ready} onClick={next}>{step === visibleFlow.length - 1 ? (english ? 'See estimate' : 'ดูผลประเมิน') : (english ? 'Next' : 'ถัดไป')} <ArrowRight size={18} /></button>
              </div>
            </div>
          </fieldset>
          <div className="estimate-prototype-line"><FlaskConical size={16} aria-hidden="true" /><span>{english ? 'Prototype: answers stay in this browser session and are not sent to an installer.' : 'เวอร์ชันต้นแบบ: คำตอบอยู่ในเซสชันเบราว์เซอร์นี้และยังไม่ส่งให้ผู้ติดตั้ง'}</span><button type="button" className="estimate-restart" onClick={restart}>{english ? 'Start over' : 'เริ่มใหม่'}</button></div>
        </section>
      </div>
    </main>
  );
}
