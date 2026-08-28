'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import {
  AirVent,
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CarFront,
  Check,
  CircleHelp,
  CookingPot,
  Factory,
  Home,
  House,
  Layers3,
  SunMedium,
  Trees,
  Warehouse,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import { BillSlider } from './bill-slider';
import { estimateFlow, estimateFlowEn } from '@/config/estimate-flow';
import { localizedPath, type Locale } from '@/config/i18n';
import { provinceOptions } from '@/config/provinces';
import { track } from '@/lib/analytics/track';
import { estimateAnswersSchema, estimateDraftSchema } from '@/lib/validation/estimate';
import type { DaytimeLoad, EstimateAnswers } from '@/lib/calculator/types';

type Draft = Partial<EstimateAnswers>;
type SavedDraft = { version: 3; answers: Draft; step: number };

const resultStorageKey = 'solarmatch:estimate';
const draftStorageKey = 'solarmatch:estimate-draft';
const starterStorageKey = 'solarmatch:starter';

const optionIcons: Record<string, LucideIcon> = {
  'detached-home': Home,
  townhouse: House,
  'large-home': Building2,
  shophouse: BriefcaseBusiness,
  warehouse: Warehouse,
  'apartment-building': Building2,
  'very-low': SunMedium,
  low: SunMedium,
  moderate: AirVent,
  high: Factory,
  'very-high': Factory,
  'air-conditioning': AirVent,
  pump: Waves,
  ev: CarFront,
  'office-equipment': BriefcaseBusiness,
  'business-equipment': Factory,
  'laundry-cooking': CookingPot,
  'other-high-use': Layers3,
  none: SunMedium,
  'concrete-tile': House,
  'clay-tile': House,
  'fibre-cement': House,
  'metal-sheet': Warehouse,
  'flat-concrete': Building2,
  'almost-none': SunMedium,
  little: SunMedium,
  some: Trees,
  'a-lot': Trees,
  unsure: CircleHelp,
  other: CircleHelp,
};

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

function migrateSaved(raw: unknown): SavedDraft | null {
  if (!raw || typeof raw !== 'object') return null;
  const object = raw as Record<string, unknown>;
  if (object.version === 3) {
    const parsed = estimateDraftSchema.safeParse(object);
    return parsed.success ? { version: 3, answers: parsed.data.answers as Draft, step: parsed.data.step } : null;
  }
  const source = (object.answers && typeof object.answers === 'object' ? object.answers : object) as Record<string, unknown>;
  const answers: Draft = {};
  if (typeof source.province === 'string') answers.province = source.province;
  if (typeof source.monthlyBillThb === 'number' && source.monthlyBillThb > 0) answers.monthlyBillThb = source.monthlyBillThb;
  if (typeof source.roofMaterial === 'string') answers.roofMaterial = source.roofMaterial === 'unknown' ? 'unsure' : source.roofMaterial;
  const oldPattern = source.daytimePattern;
  if (oldPattern === 'mostly-empty') answers.daytimePattern = 'very-low';
  if (oldPattern === 'light-use') answers.daytimePattern = 'low';
  if (oldPattern === 'work-or-ac') answers.daytimePattern = 'moderate';
  if (oldPattern === 'regular-loads') answers.daytimePattern = 'high';
  const oldShade = source.shade;
  if (oldShade === 'none') answers.shade = 'almost-none';
  if (oldShade === 'short') answers.shade = 'little';
  if (oldShade === 'several-hours') answers.shade = 'some';
  if (oldShade === 'heavy') answers.shade = 'a-lot';
  if (oldShade === 'unknown') answers.shade = 'unsure';
  return Object.keys(answers).length ? { version: 3, answers, step: 0 } : null;
}

export function EstimateShell({ locale = 'th' }: { locale?: Locale }) {
  const english = locale === 'en';
  const visibleFlow = useMemo(() => english ? estimateFlowEn : estimateFlow, [english]);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>({});
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const initializedRef = useRef(false);
  const questionHeadingRef = useRef<HTMLHeadingElement>(null);
  const question = visibleFlow[step];

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    const savedDraft = migrateSaved(parseJson(readSessionValue(draftStorageKey)));
    const completed = estimateAnswersSchema.safeParse(parseJson(readSessionValue(resultStorageKey)));
    const starter = migrateSaved(parseJson(readSessionValue(starterStorageKey)));
    const restored = starter?.answers ?? savedDraft?.answers ?? (completed.success ? completed.data : {});
    removeSessionValue(starterStorageKey);
    const firstUnanswered = visibleFlow.findIndex((item) => {
      if (item.id === 'daytimeLoads') return !(restored.daytimeLoads?.length);
      return restored[item.id as keyof Draft] === undefined;
    });
    track('estimate_started', { source: starter ? 'home' : savedDraft ? 'resume' : completed.success ? 'edit' : 'estimate' });
    queueMicrotask(() => {
      setDraft(restored);
      setStep(starter ? Math.max(0, firstUnanswered) : savedDraft ? Math.min(savedDraft.step, visibleFlow.length - 1) : 0);
      setReady(true);
    });
  }, [visibleFlow]);

  useEffect(() => {
    if (!ready) return;
    try { sessionStorage.setItem(draftStorageKey, JSON.stringify({ version: 3, answers: draft, step } satisfies SavedDraft)); } catch { /* The estimator remains usable. */ }
  }, [draft, ready, step]);

  useEffect(() => {
    if (!ready) return;
    const frame = requestAnimationFrame(() => questionHeadingRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [ready, step]);

  function setValue<K extends keyof EstimateAnswers>(key: K, value: EstimateAnswers[K] | undefined) {
    setDraft((current) => ({ ...current, [key]: value }));
    setError('');
  }

  function selected(id: string, value: string) {
    return draft[id as keyof Draft] === value;
  }

  function handleRadioKeys(event: KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    const radios = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]:not(:disabled)'));
    if (!radios.length) return;
    const currentIndex = Math.max(0, radios.indexOf(document.activeElement as HTMLButtonElement));
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? radios.length - 1
      : ['ArrowDown', 'ArrowRight'].includes(event.key) ? (currentIndex + 1) % radios.length : (currentIndex - 1 + radios.length) % radios.length;
    event.preventDefault();
    radios[nextIndex].focus();
    radios[nextIndex].click();
  }

  function validCurrent() {
    if (question.id === 'monthlyBillThb') return Boolean(draft.monthlyBillThb && draft.monthlyBillThb > 0);
    if (question.id === 'daytimeLoads') return Boolean(draft.daytimeLoads?.length);
    return Boolean(draft[question.id as keyof Draft]);
  }

  function next() {
    if (!validCurrent()) {
      setError(question.id === 'monthlyBillThb'
        ? (english ? 'Enter a bill amount greater than zero.' : 'กรอกยอดค่าไฟที่มากกว่าศูนย์')
        : (english ? 'Choose an answer before continuing.' : 'กรุณาเลือกคำตอบก่อนดำเนินการต่อ'));
      return;
    }
    track('estimate_step_completed', { stepId: question.id, stepNumber: step + 1 });
    if (step < visibleFlow.length - 1) {
      setStep((current) => current + 1);
      window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      return;
    }
    const parsed = estimateAnswersSchema.safeParse(draft);
    if (!parsed.success) {
      const firstMissing = visibleFlow.findIndex((item) => item.id === 'daytimeLoads' ? !draft.daytimeLoads?.length : draft[item.id as keyof Draft] === undefined);
      if (firstMissing >= 0) setStep(firstMissing);
      setError(english ? 'One answer is still missing.' : 'ยังมีคำตอบที่ต้องเลือกอีกหนึ่งข้อ');
      return;
    }
    try { sessionStorage.setItem(resultStorageKey, JSON.stringify(parsed.data)); } catch { /* Results page has a safe empty state. */ }
    removeSessionValue(draftStorageKey);
    window.location.assign(localizedPath('/estimate/results', locale));
  }

  function previous() {
    setStep((current) => Math.max(0, current - 1));
    setError('');
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  function restart() {
    [starterStorageKey, draftStorageKey, resultStorageKey].forEach(removeSessionValue);
    setDraft({});
    setStep(0);
    setError('');
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function toggleDaytimeLoad(value: DaytimeLoad) {
    const current = draft.daytimeLoads ?? [];
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : value === 'none'
        ? ['none' as const]
        : [...current.filter((item) => item !== 'none'), value];
    setValue('daytimeLoads', next);
  }

  return (
    <main className="estimate-page">
      <div className="site-shell estimate-focus-layout">
        <section className="estimate-card focus-card" aria-labelledby="estimate-question">
          <div className="segment-progress" role="progressbar" aria-valuemin={1} aria-valuemax={visibleFlow.length} aria-valuenow={step + 1} aria-label={english ? `Step ${step + 1} of ${visibleFlow.length}` : `ขั้นตอน ${step + 1} จาก ${visibleFlow.length}`}>
            {visibleFlow.map((item, index) => <span key={item.id} className={index <= step ? 'active' : ''} />)}
          </div>
          <p className="sr-only" aria-live="polite">{english ? `Step ${step + 1} of ${visibleFlow.length}` : `ขั้นตอน ${step + 1} จาก ${visibleFlow.length}`}</p>

          <fieldset className="hydration-fieldset" disabled={!ready} aria-busy={!ready}>
            <div className="question-stage" key={`${locale}-${question.id}`}>
              <div className="question-heading">
                <h1 id="estimate-question" ref={questionHeadingRef} tabIndex={-1}>{question.title}</h1>
                <p><CircleHelp size={17} aria-hidden="true" /> {question.reason}</p>
              </div>

              {question.type === 'province' && <label className="estimate-province-select" htmlFor="estimate-province">
                <span>{english ? 'Province' : 'จังหวัด'}</span>
                <select id="estimate-province" value={draft.province ?? ''} onChange={(event) => setValue('province', event.target.value)}>
                  <option value="" disabled>{english ? 'Select a province' : 'เลือกจังหวัด'}</option>
                  {provinceOptions.map((option) => <option value={option.value} key={option.value}>{option[locale]}</option>)}
                </select>
              </label>}

              {question.type === 'bill' && <BillSlider value={draft.monthlyBillThb} onChange={(value) => setValue('monthlyBillThb', value)} locale={locale} invalid={Boolean(error)} />}

              {question.type === 'choice' && <div className="choice-grid" role="radiogroup" aria-labelledby="estimate-question" aria-describedby={error ? 'estimate-error' : undefined} onKeyDown={handleRadioKeys}>
                {question.options?.map((option, index) => {
                  const isSelected = selected(question.id, option.value);
                  const hasSelection = question.options?.some((candidate) => selected(question.id, candidate.value));
                  const Icon = optionIcons[option.value] ?? CircleHelp;
                  return <button key={option.value} type="button" role="radio" aria-checked={isSelected} tabIndex={isSelected || (!hasSelection && index === 0) ? 0 : -1} className={`choice-card visual-choice ${isSelected ? 'selected' : ''}`} onClick={() => setValue(question.id as keyof EstimateAnswers, option.value as never)}><Icon className="choice-icon" aria-hidden="true" /><span><strong>{option.label}</strong>{option.description && <small>{option.description}</small>}</span><span className="choice-indicator" aria-hidden="true">{isSelected && <Check />}</span></button>;
                })}
              </div>}

              {question.type === 'multichoice' && <div className="choice-grid multichoice-grid" aria-labelledby="estimate-question">{question.options?.map((option) => {
                const checked = draft.daytimeLoads?.includes(option.value as DaytimeLoad) ?? false;
                const Icon = optionIcons[option.value] ?? CircleHelp;
                return <button key={option.value} type="button" role="checkbox" aria-checked={checked} className={`choice-card visual-choice ${checked ? 'selected' : ''}`} onClick={() => toggleDaytimeLoad(option.value as DaytimeLoad)}><Icon className="choice-icon" aria-hidden="true" /><strong>{option.label}</strong><span className="choice-indicator checkbox-indicator" aria-hidden="true">{checked && <Check />}</span></button>;
              })}</div>}

              {error && <p className="form-error" id="estimate-error" role="alert">{error}</p>}
              <div className="estimate-actions">
                <button className="button button-secondary" type="button" disabled={step === 0 || !ready} onClick={previous}><ArrowLeft aria-hidden="true" /> {english ? 'Back' : 'ย้อนกลับ'}</button>
                <button className="button" type="button" disabled={!ready} onClick={next}>{step === visibleFlow.length - 1 ? (english ? 'See my estimate' : 'ดูผลประเมิน') : (english ? 'Next' : 'ถัดไป')} <ArrowRight aria-hidden="true" /></button>
              </div>
            </div>
          </fieldset>
          <div className="estimate-privacy-line"><span>{english ? 'Answers stay in this browser. No contact details or lead is sent.' : 'คำตอบอยู่ในเบราว์เซอร์นี้ ไม่มีการส่งข้อมูลติดต่อหรือลูกค้าเป้าหมาย'}</span><button type="button" className="estimate-restart" onClick={restart}>{english ? 'Clear and start over' : 'ล้างข้อมูลและเริ่มใหม่'}</button></div>
        </section>
      </div>
    </main>
  );
}
