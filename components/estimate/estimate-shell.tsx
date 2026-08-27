'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
import { estimateAnswersSchema } from '@/lib/validation/estimate';
import type { EstimateAnswers } from '@/lib/calculator/types';

type Draft = Partial<EstimateAnswers>;
type SavedDraft = { answers: Draft; step: number };

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

function safeParse<T>(value: string | null): T | null {
  if (!value) return null;
  try { return JSON.parse(value) as T; } catch { return null; }
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
    const starter = safeParse<Draft>(sessionStorage.getItem(starterStorageKey));
    const savedDraft = safeParse<SavedDraft>(sessionStorage.getItem(draftStorageKey));
    const completed = safeParse<Draft>(sessionStorage.getItem(resultStorageKey));
    const restored = starter ?? savedDraft?.answers ?? completed ?? {};

    // Browser storage hydrates only after the server-safe initial render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(restored);
    if (!starter && savedDraft) setStep(Math.min(Math.max(savedDraft.step, 0), visibleFlow.length - 1));
    sessionStorage.removeItem(starterStorageKey);
    track('estimate_started', { source: starter ? 'home' : savedDraft ? 'resume' : completed ? 'edit' : 'estimate' });
    queueMicrotask(() => setReady(true));
  }, [visibleFlow.length]);

  useEffect(() => {
    if (!ready) return;
    sessionStorage.setItem(draftStorageKey, JSON.stringify({ answers: draft, step } satisfies SavedDraft));
  }, [draft, ready, step]);

  useEffect(() => {
    if (!ready) return;
    questionHeadingRef.current?.focus({ preventScroll: true });
  }, [ready, step]);

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
      setError(question.type === 'number'
        ? (english ? 'Please enter an electricity bill of at least ฿500.' : 'กรุณากรอกค่าไฟตั้งแต่ 500 บาทขึ้นไป')
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
    sessionStorage.setItem(resultStorageKey, JSON.stringify(parsed.data));
    sessionStorage.removeItem(draftStorageKey);
    window.location.assign(localizedPath('/estimate/results', locale));
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

              {question.type === 'choice' && <div className={`choice-grid visual-options visual-options-${question.id}`} role="radiogroup" aria-labelledby="estimate-question">
                {question.options?.map((option) => {
                  const isSelected = selected(question.id, option.value);
                  const Icon = optionIcons[option.value] ?? CircleHelp;
                  return <button key={option.value} type="button" role="radio" aria-checked={isSelected} className={`choice-card visual-choice ${isSelected ? 'selected' : ''}`} onClick={() => setValue(question.id as keyof EstimateAnswers, option.value)}>
                    <Icon className="choice-icon" size={22} aria-hidden="true" />
                    <span><strong>{option.label}</strong>{option.description && <small>{option.description}</small>}</span>
                    <span className="choice-indicator" aria-hidden="true">{isSelected && <Check size={15} />}</span>
                  </button>;
                })}
              </div>}

              {question.type === 'number' && <div className="bill-question">
                <label htmlFor="monthly-bill">{english ? 'Average monthly electricity bill' : 'ค่าไฟเฉลี่ยต่อเดือน'}</label>
                <div className="large-currency-input"><span>฿</span><input id="monthly-bill" type="number" inputMode="numeric" min="500" max="50000" value={draft.monthlyBillThb ?? ''} placeholder="3,500" onChange={(event) => setValue('monthlyBillThb', Number(event.target.value))} /><small>{english ? '/ month' : '/ เดือน'}</small></div>
                <input className="bill-slider" aria-label={english ? 'Adjust electricity bill' : 'ปรับค่าไฟ'} type="range" min="500" max="20000" step="100" value={draft.monthlyBillThb ?? 3500} onChange={(event) => setValue('monthlyBillThb', Number(event.target.value))} />
                <div className="range-labels"><span>฿500</span><span>฿20,000+</span></div>
              </div>}

              {question.type === 'roof' && <div className="roof-question">
                <div className="choice-grid two" role="radiogroup" aria-label={english ? 'Knowledge of roof details' : 'ความรู้เกี่ยวกับหลังคา'}>
                  <button type="button" role="radio" aria-checked={draft.roofKnown === true} className={`choice-card visual-choice ${draft.roofKnown === true ? 'selected' : ''}`} onClick={() => setValue('roofKnown', true)}><House className="choice-icon" /><strong>{english ? 'I know some details' : 'พอรู้ข้อมูล'}</strong><span className="choice-indicator">{draft.roofKnown === true && <Check size={15} />}</span></button>
                  <button type="button" role="radio" aria-checked={draft.roofKnown === false} className={`choice-card visual-choice ${draft.roofKnown === false ? 'selected' : ''}`} onClick={() => { setValue('roofKnown', false); setValue('shade', 'unknown'); }}><CircleHelp className="choice-icon" /><strong>{english ? 'Not sure / skip details' : 'ไม่แน่ใจ / ข้ามได้'}</strong><span className="choice-indicator">{draft.roofKnown === false && <Check size={15} />}</span></button>
                </div>
                {draft.roofKnown === true && <div className="roof-visual-details">
                  <div><p>{english ? 'Roof material' : 'วัสดุหลังคา'}</p><div className="compact-choice-grid">{roofMaterials.map((item) => { const Icon = item.icon; const active = draft.roofMaterial === item.value; return <button key={item.value} type="button" aria-pressed={active} className={active ? 'selected' : ''} onClick={() => setValue('roofMaterial', item.value)}><Icon /><span>{english ? item.en : item.th}</span></button>; })}</div></div>
                  <div><p>{english ? 'Shade' : 'เงาบัง'}</p><div className="compact-choice-grid">{shadeOptions.map((item) => { const Icon = item.icon; const active = draft.shade === item.value; return <button key={item.value} type="button" aria-pressed={active} className={active ? 'selected' : ''} onClick={() => setValue('shade', item.value)}><Icon /><span>{english ? item.en : item.th}</span></button>; })}</div></div>
                </div>}
              </div>}

              {error && <p className="form-error" role="alert">{error}</p>}
              <div className="estimate-actions">
                <button className="button button-secondary" type="button" disabled={step === 0 || !ready} onClick={() => { setStep((current) => Math.max(0, current - 1)); setError(''); }}><ArrowLeft size={18} /> {english ? 'Back' : 'ย้อนกลับ'}</button>
                <button className="button" type="button" disabled={!ready} onClick={next}>{step === visibleFlow.length - 1 ? (english ? 'See estimate' : 'ดูผลประเมิน') : (english ? 'Next' : 'ถัดไป')} <ArrowRight size={18} /></button>
              </div>
            </div>
          </fieldset>
          <div className="estimate-prototype-line"><FlaskConical size={16} aria-hidden="true" /><span>{english ? 'Prototype: answers stay in this browser session and are not sent to an installer.' : 'เวอร์ชันต้นแบบ: คำตอบอยู่ในเซสชันเบราว์เซอร์นี้และยังไม่ส่งให้ผู้ติดตั้ง'}</span></div>
        </section>
      </div>
    </main>
  );
}
