'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  AirVent, ArrowLeft, ArrowRight, Building2, CarFront, Check, CircleHelp,
  CookingPot, Home, House, Layers3, Laptop, SunMedium, Trees, Waves,
  type LucideIcon,
} from 'lucide-react';
import { BillSlider } from './bill-slider';
import { LeadCapture } from '@/components/lead/lead-capture';
import Link from '@/components/site/internal-link';
import { ScreenTransition, type ScreenDirection } from '@/components/ui/screen-transition';
import { initialQuestionnaire } from '@/config/assessment';
import { lockedSharedConsentCopy } from '@/config/contact-content';
import { localizedDistrictOptions } from '@/config/districts';
import { localizedPath, type Locale } from '@/config/i18n';
import { provinceOptions } from '@/config/provinces';
import { track } from '@/lib/analytics/track';
import { estimateAnswersSchema, estimateDraftSchema } from '@/lib/validation/estimate';
import type { DaytimeLoad, EstimateAnswers } from '@/lib/calculator/types';
import type { AssessmentQuestion, ConditionalField, PublicAssessmentConfig, QuestionnaireDocument } from '@/lib/questionnaire/types';

type Draft = Partial<EstimateAnswers>;

function ConsentCopy({ copy, locale }: { copy: string; locale: Locale }) {
  const privacyLabel = locale === 'en' ? 'Privacy Notice' : 'ประกาศความเป็นส่วนตัว';
  const privacyIndex = copy.lastIndexOf(privacyLabel);
  if (privacyIndex < 0) return <>{copy}</>;
  return <>{copy.slice(0, privacyIndex)}<Link href={localizedPath('/privacy', locale)} target="_blank" rel="noopener">{privacyLabel}</Link>{copy.slice(privacyIndex + privacyLabel.length)}</>;
}

type SavedDraft = {
  version: 4 | 5 | 6 | 7;
  answers: Draft;
  step: number;
  questionnaireVersionId?: string;
  releaseId?: string;
  assessmentToken?: string;
  assessmentTokenExpiresAt?: string;
};

const resultStorageKey = 'solarmatch:estimate';
const resultViewStorageKey = 'solarmatch:result-view-state';
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

const projectTypeOptions = [
  { value: 'new-rooftop', en: 'A new rooftop solar system', th: 'ระบบโซลาร์รูฟท็อปใหม่' },
  { value: 'solar-with-battery', en: 'Solar panels with battery storage', th: 'แผงโซลาร์พร้อมระบบกักเก็บพลังงาน' },
  { value: 'expand-existing', en: 'Expanding or upgrading an existing solar system', th: 'ขยายหรือปรับปรุงระบบโซลาร์เดิม' },
  { value: 'unsure', en: 'I’m not sure yet', th: 'ยังไม่แน่ใจ' },
] as const;

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
  if (question.id === 'province') {
    if (!draft.province) return english ? 'Choose a province or area before continuing.' : 'กรุณาเลือกจังหวัดหรือพื้นที่ก่อนดำเนินการต่อ';
    if (draft.province === 'other' && !draft.customProvince?.trim()) return english ? 'Enter the province or area.' : 'กรุณาระบุจังหวัดหรือพื้นที่';
    if (!draft.district?.trim()) return english ? 'Choose or enter the district before continuing.' : 'กรุณาเลือกหรือระบุเขตหรืออำเภอก่อนดำเนินการต่อ';
    if (draft.postcode && !/^\d{5}$/u.test(draft.postcode)) return english ? 'Enter a five-digit postcode or leave it blank.' : 'กรอกรหัสไปรษณีย์ 5 หลัก หรือเว้นว่างไว้';
  }
  if (question.id === 'monthlyBillThb' && (!draft.monthlyBillThb || draft.monthlyBillThb <= 0)) {
    return english ? 'Enter a typical bill amount greater than zero.' : 'กรอกค่าไฟของเดือนปกติที่มากกว่าศูนย์';
  }
  if (question.id === 'daytimeLoads' && (!draft.daytimeLoads?.length)) {
    return english ? 'Select at least one answer.' : 'เลือกอย่างน้อยหนึ่งข้อ';
  }
  if (question.id === 'activelyPlanningSolar' && (!draft.planningTimeframe || !draft.projectType)) {
    return english ? 'Choose a timeframe and project type before continuing.' : 'กรุณาเลือกช่วงเวลาและประเภทโครงการก่อนดำเนินการต่อ';
  }
  if (question.id === 'ownershipStatus' && draft.ownershipStatus !== 'owner' && !draft.ownerPermission) {
    return english ? 'Tell us whether you have the property owner’s permission.' : 'กรุณาระบุว่าคุณได้รับอนุญาตจากเจ้าของอสังหาริมทรัพย์แล้วหรือไม่';
  }
  if (question.id === 'quoteContactRequested' && draft.ownershipStatus !== 'owner' && draft.ownerPermission === 'not-yet') return '';
  if (question.id === 'quoteContactRequested' && draft.quoteContactRequested && draft.quoteConsentAccepted !== true) {
    return english ? 'Tick the consent box before continuing to the contact form.' : 'กรุณาทำเครื่องหมายในช่องความยินยอมก่อนกรอกข้อมูลติดต่อ';
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
  const [direction, setDirection] = useState<ScreenDirection>('forward');
  const [transitioning, setTransitioning] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactResetKey, setContactResetKey] = useState(0);
  const initializedRef = useRef(false);
  const questionHeadingRef = useRef<HTMLHeadingElement>(null);
  const navigationLockRef = useRef(false);
  const transitionTimerRef = useRef<number | null>(null);
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
      version: 7, answers: draft, step,
      questionnaireVersionId: assessmentConfig?.questionnaireVersionId,
      releaseId: assessmentConfig?.releaseId,
      assessmentToken: assessmentConfig?.assessmentToken ?? undefined,
      assessmentTokenExpiresAt: assessmentConfig?.assessmentTokenExpiresAt ?? undefined,
    };
    writeSessionValue(draftStorageKey, saved);
  }, [assessmentConfig, draft, ready, step]);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => questionHeadingRef.current?.focus(), 255);
    return () => window.clearTimeout(timer);
  }, [ready, step]);

  useEffect(() => () => {
    if (transitionTimerRef.current !== null) window.clearTimeout(transitionTimerRef.current);
  }, []);

  function moveStep(nextStep: number, nextDirection: ScreenDirection) {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    setTransitioning(true);
    setDirection(nextDirection);
    setStep(Math.max(0, Math.min(nextStep, questions.length - 1)));
    if (transitionTimerRef.current !== null) window.clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = window.setTimeout(() => {
      navigationLockRef.current = false;
      setTransitioning(false);
    }, 270);
  }

  function setValue<K extends keyof EstimateAnswers>(key: K, value: EstimateAnswers[K] | undefined) {
    setDraft((current) => {
      const next = { ...current, [key]: value };
      if (key === 'province') {
        delete next.district;
        delete next.postcode;
        if (value !== 'other') { delete next.customLocation; delete next.customProvince; }
      }
      if (key === 'propertyType' && value !== 'other-residential') delete next.customPropertyType;
      if (key === 'ownershipStatus' && value === 'owner') delete next.ownerPermission;
      if (key === 'roofMaterial' && value !== 'other') delete next.customRoofMaterial;
      return next;
    });
    setError('');
  }

  function selected(id: string, value: string) {
    const current = draft[id as keyof Draft];
    if (id === 'activelyPlanningSolar') return draft.planningTimeframe === value;
    if (id === 'quoteContactRequested') return current === (value === 'yes');
    return current === value;
  }

  function chooseOption(id: string, value: string) {
    if (id === 'activelyPlanningSolar') {
      setDraft((current) => ({
        ...current,
        planningTimeframe: value as EstimateAnswers['planningTimeframe'],
        activelyPlanningSolar: value !== 'researching',
      }));
      setError('');
      return;
    }
    if (id === 'quoteContactRequested') {
      const requested = value === 'yes';
      setDraft((current) => {
        const next: Draft = { ...current, quoteContactRequested: requested };
        if (!requested) delete next.quoteConsentAccepted;
        return next;
      });
      if (!requested) {
        setContactResetKey((current) => current + 1);
        setShowContactForm(false);
      }
      setError('');
      return;
    }
    setValue(id as keyof EstimateAnswers, value as never);
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
    if (navigationLockRef.current) return;
    const questionError = firstQuestionError(question, draft, english);
    if (questionError) { setError(questionError); return; }
    track('estimate_step_completed', { stepId: question.id, stepNumber: step + 1 });
    if (step < questions.length - 1) {
      moveStep(step + 1, 'forward');
      window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      return;
    }
    const permissionUnavailable = question.id === 'quoteContactRequested' && draft.ownershipStatus !== 'owner' && draft.ownerPermission === 'not-yet';
    const candidate = permissionUnavailable ? { ...draft, quoteContactRequested: false, quoteConsentAccepted: undefined } : draft;
    const parsed = estimateAnswersSchema.safeParse(candidate);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const firstQuestion = questions.findIndex((item) => item.id === firstIssue.path[0] || item.conditionalFields?.some((field) => field.id === firstIssue.path[0]));
      if (firstQuestion >= 0) moveStep(firstQuestion, firstQuestion < step ? 'backward' : 'forward');
      setError(english ? 'One answer still needs attention.' : 'ยังมีคำตอบที่ต้องตรวจสอบอีกหนึ่งข้อ');
      return;
    }
    if (parsed.data.quoteContactRequested) {
      if (!assessmentConfig?.contact.enabled || !assessmentConfig.liveLeadSubmissions) {
        setError(english ? 'Contact requests are temporarily unavailable. Choose No to continue to your estimate.' : 'ขณะนี้ยังไม่สามารถส่งคำขอติดต่อได้ กรุณาเลือก “ไม่ใช่” เพื่อดูผลประเมิน');
        return;
      }
      setShowContactForm(true);
      window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      return;
    }
    completeJourney(parsed.data);
  }

  function completeJourney(answers: EstimateAnswers) {
    writeSessionValue(resultStorageKey, answers);
    if (assessmentConfig) writeSessionValue(assessmentContextStorageKey, assessmentConfig);
    removeSessionValue(draftStorageKey);
    removeSessionValue(resultViewStorageKey);
    window.location.assign(localizedPath('/estimate/results', locale));
  }

  function previous() {
    moveStep(step - 1, 'backward');
    setError('');
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  function restart() {
    [starterStorageKey, draftStorageKey, resultStorageKey, assessmentContextStorageKey].forEach(removeSessionValue);
    setDirection('backward'); setDraft({}); setStep(0); setError(''); setShowContactForm(false); setContactResetKey((current) => current + 1); window.scrollTo({ top: 0, behavior: 'auto' });
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

  const completedAnswers = estimateAnswersSchema.safeParse(draft);
  const contactPermissionUnavailable = question.id === 'quoteContactRequested' && draft.ownershipStatus !== 'owner' && draft.ownerPermission === 'not-yet';
  const districtOptions = localizedDistrictOptions(draft.province ?? '', locale);

  return <main className="estimate-page"><div className="site-shell estimate-focus-layout"><section hidden={showContactForm} className="estimate-card focus-card" aria-labelledby="estimate-question" aria-hidden={showContactForm}>
    <div className="segment-progress" role="progressbar" aria-valuemin={1} aria-valuemax={questions.length} aria-valuenow={step + 1} aria-label={english ? `Step ${step + 1} of ${questions.length}` : `ขั้นตอน ${step + 1} จาก ${questions.length}`}>{questions.map((item, index) => <span key={item.id} className={index <= step ? 'active' : ''} />)}</div>
    <p className="sr-only" aria-live="polite">{english ? `Step ${step + 1} of ${questions.length}` : `ขั้นตอน ${step + 1} จาก ${questions.length}`}</p>
    <fieldset className="hydration-fieldset" disabled={!ready} aria-busy={!ready}><ScreenTransition transitionKey={`${locale}-${question.id}`} direction={direction} className="question-stage">
      <div className="question-heading"><h1 id="estimate-question" ref={questionHeadingRef} tabIndex={-1}>{question.title[locale]}</h1><p><CircleHelp size={17} aria-hidden="true" /> {question.help[locale]}</p></div>
      {question.type === 'province' && <div className="location-fields">
        <label className="estimate-province-select" htmlFor="estimate-province"><span>{english ? 'Province or area' : 'จังหวัดหรือพื้นที่'}</span><select id="estimate-province" value={draft.province ?? ''} onChange={(event) => setValue('province', event.target.value)}><option value="" disabled>{english ? 'Select a province or area' : 'เลือกจังหวัดหรือพื้นที่'}</option>{provinceOptions.map((option) => <option value={option.value} key={option.value}>{option[locale]}</option>)}</select></label>
        {draft.province === 'other' && <label htmlFor="estimate-custom-province"><span>{english ? 'Province or area' : 'จังหวัดหรือพื้นที่'}</span><input id="estimate-custom-province" maxLength={100} value={draft.customProvince ?? ''} placeholder={english ? 'e.g. Chonburi' : 'เช่น ชลบุรี'} onChange={(event) => setValue('customProvince', event.target.value)} /></label>}
        {draft.province && draft.province !== 'other' && <label htmlFor="estimate-district"><span>{english ? 'District (Khet / Amphoe)' : 'เขต / อำเภอ'}</span><select id="estimate-district" value={draft.district ?? ''} onChange={(event) => setValue('district', event.target.value)}><option value="" disabled>{english ? 'Select a district' : 'เลือกเขตหรืออำเภอ'}</option>{districtOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>}
        {draft.province === 'other' && <label htmlFor="estimate-district"><span>{english ? 'District or local area' : 'อำเภอ เขต หรือพื้นที่'}</span><input id="estimate-district" maxLength={100} value={draft.district ?? ''} placeholder={english ? 'e.g. Bang Lamung' : 'เช่น บางละมุง'} onChange={(event) => setValue('district', event.target.value)} /></label>}
        {draft.province && <label htmlFor="estimate-postcode"><span>{english ? 'Postcode (optional)' : 'รหัสไปรษณีย์ (ไม่บังคับ)'}</span><input id="estimate-postcode" inputMode="numeric" autoComplete="postal-code" maxLength={5} value={draft.postcode ?? ''} onChange={(event) => setValue('postcode', event.target.value.replace(/\D/gu, '').slice(0, 5) || undefined)} /></label>}
      </div>}
      {question.type === 'bill' && <BillSlider value={draft.monthlyBillThb} onChange={(value) => setValue('monthlyBillThb', value)} locale={locale} invalid={Boolean(error)} />}
      {question.type === 'choice' && !contactPermissionUnavailable && <div className="choice-grid" role="radiogroup" aria-labelledby="estimate-question" aria-describedby={error ? 'estimate-error' : undefined} onKeyDown={handleRadioKeys}>{question.options?.map((option, index) => { const isSelected = selected(question.id, option.value); const hasSelection = question.options?.some((candidate) => selected(question.id, candidate.value)); const Icon = optionIcons[option.value] ?? CircleHelp; return <button key={option.value} type="button" role="radio" aria-checked={isSelected} tabIndex={isSelected || (!hasSelection && index === 0) ? 0 : -1} className={`choice-card visual-choice ${isSelected ? 'selected' : ''}`} onClick={() => chooseOption(question.id, option.value)}><Icon className="choice-icon" aria-hidden="true" /><span><strong>{option.label[locale]}</strong>{option.description && <small>{option.description[locale]}</small>}</span><span className="choice-indicator" aria-hidden="true">{isSelected && <Check />}</span></button>; })}</div>}
      {question.id === 'activelyPlanningSolar' && <fieldset className="inline-followup"><legend id="project-type-title">{english ? 'What kind of solar project are you considering?' : 'คุณกำลังพิจารณาโครงการโซลาร์แบบใด?'}</legend><div className="choice-grid compact-choice-grid" role="radiogroup" aria-labelledby="project-type-title" onKeyDown={handleRadioKeys}>{projectTypeOptions.map((option, index) => <button key={option.value} type="button" role="radio" aria-checked={draft.projectType === option.value} tabIndex={draft.projectType === option.value || (!draft.projectType && index === 0) ? 0 : -1} className={`choice-card visual-choice ${draft.projectType === option.value ? 'selected' : ''}`} onClick={() => setValue('projectType', option.value)}><SunMedium className="choice-icon" aria-hidden="true" /><strong>{option[locale]}</strong><span className="choice-indicator" aria-hidden="true">{draft.projectType === option.value && <Check />}</span></button>)}</div></fieldset>}
      {question.id === 'ownershipStatus' && draft.ownershipStatus !== undefined && draft.ownershipStatus !== 'owner' && <fieldset className="inline-followup"><legend id="owner-permission-title">{english ? 'Do you have the property owner’s permission to request contact from solar installers?' : 'คุณได้รับอนุญาตจากเจ้าของอสังหาริมทรัพย์ให้ขอรับการติดต่อจากผู้ติดตั้งโซลาร์แล้วหรือไม่?'}</legend><div className="choice-grid compact-choice-grid" role="radiogroup" aria-labelledby="owner-permission-title" onKeyDown={handleRadioKeys}>{([['yes', english ? 'Yes' : 'ได้รับอนุญาตแล้ว'], ['not-yet', english ? 'Not yet' : 'ยังไม่ได้รับอนุญาต']] as const).map(([value, label], index) => <button key={value} type="button" role="radio" aria-checked={draft.ownerPermission === value} tabIndex={draft.ownerPermission === value || (!draft.ownerPermission && index === 0) ? 0 : -1} className={`choice-card visual-choice ${draft.ownerPermission === value ? 'selected' : ''}`} onClick={() => setValue('ownerPermission', value)}><Home className="choice-icon" aria-hidden="true" /><strong>{label}</strong><span className="choice-indicator" aria-hidden="true">{draft.ownerPermission === value && <Check />}</span></button>)}</div></fieldset>}
      {contactPermissionUnavailable && <div className="permission-result-notice"><p>{english ? 'You can still view your estimate. To request installer contact, you will first need the property owner’s permission.' : 'คุณยังดูผลประเมินได้ตามปกติ หากต้องการให้ผู้ติดตั้งติดต่อ คุณต้องได้รับอนุญาตจากเจ้าของอสังหาริมทรัพย์ก่อน'}</p></div>}
      {question.id === 'quoteContactRequested' && draft.quoteContactRequested === true && <div className="quote-consent-block">
        <label className="quote-consent-check"><input type="checkbox" checked={draft.quoteConsentAccepted ?? false} onChange={(event) => setValue('quoteConsentAccepted', event.target.checked ? true : undefined)} /><span><ConsentCopy copy={assessmentConfig?.contact.consent?.[locale] ?? lockedSharedConsentCopy[locale]} locale={locale} /></span></label>
      </div>}
      {question.type === 'multichoice' && <div className="choice-grid multichoice-grid" aria-labelledby="estimate-question">{question.options?.map((option) => { const checked = draft.daytimeLoads?.includes(option.value as DaytimeLoad) ?? false; const Icon = optionIcons[option.value] ?? CircleHelp; return <button key={option.value} type="button" role="checkbox" aria-checked={checked} className={`choice-card visual-choice ${checked ? 'selected' : ''}`} onClick={() => toggleDaytimeLoad(option.value as DaytimeLoad)}><Icon className="choice-icon" aria-hidden="true" /><strong>{option.label[locale]}</strong><span className="choice-indicator checkbox-indicator" aria-hidden="true">{checked && <Check />}</span></button>; })}</div>}
      {question.conditionalFields?.map((field) => <AssessmentConditionalField key={field.id} field={field} question={question} draft={draft} locale={locale} setValue={setValue} />)}
      {error && <p className="form-error" id="estimate-error" role="alert">{error}</p>}
      <div className="estimate-actions"><button className="button button-secondary" type="button" disabled={step === 0 || !ready || transitioning} onClick={previous}><ArrowLeft aria-hidden="true" /> {english ? 'Back' : 'ย้อนกลับ'}</button><button className="button" type="button" disabled={!ready || transitioning} onClick={next}>{contactPermissionUnavailable ? (english ? 'View my estimate' : 'ดูผลประเมิน') : step === questions.length - 1 && draft.quoteContactRequested ? (english ? 'Continue' : 'ถัดไป') : step === questions.length - 1 ? (english ? 'See my estimate' : 'ดูผลประเมิน') : (english ? 'Next' : 'ถัดไป')} <ArrowRight aria-hidden="true" /></button></div>
    </ScreenTransition></fieldset>
    <div className="estimate-privacy-line"><span>{english ? 'Assessment progress stays in this browser. Contact details are sent only when you explicitly submit them.' : 'ความคืบหน้าของแบบประเมินจะเก็บไว้ในเบราว์เซอร์นี้ และจะส่งข้อมูลติดต่อเมื่อคุณกดส่งโดยชัดแจ้งเท่านั้น'}</span><button type="button" className="estimate-restart" onClick={restart}>{english ? 'Clear and start over' : 'ล้างข้อมูลและเริ่มใหม่'}</button></div>
  </section>
  {assessmentConfig && completedAnswers.success && <LeadCapture
    locale={locale}
    answers={completedAnswers.data}
    configuration={assessmentConfig}
    active={showContactForm}
    resetKey={contactResetKey}
    onBack={() => { setShowContactForm(false); setDirection('backward'); setError(''); }}
    onConfigurationChanged={(configuration) => { setAssessmentConfig(configuration); writeSessionValue(assessmentContextStorageKey, configuration); }}
    onContinue={() => completeJourney(completedAnswers.data)}
  />}
  </div></main>;
}
