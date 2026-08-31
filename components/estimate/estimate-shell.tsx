'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  AirVent, ArrowLeft, ArrowRight, Building2, CarFront, Check, CircleHelp,
  CookingPot, Home, House, Layers3, Laptop, SunMedium, Trees, Waves,
  type LucideIcon,
} from 'lucide-react';
import { BillSlider } from './bill-slider';
import { initialQuestionnaire } from '@/config/assessment';
import { localizedPath, type Locale } from '@/config/i18n';
import { provinceOptions } from '@/config/provinces';
import { track } from '@/lib/analytics/track';
import { estimateAnswersSchema, estimateDraftSchema } from '@/lib/validation/estimate';
import type { DaytimeLoad, EstimateAnswers } from '@/lib/calculator/types';
import type { AssessmentQuestion, ConditionalField, PublicAssessmentConfig, QuestionnaireDocument } from '@/lib/questionnaire/types';

type Draft = Partial<EstimateAnswers>;
type SavedDraft = {
  version: 4;
  answers: Draft;
  step: number;
  questionnaireVersionId?: string;
  releaseId?: string;
  assessmentToken?: string;
  assessmentTokenExpiresAt?: string;
};

const resultStorageKey = 'solarmatch:estimate';
const draftStorageKey = 'solarmatch:estimate-draft';
const starterStorageKey = 'solarmatch:starter';
export const assessmentContextStorageKey = 'solarmatch:assessment-context';

const optionIcons: Record<string, LucideIcon> = {
  'detached-home': Home,
  'semi-detached-home': House,
  townhouse: House,
  'large-home': Building2,
  'other-residential': CircleHelp,
  owner: Home,
  renter: House,
  'very-low': SunMedium,
  low: SunMedium,
  moderate: AirVent,
  high: AirVent,
  'very-high': AirVent,
  'air-conditioning': AirVent,
  pump: Waves,
  ev: CarFront,
  'home-office-equipment': Laptop,
  'laundry-cooking': CookingPot,
  'other-high-use': Layers3,
  none: SunMedium,
  'concrete-tile': House,
  'clay-tile': House,
  'fibre-cement': House,
  'metal-sheet': House,
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

function writeSessionValue(key: string, value: unknown) {
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* The estimator remains usable without storage. */ }
}

function removeSessionValue(key: string) {
  try { sessionStorage.removeItem(key); } catch { /* Storage may be unavailable. */ }
}

function migrateSaved(raw: unknown): SavedDraft | null {
  const parsed = estimateDraftSchema.safeParse(raw);
  if (parsed.success) return { ...parsed.data, answers: parsed.data.answers as Draft };
  if (!raw || typeof raw !== 'object') return null;
  const source = ((raw as Record<string, unknown>).answers ?? raw) as Record<string, unknown>;
  const answers: Draft = {};
  const allowedProvinces = new Set<string>(provinceOptions.map((option) => option.value));
  if (typeof source.province === 'string' && allowedProvinces.has(source.province)) answers.province = source.province;
  if (typeof source.monthlyBillThb === 'number' && source.monthlyBillThb > 0) answers.monthlyBillThb = source.monthlyBillThb;
  if (['detached-home', 'townhouse', 'large-home'].includes(String(source.propertyType))) answers.propertyType = source.propertyType as EstimateAnswers['propertyType'];
  if (typeof source.roofArea === 'string') answers.roofArea = source.roofArea as EstimateAnswers['roofArea'];
  if (typeof source.daytimePattern === 'string') answers.daytimePattern = source.daytimePattern as EstimateAnswers['daytimePattern'];
  if (Array.isArray(source.daytimeLoads)) {
    const allowedLoads = new Set<DaytimeLoad>(['air-conditioning', 'pump', 'ev', 'home-office-equipment', 'laundry-cooking', 'other-high-use', 'none']);
    answers.daytimeLoads = source.daytimeLoads.filter((item): item is DaytimeLoad => allowedLoads.has(item as DaytimeLoad));
  }
  if (typeof source.roofMaterial === 'string') answers.roofMaterial = source.roofMaterial === 'unknown' ? 'unsure' : source.roofMaterial;
  if (typeof source.shade === 'string') answers.shade = source.shade as EstimateAnswers['shade'];
  return Object.keys(answers).length ? { version: 4, answers, step: 0 } : null;
}

function conditionalActive(field: ConditionalField, question: AssessmentQuestion, draft: Draft) {
  const value = draft[question.id as keyof Draft];
  return Array.isArray(value) ? value.includes(field.whenOption as never) : value === field.whenOption;
}

function firstQuestionError(question: AssessmentQuestion, draft: Draft, english: boolean) {
  const value = draft[question.id as keyof Draft];
  if (question.id === 'monthlyBillThb' && (!draft.monthlyBillThb || draft.monthlyBillThb <= 0)) {
    return english ? 'Enter a typical bill amount greater than zero.' : 'กรอกค่าไฟของเดือนปกติที่มากกว่าศูนย์';
  }
  if (question.id === 'daytimeLoads' && (!draft.daytimeLoads?.length)) {
    return english ? 'Select at least one answer.' : 'เลือกอย่างน้อยหนึ่งข้อ';
  }
  if (question.required && (value === undefined || value === '' || (Array.isArray(value) && value.length === 0))) {
    return english ? 'Choose an answer before continuing.' : 'กรุณาเลือกคำตอบก่อนดำเนินการต่อ';
  }
  for (const field of question.conditionalFields ?? []) {
    if (!conditionalActive(field, question, draft)) continue;
    const fieldValue = draft[field.id as keyof Draft];
    if (field.kind === 'ac-count' && (!Number.isInteger(fieldValue) || Number(fieldValue) < 1)) {
      return english ? 'Enter the number of installed air-conditioning units.' : 'ระบุจำนวนเครื่องปรับอากาศที่ติดตั้งทั้งหมด';
    }
    if (field.kind === 'text' && (typeof fieldValue !== 'string' || fieldValue.trim().length < (field.minLength ?? 1))) {
      return english ? 'Complete the additional detail before continuing.' : 'กรอกรายละเอียดเพิ่มเติมก่อนดำเนินการต่อ';
    }
  }
  return '';
}

function AssessmentConditionalField({ field, question, draft, locale, setValue }: {
  field: ConditionalField;
  question: AssessmentQuestion;
  draft: Draft;
  locale: Locale;
  setValue: <K extends keyof EstimateAnswers>(key: K, value: EstimateAnswers[K] | undefined) => void;
}) {
  if (!conditionalActive(field, question, draft)) return null;
  const english = locale === 'en';
  if (field.kind === 'ac-count') {
    const count = draft.airConditionerCount;
    return <div className="conditional-followup ac-count-followup">
      <label htmlFor="air-conditioner-count">{field.label[locale]}<span aria-hidden="true">*</span></label>
      {field.help && <p>{field.help[locale]}</p>}
      <div className="ac-count-controls">
        <select id="air-conditioner-count" value={count && count >= 10 ? '10+' : count ?? ''} onChange={(event) => setValue('airConditionerCount', event.target.value === '10+' ? 10 : Number(event.target.value) || undefined)}>
          <option value="" disabled>{english ? 'Select a number' : 'เลือกจำนวน'}</option>
          {Array.from({ length: 9 }, (_, index) => index + 1).map((number) => <option key={number} value={number}>{number}</option>)}
          <option value="10+">10+</option>
        </select>
        {count !== undefined && count >= 10 && <label htmlFor="air-conditioner-count-exact"><span>{english ? 'Exact number (optional)' : 'จำนวนที่แน่นอน (ไม่บังคับ)'}</span><input id="air-conditioner-count-exact" type="number" inputMode="numeric" min="10" max="100" value={count} onChange={(event) => setValue('airConditionerCount', event.target.value === '' ? 10 : Math.min(100, Math.max(10, Number(event.target.value))))} /></label>}
      </div>
    </div>;
  }
  return <div className="conditional-followup">
    <label htmlFor={`conditional-${field.id}`}>{field.label[locale]}<span aria-hidden="true">*</span></label>
    {field.help && <p>{field.help[locale]}</p>}
    <input id={`conditional-${field.id}`} type="text" maxLength={field.maxLength} placeholder={field.placeholder?.[locale]} value={String(draft[field.id as keyof Draft] ?? '')} onChange={(event) => setValue(field.id as keyof EstimateAnswers, event.target.value as never)} />
  </div>;
}

export function EstimateShell({ locale = 'th', questionnaireOverride }: { locale?: Locale; questionnaireOverride?: QuestionnaireDocument }) {
  const english = locale === 'en';
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireDocument>(questionnaireOverride ?? initialQuestionnaire);
  const [assessmentConfig, setAssessmentConfig] = useState<PublicAssessmentConfig | null>(null);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>({});
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const initializedRef = useRef(false);
  const questionHeadingRef = useRef<HTMLHeadingElement>(null);
  const questions = questionnaire.questions;
  const question = questions[Math.min(step, questions.length - 1)];

  useEffect(() => {
    if (questionnaireOverride) return;
    let active = true;
    fetch('/api/assessment/config', { headers: { Accept: 'application/json' }, cache: 'no-store' })
      .then(async (response) => response.ok ? response.json() as Promise<PublicAssessmentConfig> : Promise.reject(new Error('unavailable')))
      .then((configuration) => {
        if (!active) return;
        setAssessmentConfig(configuration);
        setQuestionnaire(configuration.questionnaire);
        writeSessionValue(assessmentContextStorageKey, configuration);
      })
      .catch(() => { /* The static published baseline keeps the estimator available; contact submission stays closed. */ });
    return () => { active = false; };
  }, [questionnaireOverride]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    const savedDraft = migrateSaved(parseJson(readSessionValue(draftStorageKey)));
    const completed = estimateAnswersSchema.safeParse(parseJson(readSessionValue(resultStorageKey)));
    const starter = migrateSaved(parseJson(readSessionValue(starterStorageKey)));
    const restored = starter?.answers ?? savedDraft?.answers ?? (completed.success ? completed.data : {});
    const firstUnanswered = initialQuestionnaire.questions.findIndex((item) => Boolean(firstQuestionError(item, restored, english)));
    removeSessionValue(starterStorageKey);
    track('estimate_started', { source: starter ? 'home' : savedDraft ? 'resume' : completed.success ? 'edit' : 'estimate' });
    queueMicrotask(() => {
      setDraft(restored);
      setStep(starter ? Math.max(0, firstUnanswered) : savedDraft ? Math.min(savedDraft.step, initialQuestionnaire.questions.length - 1) : 0);
      setReady(true);
    });
  }, [english]);

  useEffect(() => {
    if (!ready) return;
    const saved: SavedDraft = {
      version: 4, answers: draft, step,
      questionnaireVersionId: assessmentConfig?.questionnaireVersionId,
      releaseId: assessmentConfig?.releaseId,
      assessmentToken: assessmentConfig?.assessmentToken ?? undefined,
      assessmentTokenExpiresAt: assessmentConfig?.assessmentTokenExpiresAt ?? undefined,
    };
    writeSessionValue(draftStorageKey, saved);
  }, [assessmentConfig, draft, ready, step]);

  useEffect(() => {
    if (!ready) return;
    const frame = requestAnimationFrame(() => questionHeadingRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [ready, step]);

  function setValue<K extends keyof EstimateAnswers>(key: K, value: EstimateAnswers[K] | undefined) {
    setDraft((current) => {
      const next = { ...current, [key]: value };
      if (key === 'province' && value !== 'other') delete next.customLocation;
      if (key === 'propertyType' && value !== 'other-residential') delete next.customPropertyType;
      if (key === 'roofMaterial' && value !== 'other') delete next.customRoofMaterial;
      return next;
    });
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
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? radios.length - 1 : ['ArrowDown', 'ArrowRight'].includes(event.key) ? (currentIndex + 1) % radios.length : (currentIndex - 1 + radios.length) % radios.length;
    event.preventDefault();
    radios[nextIndex].focus();
    radios[nextIndex].click();
  }

  function next() {
    const questionError = firstQuestionError(question, draft, english);
    if (questionError) { setError(questionError); return; }
    track('estimate_step_completed', { stepId: question.id, stepNumber: step + 1 });
    if (step < questions.length - 1) {
      setStep((current) => current + 1);
      window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      return;
    }
    const parsed = estimateAnswersSchema.safeParse(draft);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const firstQuestion = questions.findIndex((item) => item.id === firstIssue.path[0] || item.conditionalFields?.some((field) => field.id === firstIssue.path[0]));
      if (firstQuestion >= 0) setStep(firstQuestion);
      setError(english ? 'One answer still needs attention.' : 'ยังมีคำตอบที่ต้องตรวจสอบอีกหนึ่งข้อ');
      return;
    }
    writeSessionValue(resultStorageKey, parsed.data);
    if (assessmentConfig) writeSessionValue(assessmentContextStorageKey, assessmentConfig);
    removeSessionValue(draftStorageKey);
    window.location.assign(localizedPath('/estimate/results', locale));
  }

  function previous() {
    setStep((current) => Math.max(0, current - 1));
    setError('');
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  function restart() {
    [starterStorageKey, draftStorageKey, resultStorageKey, assessmentContextStorageKey].forEach(removeSessionValue);
    setDraft({}); setStep(0); setError(''); window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function toggleDaytimeLoad(value: DaytimeLoad) {
    const current = draft.daytimeLoads ?? [];
    const next = current.includes(value) ? current.filter((item) => item !== value) : value === 'none' ? ['none' as const] : [...current.filter((item) => item !== 'none'), value];
    setDraft((currentDraft) => {
      const updated: Draft = { ...currentDraft, daytimeLoads: next };
      if (!next.includes('air-conditioning')) delete updated.airConditionerCount;
      if (!next.includes('other-high-use')) delete updated.customDaytimeLoad;
      return updated;
    });
    setError('');
  }

  if (!question) return null;

  return <main className="estimate-page"><div className="site-shell estimate-focus-layout"><section className="estimate-card focus-card" aria-labelledby="estimate-question">
    <div className="segment-progress" role="progressbar" aria-valuemin={1} aria-valuemax={questions.length} aria-valuenow={step + 1} aria-label={english ? `Step ${step + 1} of ${questions.length}` : `ขั้นตอน ${step + 1} จาก ${questions.length}`}>{questions.map((item, index) => <span key={item.id} className={index <= step ? 'active' : ''} />)}</div>
    <p className="sr-only" aria-live="polite">{english ? `Step ${step + 1} of ${questions.length}` : `ขั้นตอน ${step + 1} จาก ${questions.length}`}</p>
    <fieldset className="hydration-fieldset" disabled={!ready} aria-busy={!ready}><div className="question-stage" key={`${locale}-${question.id}`}>
      <div className="question-heading"><h1 id="estimate-question" ref={questionHeadingRef} tabIndex={-1}>{question.title[locale]}</h1><p><CircleHelp size={17} aria-hidden="true" /> {question.help[locale]}</p></div>
      {question.type === 'province' && <label className="estimate-province-select" htmlFor="estimate-province"><span>{english ? 'Province or area' : 'จังหวัดหรือพื้นที่'}</span><select id="estimate-province" value={draft.province ?? ''} onChange={(event) => setValue('province', event.target.value)}><option value="" disabled>{english ? 'Select a province or area' : 'เลือกจังหวัดหรือพื้นที่'}</option>{provinceOptions.map((option) => <option value={option.value} key={option.value}>{option[locale]}</option>)}</select></label>}
      {question.type === 'bill' && <BillSlider value={draft.monthlyBillThb} onChange={(value) => setValue('monthlyBillThb', value)} locale={locale} invalid={Boolean(error)} />}
      {question.type === 'choice' && <div className="choice-grid" role="radiogroup" aria-labelledby="estimate-question" aria-describedby={error ? 'estimate-error' : undefined} onKeyDown={handleRadioKeys}>{question.options?.map((option, index) => { const isSelected = selected(question.id, option.value); const hasSelection = question.options?.some((candidate) => selected(question.id, candidate.value)); const Icon = optionIcons[option.value] ?? CircleHelp; return <button key={option.value} type="button" role="radio" aria-checked={isSelected} tabIndex={isSelected || (!hasSelection && index === 0) ? 0 : -1} className={`choice-card visual-choice ${isSelected ? 'selected' : ''}`} onClick={() => setValue(question.id as keyof EstimateAnswers, option.value as never)}><Icon className="choice-icon" aria-hidden="true" /><span><strong>{option.label[locale]}</strong>{option.description && <small>{option.description[locale]}</small>}</span><span className="choice-indicator" aria-hidden="true">{isSelected && <Check />}</span></button>; })}</div>}
      {question.type === 'multichoice' && <div className="choice-grid multichoice-grid" aria-labelledby="estimate-question">{question.options?.map((option) => { const checked = draft.daytimeLoads?.includes(option.value as DaytimeLoad) ?? false; const Icon = optionIcons[option.value] ?? CircleHelp; return <button key={option.value} type="button" role="checkbox" aria-checked={checked} className={`choice-card visual-choice ${checked ? 'selected' : ''}`} onClick={() => toggleDaytimeLoad(option.value as DaytimeLoad)}><Icon className="choice-icon" aria-hidden="true" /><strong>{option.label[locale]}</strong><span className="choice-indicator checkbox-indicator" aria-hidden="true">{checked && <Check />}</span></button>; })}</div>}
      {question.conditionalFields?.map((field) => <AssessmentConditionalField key={field.id} field={field} question={question} draft={draft} locale={locale} setValue={setValue} />)}
      {error && <p className="form-error" id="estimate-error" role="alert">{error}</p>}
      <div className="estimate-actions"><button className="button button-secondary" type="button" disabled={step === 0 || !ready} onClick={previous}><ArrowLeft aria-hidden="true" /> {english ? 'Back' : 'ย้อนกลับ'}</button><button className="button" type="button" disabled={!ready} onClick={next}>{step === questions.length - 1 ? (english ? 'See my estimate' : 'ดูผลประเมิน') : (english ? 'Next' : 'ถัดไป')} <ArrowRight aria-hidden="true" /></button></div>
    </div></fieldset>
    <div className="estimate-privacy-line"><span>{english ? 'Assessment answers stay in this browser. Contact details are requested only after your results, if you choose.' : 'คำตอบแบบประเมินจะเก็บไว้ในเบราว์เซอร์นี้ และจะขอข้อมูลติดต่อหลังแสดงผลแล้ว เฉพาะเมื่อคุณเลือกเท่านั้น'}</span><button type="button" className="estimate-restart" onClick={restart}>{english ? 'Clear and start over' : 'ล้างข้อมูลและเริ่มใหม่'}</button></div>
  </section></div></main>;
}
