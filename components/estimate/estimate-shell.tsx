'use client';

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  AirVent, ArrowLeft, ArrowRight, Building2, CarFront, Check, CircleHelp,
  CookingPot, Home, House, Layers3, Laptop, SunMedium, Trees, Waves,
  type LucideIcon,
} from 'lucide-react';
import { BillSlider } from './bill-slider';
import { EnergyInputFields } from './energy-input-fields';
import { LeadCapture } from '@/components/lead/lead-capture';
import { CalculationLoading } from '@/components/results/calculation-loading';
import Link from '@/components/site/internal-link';
import { AssessmentFocusHeader } from '@/components/site/site-header';
import { ScreenTransition, type ScreenDirection } from '@/components/ui/screen-transition';
import { homeownerDesignV3Questionnaire } from '@/config/assessment';
import { restoredQuestionPosition } from '@/lib/questionnaire/draft-position';
import { currentCalculationDate } from '@/config/electricity-tariffs';
import { lockedSharedConsentCopy } from '@/config/contact-content';
import { contactReviewCopy } from '@/config/contact-review';
import { prelaunchNotice } from '@/config/legal-review';
import { localizedDistrictOptions } from '@/config/districts';
import { localizedPath, type Locale } from '@/config/i18n';
import { provinceOptions } from '@/config/provinces';
import {designText} from '@/config/design-v2-copy';
import { track } from '@/lib/analytics/track';
import { calculateEstimate } from '@/lib/calculator';
import { estimateAnswersSchema, estimateDraftSchema, sanitizeEstimateDraftAnswers } from '@/lib/validation/estimate';
import type { DaytimeLoad, EstimateAnswers, EstimateResult } from '@/lib/calculator/types';
import type { PublicLoadingFact } from '@/lib/loading-facts/types';
import type { AssessmentQuestion, ConditionalField, PublicAssessmentConfig, QuestionnaireDocument } from '@/lib/questionnaire/types';

type Draft = Partial<EstimateAnswers>;
const summaryLabels: Partial<Record<AssessmentQuestion['id'], Record<Locale, string>>> = {
  monthlyBillThb: { en: 'Electricity use', th: 'การใช้ไฟ' }, province: { en: 'Location', th: 'พื้นที่' },
  projectType: { en: 'Project', th: 'โครงการ' }, propertyType: { en: 'Home', th: 'ที่พักอาศัย' },
  ownershipStatus: { en: 'Relationship', th: 'สถานะต่อบ้าน' }, activelyPlanningSolar: { en: 'Timeframe', th: 'ช่วงเวลา' },
  daytimePattern: { en: 'Daytime use', th: 'ใช้ไฟกลางวัน' }, daytimeLoads: { en: 'Appliances', th: 'เครื่องใช้ไฟฟ้า' },
  roofArea: { en: 'Roof area', th: 'พื้นที่หลังคา' }, shade: { en: 'Shade', th: 'เงาบัง' }, roofMaterial: { en: 'Roof', th: 'หลังคา' },
};

function freshDraft(questionnaire: QuestionnaireDocument, referenceDate = currentCalculationDate()): Draft {
  return questionnaire.schemaVersion >= 10 ? { estimateModelVersion: 'energy-v3', calculationReferenceDate: referenceDate, consumptionInput: 'bill' } : {};
}

function isMatchingReadOnlyModernConfiguration(configuration: PublicAssessmentConfig): boolean {
  return configuration.questionnaire.id === homeownerDesignV3Questionnaire.id
    && configuration.questionnaire.schemaVersion === homeownerDesignV3Questionnaire.schemaVersion
    && configuration.questionnaireVersionId === homeownerDesignV3Questionnaire.id
    && configuration.calculatorModelVersion === 'energy-v3'
    && configuration.assessmentToken === null
    && configuration.assessmentTokenExpiresAt === null
    && configuration.liveLeadSubmissions === false
    && configuration.publicCollectionEnabled === false
    && configuration.restrictedSiteCollectionEnabled === false
    && configuration.contact.mode === 'disabled'
    && configuration.contact.enabled === false
    && configuration.contact.publicCollectionEnabled === false
    && configuration.contact.restrictedSiteCollectionEnabled === false
    && configuration.contact.operationalDistributionEnabled === false;
}

function ConsentCopy({ copy, locale }: { copy: string; locale: Locale }) {
  const privacyLabel = locale === 'en' ? 'Privacy Notice' : 'ประกาศความเป็นส่วนตัว';
  const privacyIndex = copy.lastIndexOf(privacyLabel);
  if (privacyIndex < 0) return <>{copy}</>;
  return <>{copy.slice(0, privacyIndex)}<Link href={localizedPath('/privacy', locale)} target="_blank" rel="noopener">{privacyLabel}</Link>{copy.slice(privacyIndex + privacyLabel.length)}</>;
}

type SavedDraft = {
  version: 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
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
  'new-rooftop': SunMedium,
  'solar-with-battery': Layers3,
  'expand-existing': Building2,
  unsure: CircleHelp,
  other: CircleHelp,
};

type ContactOutcome = 'declined' | 'submitted' | 'skipped';
type CompletionJourney = { answers: EstimateAnswers; outcome: ContactOutcome; waitsForSubmission: boolean };
type ResultViewState = {
  signature: string;
  factSetVersionId: string;
  fact: PublicLoadingFact | null;
  contactOutcome: ContactOutcome;
  viewed: boolean;
  loadingDurationMs?: number;
  loadingStartedAt?: number;
  resultSnapshot?: EstimateResult;
};

function answerSignature(answers: EstimateAnswers) {
  const source = JSON.stringify(answers);
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

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
  if (parsed.success) return { ...parsed.data, answers: sanitizeEstimateDraftAnswers(parsed.data.answers) };
  if (!raw || typeof raw !== 'object') return null;
  const source = ((raw as Record<string, unknown>).answers ?? raw);
  const answers = sanitizeEstimateDraftAnswers(source);
  if (answers.roofMaterial === 'unknown') answers.roofMaterial = 'unsure';
  return Object.keys(answers).length ? { version: 4, answers, step: 0 } : null;
}

function conditionalActive(field: ConditionalField, question: AssessmentQuestion, draft: Draft) {
  const value = draft[question.id as keyof Draft];
  return Array.isArray(value) ? value.includes(field.whenOption as never) : value === field.whenOption;
}

function firstQuestionError(question: AssessmentQuestion, draft: Draft, english: boolean) {
  const value = question.id === 'monthlyBillThb' && draft.consumptionInput === 'kwh' ? draft.monthlyConsumptionKwh : draft[question.id as keyof Draft];
  if (question.id === 'province') {
    if (!draft.province) return english ? 'Choose a province or area before continuing.' : 'กรุณาเลือกจังหวัดหรือพื้นที่ก่อนดำเนินการต่อ';
    if (draft.province === 'other' && !draft.customProvince?.trim()) return english ? 'Enter the province or area.' : 'กรุณาระบุจังหวัดหรือพื้นที่';
    if (!draft.district?.trim()) return english ? 'Choose or enter the district before continuing.' : 'กรุณาเลือกหรือระบุเขตหรืออำเภอก่อนดำเนินการต่อ';
    if (draft.postcode && !/^\d{5}$/u.test(draft.postcode)) return english ? 'Enter a five-digit postcode or leave it blank.' : 'กรอกรหัสไปรษณีย์ 5 หลัก หรือเว้นว่างไว้';
  }
  if (question.id === 'monthlyBillThb') {
    if (draft.consumptionInput === 'kwh') {
      if (draft.monthlyConsumptionKwh === undefined || !Number.isFinite(draft.monthlyConsumptionKwh) || draft.monthlyConsumptionKwh <= 0) return english ? 'Enter actual electricity use greater than zero, in kWh.' : 'กรุณาระบุหน่วยไฟที่ใช้จริงเป็น kWh มากกว่าศูนย์';
    } else if (!draft.monthlyBillThb || !Number.isFinite(draft.monthlyBillThb) || draft.monthlyBillThb <= 0) {
      return english ? 'Enter a typical bill amount greater than zero.' : 'กรอกค่าไฟของเดือนปกติที่มากกว่าศูนย์';
    }
  }
  if (question.id === 'daytimeLoads' && (!draft.daytimeLoads?.length)) {
    return english ? 'Select at least one answer.' : 'เลือกอย่างน้อยหนึ่งข้อ';
  }
  if (question.id === 'daytimeLoads') {
    if ((draft.daylightAcUnits === undefined) !== (draft.daylightAcHours === undefined)) return english ? 'For an AC schedule, enter both daytime units and hours, or clear both.' : 'หากระบุเวลาใช้แอร์ กรุณากรอกทั้งจำนวนเครื่องและชั่วโมงกลางวัน หรือเว้นว่างทั้งคู่';
    if (draft.daylightAcUnits !== undefined && draft.airConditionerCount !== undefined && draft.daylightAcUnits > draft.airConditionerCount) return english ? 'Daytime AC units cannot exceed the installed total.' : 'จำนวนแอร์ที่เปิดกลางวันต้องไม่เกินจำนวนที่ติดตั้งทั้งหมด';
    if ((draft.pumpPowerKw === undefined) !== (draft.pumpHoursPerDay === undefined)) return english ? 'For a pump schedule, enter both power and hours, or clear both.' : 'หากระบุเวลาใช้ปั๊ม กรุณากรอกทั้งกำลังไฟและชั่วโมงใช้งาน หรือเว้นว่างทั้งคู่';
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
        <div className="stepper"><button type="button" aria-label={english?'Fewer installed air conditioners':'ลดจำนวนเครื่องปรับอากาศที่ติดตั้ง'} disabled={count===undefined||count<=1} onClick={()=>setValue('airConditionerCount',Math.max(1,(count??1)-1))}>−</button><input id="air-conditioner-count" type="number" inputMode="numeric" min="1" max="100" value={count??''} placeholder="—" onChange={event=>{const raw=event.currentTarget.value;if(raw===''){setValue('airConditionerCount',undefined);return;}const number=Number(raw);if(Number.isFinite(number))setValue('airConditionerCount',Math.min(100,Math.max(1,Math.round(number))));}}/><button type="button" aria-label={english?'More installed air conditioners':'เพิ่มจำนวนเครื่องปรับอากาศที่ติดตั้ง'} disabled={count===100} onClick={()=>setValue('airConditionerCount',Math.min(100,(count??0)+1))}>+</button></div>
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
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireDocument>(questionnaireOverride ?? homeownerDesignV3Questionnaire);
  const [assessmentConfig, setAssessmentConfig] = useState<PublicAssessmentConfig | null>(null);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>({});
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const autoAdvanceRef=useRef<number|null>(null);
  const text=designText(locale);
  const [direction, setDirection] = useState<ScreenDirection>('forward');
  const [transitioning, setTransitioning] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  // Review choices and checkbox state are transient, never real referral consent.
  const [contactReview, setContactReview] = useState(false);
  const [reviewConsentAccepted, setReviewConsentAccepted] = useState(false);
  const [contactResetKey, setContactResetKey] = useState(0);
  const [completionJourney, setCompletionJourney] = useState<CompletionJourney | null>(null);
  const [calculationComplete, setCalculationComplete] = useState(false);
  const [submissionComplete, setSubmissionComplete] = useState(false);
  const [minimumLoadingElapsed, setMinimumLoadingElapsed] = useState(false);
  const initializedRef = useRef(false);
  const restoredQuestionIdRef = useRef<AssessmentQuestion['id'] | null>(null);
  const starterAnswersRef = useRef<Draft | null>(null);
  const restoredModernRef = useRef(false);
  // Once a person starts this questionnaire, its release and consent scope stay fixed.
  const interactionRef = useRef(false);
  const questionHeadingRef = useRef<HTMLHeadingElement>(null);
  const navigationLockRef = useRef(false);
  const completionRoutedRef = useRef(false);
  const transitionTimerRef = useRef<number | null>(null);
  const questions = questionnaire.questions;
  const question = questions[Math.min(step, questions.length - 1)];
  const energyQuestionnaire = questionnaire.schemaVersion >= 10;
  const calculationDraft: Draft = energyQuestionnaire ? { ...draft, estimateModelVersion: 'energy-v3', calculationReferenceDate: draft.calculationReferenceDate ?? assessmentConfig?.calculationReferenceDate ?? currentCalculationDate() } : { ...draft, estimateModelVersion: 'legacy-v5', consumptionInput: 'bill' };

  useEffect(() => {
    if (questionnaireOverride) return;
    let active = true;
    fetch('/api/assessment/config', { headers: { Accept: 'application/json' }, cache: 'no-store' })
      .then(async (response) => response.ok ? response.json() as Promise<PublicAssessmentConfig> : Promise.reject(new Error('unavailable')))
      .then((configuration) => {
        if (!active) return;
        if (interactionRef.current || restoredModernRef.current) {
          if (!isMatchingReadOnlyModernConfiguration(configuration)) return;
          // Restore facts and test-copy availability without changing the active
          // questionnaire, answers, reference date or collection permissions.
          const readOnlyContext = { ...configuration, calculationReferenceDate: undefined };
          setAssessmentConfig(readOnlyContext);
          writeSessionValue(assessmentContextStorageKey, readOnlyContext);
          return;
        }
        setAssessmentConfig(configuration);
        setQuestionnaire(configuration.questionnaire);
        setDraft(current => configuration.questionnaire.schemaVersion < 10
          ? { ...current, estimateModelVersion: 'legacy-v5', consumptionInput: 'bill', calculationReferenceDate: undefined }
          : {
              ...current,
              estimateModelVersion: 'energy-v3',
              calculationReferenceDate: current.calculationReferenceDate
                ?? configuration.calculationReferenceDate
                ?? currentCalculationDate(),
            });
        setStep(() => {
          const starterAnswers = starterAnswersRef.current;
          if (starterAnswers) {
            const firstIncomplete = configuration.questionnaire.questions.findIndex(item =>
              Boolean(firstQuestionError(item, starterAnswers, true)));
            return firstIncomplete >= 0 ? firstIncomplete : 0;
          }
          const restoredId = restoredQuestionIdRef.current;
          const mapped = restoredId
            ? configuration.questionnaire.questions.findIndex(item => item.id === restoredId)
            : -1;
          return mapped >= 0 ? mapped : 0;
        });
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
    starterAnswersRef.current = starter?.answers ?? null;
    const restored = starter?.answers ?? savedDraft?.answers ?? (completed.success ? sanitizeEstimateDraftAnswers(completed.data) : {});
    const startingQuestions = (questionnaireOverride ?? homeownerDesignV3Questionnaire).questions;
    const firstUnanswered = startingQuestions.findIndex((item) => Boolean(firstQuestionError(item, restored, english)));
    const mappedStep = savedDraft ? restoredQuestionPosition(savedDraft.version, savedDraft.step, questionnaireOverride ?? homeownerDesignV3Questionnaire) : 0;
    let restoredStep = 0;
    if (starter) restoredStep = Math.max(0, firstUnanswered);
    else if (savedDraft) restoredStep = Math.max(0, Math.min(mappedStep, startingQuestions.length - 1));
    restoredQuestionIdRef.current = starter || savedDraft
      ? startingQuestions[restoredStep]?.id ?? null
      : null;
    // A persisted modern journey must not acquire another release's questionnaire/token.
    restoredModernRef.current = (starter?.version ?? 0) >= 10
      || (savedDraft?.version ?? 0) >= 10
      || restored.estimateModelVersion === 'energy-v3';
    removeSessionValue(starterStorageKey);
    track('estimate_started', { source: starter ? 'home' : savedDraft ? 'resume' : completed.success ? 'edit' : 'estimate' });
    queueMicrotask(() => {
      setDraft(Object.keys(restored).length ? restored : freshDraft(questionnaireOverride ?? homeownerDesignV3Questionnaire));
      setStep(restoredStep);
      setReady(true);
    });
  }, [english, questionnaireOverride]);

  useEffect(() => {
    if (!ready) return;
    const saved: SavedDraft = {
      version: questionnaire.schemaVersion >= 11 ? 11 : energyQuestionnaire ? 10 : 9, answers: sanitizeEstimateDraftAnswers(draft), step,
      questionnaireVersionId: assessmentConfig?.questionnaireVersionId,
      releaseId: assessmentConfig?.releaseId,
      assessmentToken: assessmentConfig?.assessmentToken ?? undefined,
      assessmentTokenExpiresAt: assessmentConfig?.assessmentTokenExpiresAt ?? undefined,
    };
    writeSessionValue(draftStorageKey, saved);
  }, [assessmentConfig, draft, energyQuestionnaire, questionnaire.schemaVersion, ready, step]);

  const persistCompletionView = useCallback((journey: CompletionJourney, patch: Partial<ResultViewState>) => {
    const signature = answerSignature(journey.answers);
    const raw = parseJson(readSessionValue(resultViewStorageKey));
    const current = raw && typeof raw === 'object' && (raw as ResultViewState).signature === signature ? raw as ResultViewState : null;
    const next: ResultViewState = {
      signature,
      factSetVersionId: assessmentConfig?.loadingFactSetVersionId ?? current?.factSetVersionId ?? 'unavailable',
      fact: current?.fact ?? null,
      contactOutcome: journey.outcome,
      viewed: current?.viewed ?? false,
      ...patch,
    };
    writeSessionValue(resultViewStorageKey, next);
  }, [assessmentConfig?.loadingFactSetVersionId]);

  useEffect(() => {
    if (!completionJourney) return;
    const frame = window.requestAnimationFrame(() => {
      const result = calculateEstimate(completionJourney.answers);
      writeSessionValue(resultStorageKey, completionJourney.answers);
      if (assessmentConfig) writeSessionValue(assessmentContextStorageKey, assessmentConfig);
      removeSessionValue(draftStorageKey);
      persistCompletionView(completionJourney, { resultSnapshot: result, viewed: false });
      setCalculationComplete(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [assessmentConfig, completionJourney, persistCompletionView]);

  useEffect(() => {
    if (!completionJourney || !calculationComplete || !submissionComplete || !minimumLoadingElapsed || completionRoutedRef.current) return;
    completionRoutedRef.current = true;
    persistCompletionView(completionJourney, { viewed: true });
    window.location.assign(localizedPath('/estimate/results', locale));
  }, [calculationComplete, completionJourney, locale, minimumLoadingElapsed, persistCompletionView, submissionComplete]);

  useEffect(() => {
    if (!ready || showContactForm) return;
    const timer = window.setTimeout(() => {
      const activeElement = document.activeElement;
      if (!activeElement || activeElement === document.body || activeElement === questionHeadingRef.current || activeElement.closest('.estimate-actions')) {
        questionHeadingRef.current?.focus({preventScroll:true});
      }
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches?130:500);
    return () => window.clearTimeout(timer);
  }, [ready, step, showContactForm]);

  useEffect(() => () => {
    if (transitionTimerRef.current !== null) window.clearTimeout(transitionTimerRef.current);
  }, []);

  useEffect(()=>()=>{if(autoAdvanceRef.current!==null)window.clearTimeout(autoAdvanceRef.current);},[step,locale,showContactForm]);
  function cancelAutoAdvance(){if(autoAdvanceRef.current!==null){window.clearTimeout(autoAdvanceRef.current);autoAdvanceRef.current=null;}}
  function moveStep(nextStep: number, nextDirection: ScreenDirection) {
    interactionRef.current = true;
    cancelAutoAdvance();
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    setTransitioning(true);
    setDirection(nextDirection);
    setStep(Math.max(0, Math.min(nextStep, questions.length - 1)));
    if (transitionTimerRef.current !== null) window.clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = window.setTimeout(() => {
      navigationLockRef.current = false;
      setTransitioning(false);
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches?130:500);
  }

  function setValue<K extends keyof EstimateAnswers>(key: K, value: EstimateAnswers[K] | undefined) {
    interactionRef.current = true;
    cancelAutoAdvance();
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
      if (key === 'airConditionerCount' && typeof value === 'number' && next.daylightAcUnits !== undefined) next.daylightAcUnits = Math.min(next.daylightAcUnits, value);
      return next;
    });
    setError('');
  }

  function selected(id: string, value: string) {
    const current = draft[id as keyof Draft];
    if (id === 'activelyPlanningSolar') return draft.planningTimeframe === value;
    if (id === 'quoteContactRequested') return value === 'test' ? contactReview : !contactReview && current === (value === 'yes');
    return current === value;
  }

  function chooseOption(id: string, value: string) {
    interactionRef.current = true;
    cancelAutoAdvance();
    if(navigationLockRef.current)return;
    const candidate:Draft=id==='activelyPlanningSolar'?{...draft,planningTimeframe:value as EstimateAnswers['planningTimeframe'],activelyPlanningSolar:value!=='researching'}:{...draft,[id]:value};
    const needsFollowup=id==='quoteContactRequested'||(energyQuestionnaire&&['roofArea','daytimePattern'].includes(id))||(id==='ownershipStatus'&&value!=='owner')||question.conditionalFields?.some(field=>field.whenOption===value);
    if(!needsFollowup&&!firstQuestionError(question,candidate,english)&&step<questions.length-1){autoAdvanceRef.current=window.setTimeout(()=>{autoAdvanceRef.current=null;if(navigationLockRef.current)return;track('estimate_step_completed',{stepId:id,stepNumber:step+1});moveStep(step+1,'forward');window.scrollTo({top:0,behavior:'auto'});},260);}
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
      const review = value === 'test';
      const requested = value === 'yes';
      setContactReview(review);
      setReviewConsentAccepted(false);
      if (review || contactReview || !requested) setContactResetKey((current) => current + 1);
      setDraft((current) => {
        const next: Draft = { ...current, quoteContactRequested: requested };
        if (!requested || contactReview) delete next.quoteConsentAccepted;
        return next;
      });
      if (!requested) {
        setShowContactForm(false);
      }
      setError('');
      return;
    }
    setDraft(current=>{const next={...current,[id]:value};if(id==='propertyType'&&value!=='other-residential')delete next.customPropertyType;if(id==='ownershipStatus'&&value==='owner')delete next.ownerPermission;if(id==='roofMaterial'&&value!=='other')delete next.customRoofMaterial;return next;});
    setError('');
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
    interactionRef.current = true;
    cancelAutoAdvance();
    if (navigationLockRef.current) return;
    const reviewingContact = question.id === 'quoteContactRequested' && contactReview;
    if (reviewingContact && !reviewConsentAccepted) {
      setError(english ? 'Tick the consent box before continuing to the contact form.' : 'กรุณาทำเครื่องหมายในช่องความยินยอมก่อนกรอกข้อมูลติดต่อ');
      return;
    }
    const collectionUnavailable = question.id === 'quoteContactRequested' && (draft.consumptionInput === 'kwh' || !assessmentConfig?.contact.enabled || !assessmentConfig.liveLeadSubmissions);
    const validationDraft = collectionUnavailable || reviewingContact ? { ...calculationDraft, quoteContactRequested: false, quoteConsentAccepted: undefined } : calculationDraft;
    const questionError = firstQuestionError(question, validationDraft, english);
    if (questionError) { setError(questionError); return; }
    track('estimate_step_completed', { stepId: question.id, stepNumber: step + 1 });
    if (step < questions.length - 1) {
      moveStep(step + 1, 'forward');
      window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      return;
    }
    const permissionUnavailable = question.id === 'quoteContactRequested' && draft.ownershipStatus !== 'owner' && draft.ownerPermission === 'not-yet';
    const candidate = permissionUnavailable ? { ...validationDraft, quoteContactRequested: false, quoteConsentAccepted: undefined } : validationDraft;
    const parsed = estimateAnswersSchema.safeParse(candidate);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const firstQuestion = questions.findIndex((item) => item.id === firstIssue.path[0] || item.conditionalFields?.some((field) => field.id === firstIssue.path[0]));
      if (firstQuestion >= 0) moveStep(firstQuestion, firstQuestion < step ? 'backward' : 'forward');
      setError(english ? 'One answer still needs attention.' : 'ยังมีคำตอบที่ต้องตรวจสอบอีกหนึ่งข้อ');
      return;
    }
    if (reviewingContact && assessmentConfig) {
      setShowContactForm(true);
      window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      return;
    }
    if (parsed.data.quoteContactRequested) {
      if (!assessmentConfig?.contact.enabled || !assessmentConfig.liveLeadSubmissions) {
        setError(english ? 'We cannot accept this contact request right now. Choose No to continue to your estimate.' : 'ขณะนี้ไม่สามารถรับคำขอติดต่อนี้ได้ กรุณาเลือก “ไม่ใช่” เพื่อดูผลประเมินต่อ');
        return;
      }
      setShowContactForm(true);
      window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      return;
    }
    beginCompletion(parsed.data, 'declined', false);
  }

  function beginCompletion(answers: EstimateAnswers, outcome: ContactOutcome, waitsForSubmission: boolean) {
    removeSessionValue(resultViewStorageKey);
    completionRoutedRef.current = false;
    setCalculationComplete(false);
    setSubmissionComplete(!waitsForSubmission);
    setMinimumLoadingElapsed(false);
    setCompletionJourney({ answers, outcome, waitsForSubmission });
  }

  function cancelCompletion() {
    setCompletionJourney(null);
    setCalculationComplete(false);
    setSubmissionComplete(false);
    setMinimumLoadingElapsed(false);
    completionRoutedRef.current = false;
    removeSessionValue(resultViewStorageKey);
  }

  function previous() {
    if (contactReview) {
      setContactReview(false);
      setReviewConsentAccepted(false);
      setContactResetKey((current) => current + 1);
    }
    moveStep(step - 1, 'backward');
    setError('');
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  function toggleDaytimeLoad(value: DaytimeLoad) {
    interactionRef.current = true;
    const current = draft.daytimeLoads ?? [];
    const next = current.includes(value) ? current.filter((item) => item !== value) : value === 'none' ? ['none' as const] : [...current.filter((item) => item !== 'none'), value];
    setDraft((currentDraft) => {
      const updated: Draft = { ...currentDraft, daytimeLoads: next };
      if (!next.includes('air-conditioning')) { delete updated.airConditionerCount; delete updated.daylightAcUnits; delete updated.daylightAcHours; delete updated.acPowerKw; }
      if (!next.includes('ev')) { delete updated.existingEvMonthlyKwh; delete updated.evHomeChargingFraction; delete updated.evDaytimeFraction; }
      if (!next.includes('pump')) { delete updated.pumpPowerKw; delete updated.pumpHoursPerDay; }
      if (!next.includes('other-high-use')) delete updated.customDaytimeLoad;
      return updated;
    });
    setError('');
  }

  if (!question) return null;

  const completedAnswers = estimateAnswersSchema.safeParse(calculationDraft);
  const contactPermissionUnavailable = question.id === 'quoteContactRequested' && draft.ownershipStatus !== 'owner' && draft.ownerPermission === 'not-yet';
  const contactCollectionUnavailable = question.id === 'quoteContactRequested' && (draft.consumptionInput === 'kwh' || !assessmentConfig?.contact.enabled || !assessmentConfig.liveLeadSubmissions);
  const visibleOptions = question.id === 'quoteContactRequested' ? [
    ...(question.options ?? []).filter((option) => option.value !== 'yes' || (!contactPermissionUnavailable && !contactCollectionUnavailable)),
    ...(assessmentConfig?.contactReviewAvailable === true && assessmentConfig.accessRestrictedSession ? [{ value: 'test', label: contactReviewCopy.label, description: contactReviewCopy.help }] : []),
  ] : question.options;
  const districtOptions = localizedDistrictOptions(draft.province ?? '', locale);
  const summaryValue=(item:AssessmentQuestion)=>{const value=item.id==='activelyPlanningSolar'?draft.planningTimeframe:draft[item.id as keyof Draft];if(item.id==='province')return [districtOptions.find(d=>d.value===draft.district)?.label,provinceOptions.find(p=>p.value===draft.province)?.[locale]].filter(Boolean).join(', ');if(item.id==='monthlyBillThb'){if(energyQuestionnaire&&draft.consumptionInput==='kwh')return draft.monthlyConsumptionKwh===undefined?'':draft.monthlyConsumptionKwh.toLocaleString('en-US')+' kWh';return typeof value==='number'?'฿'+value.toLocaleString('en-US'):'';}if(Array.isArray(value))return value.map(v=>item.options?.find(o=>o.value===v)?.label[locale]??v).join(', ');return item.options?.find(o=>o.value===value)?.label[locale]??'';};

  return <>{completionJourney && <ScreenTransition transitionKey="journey-preparing" direction="forward" pace="result" className="journey-transition-surface"><CalculationLoading
    facts={assessmentConfig?.loadingFacts ?? []}
    locale={locale}
    onStarted={(fact, durationMs, startedAt) => persistCompletionView(completionJourney, { fact, loadingDurationMs: durationMs, loadingStartedAt: startedAt, viewed: false })}
    onComplete={() => setMinimumLoadingElapsed(true)}
    calculated={calculationComplete}
    prepared={calculationComplete&&submissionComplete}
    savingRequest={completionJourney.waitsForSubmission&&!submissionComplete}
  /></ScreenTransition>}<main hidden={Boolean(completionJourney)} className="estimate-page" aria-hidden={Boolean(completionJourney)}><div className="site-shell assessment-flow-shell">
    <AssessmentFocusHeader locale={locale} count={showContactForm?undefined:step===questions.length-1?text.almost:text.qOf.replace('{n}',String(step+1)).replace('{t}',String(questions.length-1))}/>
    <div className="assessment-flow-progress" hidden={showContactForm}>
    <div className="segment-progress" role="progressbar" aria-valuemin={1} aria-valuemax={questions.length} aria-valuenow={step + 1} aria-label={english ? `Step ${step + 1} of ${questions.length}` : `ขั้นตอน ${step + 1} จาก ${questions.length}`}>{questions.map((item, index) => <span key={item.id} className={index <= step ? 'active' : ''} />)}</div>
    <p className="sr-only" aria-live="polite">{english ? `Step ${step + 1} of ${questions.length}` : `ขั้นตอน ${step + 1} จาก ${questions.length}`}</p>
    </div>
    <div className="estimate-focus-layout">
    <section hidden={showContactForm} className="estimate-card focus-card" aria-labelledby="estimate-question" aria-hidden={showContactForm}>
    <fieldset className="hydration-fieldset" disabled={!ready||transitioning} aria-busy={!ready||transitioning}><ScreenTransition transitionKey={`${locale}-${question.id}`} direction={direction} className="question-stage" onEntered={()=>{navigationLockRef.current=false;setTransitioning(false);if(transitionTimerRef.current!==null)window.clearTimeout(transitionTimerRef.current);const active=document.activeElement;if(!active||active===document.body||active===questionHeadingRef.current||active.closest('.estimate-actions'))questionHeadingRef.current?.focus({preventScroll:true});}}>
      <div className="question-heading"><h1 id="estimate-question" ref={questionHeadingRef} tabIndex={-1}>{question.title[locale]}</h1>{question.help[locale] && <p><CircleHelp size={17} aria-hidden="true" /> {question.help[locale]}</p>}</div>
      {question.type === 'province' && <div className="location-fields">
        <div className="location-pair"><label className="estimate-province-select" htmlFor="estimate-province"><span>{english ? 'Province' : 'จังหวัด'}</span><select id="estimate-province" value={draft.province ?? ''} onChange={(event) => setValue('province', event.target.value)}><option value="" disabled>{english ? 'Choose a province' : 'เลือกจังหวัด'}</option>{provinceOptions.map((option) => <option value={option.value} key={option.value}>{option[locale]}</option>)}</select></label>
        <label htmlFor="estimate-district"><span>{english ? 'District' : 'เขต / อำเภอ'}</span>{draft.province === 'other' ? <input id="estimate-district" maxLength={100} value={draft.district ?? ''} placeholder={english ? 'e.g. Bang Lamung' : 'เช่น บางละมุง'} onChange={(event) => setValue('district', event.target.value)} /> : <select id="estimate-district" disabled={!draft.province} value={draft.district ?? ''} onChange={event => setValue('district', event.target.value)}><option value="" disabled>{english ? 'Choose a district' : 'เลือกเขต / อำเภอ'}</option>{districtOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>}</label></div>
        {draft.province === 'other' && <label htmlFor="estimate-custom-province"><span>{english ? 'Province or area' : 'จังหวัดหรือพื้นที่'}</span><input id="estimate-custom-province" maxLength={100} value={draft.customProvince ?? ''} placeholder={english ? 'e.g. Chonburi' : 'เช่น ชลบุรี'} onChange={(event) => setValue('customProvince', event.target.value)} /></label>}
      </div>}
      {question.type === 'bill' && (!energyQuestionnaire || draft.consumptionInput !== 'kwh') && <BillSlider value={draft.monthlyBillThb} onChange={(value) => setValue('monthlyBillThb', value)} locale={locale} invalid={Boolean(error)} />}
      {question.type === 'bill' && energyQuestionnaire && <details className="energy-bill-details" open={draft.consumptionInput === 'kwh' || undefined}><summary>{english ? 'Use actual kWh or add bill details' : 'กรอกหน่วยไฟจริง หรือเพิ่มรายละเอียดบิล'}</summary><EnergyInputFields section="consumption" answers={draft} locale={locale} onChange={setValue} /></details>}
      {energyQuestionnaire&&question.id==='projectType'&&<p className="note project-model-scope">{english?'This calculator estimates new rooftop solar panels. Battery and existing-system projects need a separate assessment; you can choose a clearly labelled solar-only illustration at the end.':'เครื่องคำนวณนี้ประเมินระบบแผงโซลาร์บนหลังคาใหม่ โครงการที่มีแบตเตอรี่หรือระบบเดิมต้องประเมินแยก โดยคุณเลือกดูตัวอย่างเฉพาะโซลาร์ที่ระบุขอบเขตชัดเจนได้ในขั้นตอนสุดท้าย'}</p>}
      {question.type === 'choice' && <div className="choice-grid" role="radiogroup" aria-labelledby="estimate-question" aria-describedby={error ? 'estimate-error' : undefined} onKeyDown={handleRadioKeys}>{visibleOptions?.map((option, index) => { const isSelected = selected(question.id, option.value); const hasSelection = visibleOptions?.some((candidate) => selected(question.id, candidate.value)); const Icon = optionIcons[option.value] ?? CircleHelp; return <button key={option.value} type="button" role="radio" aria-checked={isSelected} tabIndex={isSelected || (!hasSelection && index === 0) ? 0 : -1} className={`choice-card visual-choice ${isSelected ? 'selected' : ''}`} onClick={() => chooseOption(question.id, option.value)}><Icon className="choice-icon" aria-hidden="true" /><span><strong>{option.label[locale]}</strong>{option.description && <small>{option.description[locale]}</small>}</span><span className="choice-indicator" aria-hidden="true">{isSelected && <Check />}</span></button>; })}</div>}
      {question.id === 'ownershipStatus' && draft.ownershipStatus !== undefined && draft.ownershipStatus !== 'owner' && <fieldset className="inline-followup"><legend id="owner-permission-title">{english ? 'Do you have the property owner’s permission to request contact from solar installers?' : 'คุณได้รับอนุญาตจากเจ้าของอสังหาริมทรัพย์ให้ขอรับการติดต่อจากผู้ติดตั้งโซลาร์แล้วหรือไม่?'}</legend><div className="choice-grid compact-choice-grid" role="radiogroup" aria-labelledby="owner-permission-title" onKeyDown={handleRadioKeys}>{([['yes', english ? 'Yes' : 'ได้รับอนุญาตแล้ว'], ['not-yet', english ? 'Not yet' : 'ยังไม่ได้รับอนุญาต']] as const).map(([value, label], index) => <button key={value} type="button" role="radio" aria-checked={draft.ownerPermission === value} tabIndex={draft.ownerPermission === value || (!draft.ownerPermission && index === 0) ? 0 : -1} className={`choice-card visual-choice ${draft.ownerPermission === value ? 'selected' : ''}`} onClick={() => setValue('ownerPermission', value)}><Home className="choice-icon" aria-hidden="true" /><strong>{label}</strong><span className="choice-indicator" aria-hidden="true">{draft.ownerPermission === value && <Check />}</span></button>)}</div></fieldset>}
      {contactPermissionUnavailable && <div className="permission-result-notice"><p>{english ? 'You can still view your estimate. To request installer contact, you will first need the property owner’s permission.' : 'คุณยังดูผลประเมินได้ตามปกติ หากต้องการให้ผู้ติดตั้งติดต่อ คุณต้องได้รับอนุญาตจากเจ้าของอสังหาริมทรัพย์ก่อน'}</p></div>}
      {question.id === 'quoteContactRequested' && (contactReview || (!contactCollectionUnavailable && !contactPermissionUnavailable && draft.quoteContactRequested === true)) && <div className="quote-consent-block">
        {contactReview && <p className="contact-review-notice" role="status">{contactReviewCopy.notice[locale]}</p>}
        <label className="quote-consent-check"><input type="checkbox" checked={contactReview ? reviewConsentAccepted : draft.quoteConsentAccepted ?? false} onChange={(event) => { if (contactReview) { setReviewConsentAccepted(event.target.checked); setError(''); } else setValue('quoteConsentAccepted', event.target.checked ? true : undefined); }} /><span><ConsentCopy copy={contactReview ? lockedSharedConsentCopy[locale] : assessmentConfig?.contact.consent?.[locale] ?? lockedSharedConsentCopy[locale]} locale={locale} /></span></label>
      </div>}
      {question.type === 'multichoice' && <div className="choice-grid multichoice-grid" aria-labelledby="estimate-question">{question.options?.map((option) => { const checked = draft.daytimeLoads?.includes(option.value as DaytimeLoad) ?? false; const Icon = optionIcons[option.value] ?? CircleHelp; return <button key={option.value} type="button" role="checkbox" aria-checked={checked} className={`choice-card visual-choice ${checked ? 'selected' : ''}`} onClick={() => toggleDaytimeLoad(option.value as DaytimeLoad)}><Icon className="choice-icon" aria-hidden="true" /><strong>{option.label[locale]}</strong><span className="choice-indicator checkbox-indicator" aria-hidden="true">{checked && <Check />}</span></button>; })}</div>}
      {question.conditionalFields?.map((field) => <AssessmentConditionalField key={field.id} field={field} question={question} draft={draft} locale={locale} setValue={setValue} />)}
      {energyQuestionnaire && question.id === 'daytimePattern' && <EnergyInputFields section="timing" answers={draft} locale={locale} onChange={setValue} />}
      {energyQuestionnaire && question.id === 'daytimeLoads' && <EnergyInputFields section="loads" answers={draft} locale={locale} onChange={setValue} />}
      {energyQuestionnaire && question.id === 'roofArea' && <EnergyInputFields section="roof" answers={draft} locale={locale} onChange={setValue} />}
      {contactCollectionUnavailable && !contactPermissionUnavailable && <p role="status">{prelaunchNotice[locale]}</p>}
      {question.id === 'quoteContactRequested' && draft.consumptionInput === 'kwh' && <p role="status">{english ? 'Contact requests for kWh-based assessments are not available. Your full estimate is still available without contact details.' : 'ยังไม่เปิดรับคำขอติดต่อจากแบบประเมินที่ใช้หน่วยไฟ kWh คุณยังดูผลประเมินทั้งหมดได้โดยไม่ต้องให้ข้อมูลติดต่อ'}</p>}
      {error && <p className="form-error" id="estimate-error" role="alert">{error}</p>}
    </ScreenTransition>
      <div className="estimate-actions">{step>0&&<button className="button button-secondary" type="button" disabled={!ready||transitioning} aria-label={english?'Back':'ย้อนกลับ'} onClick={previous}><ArrowLeft aria-hidden="true"/><span className="sr-only">{english?'Back':'ย้อนกลับ'}</span></button>}<button className="button" type="button" disabled={!ready || transitioning} onClick={next}>{contactReview ? (english ? 'Continue' : 'ถัดไป') : (contactPermissionUnavailable || contactCollectionUnavailable) ? (english ? 'View my estimate' : 'ดูผลประเมิน') : step === questions.length - 1 && draft.quoteContactRequested ? (english ? 'Continue' : 'ถัดไป') : step === questions.length - 1 ? (english ? 'See my estimate' : 'ดูผลประเมิน') : (english ? 'Next' : 'ถัดไป')} <ArrowRight aria-hidden="true" /></button></div>
    </fieldset>
    {question.id==='quoteContactRequested'&&<div className="estimate-privacy-line"><span>{contactReview ? contactReviewCopy.notice[locale] : english ? 'Assessment progress stays in this browser. Contact details are sent only when you explicitly submit them.' : 'ความคืบหน้าของแบบประเมินจะเก็บไว้ในเบราว์เซอร์นี้ และจะส่งข้อมูลติดต่อเมื่อคุณกดส่งโดยชัดแจ้งเท่านั้น'}</span></div>}
  </section>
  {assessmentConfig && completedAnswers.success && <LeadCapture
    locale={locale}
    answers={completedAnswers.data}
    configuration={assessmentConfig}
    active={showContactForm}
    resetKey={contactResetKey}
    reviewOnly={contactReview}
    onBack={() => { setShowContactForm(false); setDirection('backward'); setError(''); if (contactReview) { setReviewConsentAccepted(false); setContactResetKey((current) => current + 1); } }}
    onConfigurationChanged={(configuration) => { setAssessmentConfig(configuration); writeSessionValue(assessmentContextStorageKey, configuration); }}
    onProcessingStart={() => beginCompletion(completedAnswers.data, 'submitted', true)}
    onProcessingFailed={cancelCompletion}
    onContinue={(outcome) => {
      if (outcome === 'reviewed') setReviewConsentAccepted(false);
      if (outcome === 'submitted') setSubmissionComplete(true);
      else beginCompletion(completedAnswers.data, 'skipped', false);
    }}
  />}
  {!showContactForm&&<aside className="aside assessment-summary" aria-label={text.yourAnswers}><div className="card"><h3>{text.yourAnswers}</h3>{!questions.some(item => item.id !== 'quoteContactRequested' && summaryValue(item)) && <p className="note">{english ? 'Your answers will appear here as you go.' : 'คำตอบของคุณจะแสดงที่นี่เมื่อทำแบบประเมิน'}</p>}<dl className="summary">{questions.filter(item=>item.id!=='quoteContactRequested'&&summaryValue(item)).map(item=><div key={item.id}><dt>{summaryLabels[item.id]?.[locale] ?? item.title[locale]}</dt><dd>{summaryValue(item)} <button type="button" disabled={transitioning} aria-label={`${text.edit}: ${summaryLabels[item.id]?.[locale] ?? item.title[locale]}`} onClick={()=>moveStep(questions.indexOf(item),questions.indexOf(item)<step?'backward':'forward')}>{text.edit}</button></dd></div>)}</dl><p className="note">{text.saved}</p></div></aside>}
  </div></div></main></>;
}
