'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {ArrowRight,RefreshCcw,Sun} from 'lucide-react';
import Link from '@/components/site/internal-link';
import { ScreenTransition } from '@/components/ui/screen-transition';
import { assessmentContextStorageKey } from '@/components/estimate/estimate-shell';
import { CalculationLoading } from './calculation-loading';
import { LifetimeCostChart } from './lifetime-cost-chart';
import { localizedPath, type Locale } from '@/config/i18n';
import { legalReviewDisclosures, prelaunchNotice } from '@/config/legal-review';
import { calculateEstimate } from '@/lib/calculator';
import type { EstimateAnswers, EstimateResult } from '@/lib/calculator/types';
import type { PublicLoadingFact } from '@/lib/loading-facts/types';
import type { PublicAssessmentConfig } from '@/lib/questionnaire/types';
import { estimateAnswersSchema } from '@/lib/validation/estimate';
import {designText} from '@/config/design-v2-copy';
import {provinceOptions} from '@/config/provinces';
import {localizedDistrictOptions} from '@/config/districts';
import {baht,payback} from '@/lib/design-v2/figures';
import {sharedEstimatePrefix,sharedEstimateUrl,restoreSharedEstimate} from '@/lib/design-v2/share-estimate';
import { track } from '@/lib/analytics/track';
import {EnergyRefinements} from './energy-refinements';
import {EnergyInputFields} from '@/components/estimate/energy-input-fields';
import {OptionalScenarios} from './optional-scenarios';
import {CalculatorModelDetails} from './calculator-model-details';
import {consumptionMonths,energyInput} from '@/lib/calculator/residential-estimator';
import {modelEnergyYear} from '@/lib/calculator/energy-model';
import {currentCalculationDate} from '@/config/electricity-tariffs';
import {hasResultRefinements,resultsPresentation} from './results-presentation';
import {ResultIcon} from './result-icon-v3';


const storageKey = 'solarmatch:estimate';
const resultViewStorageKey = 'solarmatch:result-view-state';

type ContactOutcome = 'declined' | 'submitted' | 'skipped';
type JourneyPhase = 'initializing' | 'preparing' | 'result';
type ResultViewState = {
  signature: string;
  factSetVersionId: string;
  fact: PublicLoadingFact | null;
  contactOutcome: ContactOutcome | null;
  viewed: boolean;
  loadingDurationMs?: number;
  loadingStartedAt?: number;
  resultSnapshot?: EstimateResult;
};

function money(value: number, locale: Locale) {
  return `฿${Math.abs(value).toLocaleString(locale === 'en' ? 'en-US' : 'th-TH', { maximumFractionDigits: 0 })}`;
}

function number(value: number, digits = 0) {
  return value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function readAnswers() {
  try {
    return estimateAnswersSchema.safeParse(JSON.parse(sessionStorage.getItem(storageKey) ?? 'null'));
  } catch {
    return estimateAnswersSchema.safeParse(null);
  }
}

function answerSignature(answers: EstimateAnswers) {
  const source = JSON.stringify(answers);
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function readAssessmentContext() {
  try {
    const value = JSON.parse(sessionStorage.getItem(assessmentContextStorageKey) ?? 'null') as PublicAssessmentConfig | null;
    return value?.questionnaire && value?.contact ? value : null;
  } catch { return null; }
}

function readResultViewState(signature: string) {
  try {
    const value = JSON.parse(sessionStorage.getItem(resultViewStorageKey) ?? 'null') as ResultViewState | null;
    return value?.signature === signature ? value : null;
  } catch { return null; }
}

function contactSafeFallback(configuration: PublicAssessmentConfig | null) {
  if (!configuration) return null;
  return {
    ...configuration,
    privatePreview: false,
    restrictedSiteCollectionEnabled: false,
    publicCollectionEnabled: false,
    assessmentToken: null,
    assessmentTokenExpiresAt: null,
    liveLeadSubmissions: false,
    contact: {
      ...configuration.contact,
      enabled: false,
      preview: false,
      restrictedSiteCollectionEnabled: false,
      publicCollectionEnabled: false,
      operationalDistributionEnabled: false,
    },
  } satisfies PublicAssessmentConfig;
}

function moneyExact(value:number,locale:Locale){return '฿'+value.toLocaleString(locale==='en'?'en-US':'th-TH',{maximumFractionDigits:2});}

export function ResultsShell({ locale = 'th' }: { locale?: Locale }) {
  const english = locale === 'en';
  const [answers, setAnswers] = useState<EstimateAnswers | null>(null);
  const [configuration, setConfiguration] = useState<PublicAssessmentConfig | null>(null);
  const [ready, setReady] = useState(false);
  const [journey, setJourney] = useState<JourneyPhase>('initializing');
  const [selectedFact, setSelectedFact] = useState<PublicLoadingFact | null>(null);
  const [loadingDuration, setLoadingDuration] = useState<number | undefined>();
  const [loadingStartedAt, setLoadingStartedAt] = useState<number | undefined>();
  const [savedSnapshot, setSavedSnapshot] = useState<EstimateResult | null>(null);
  const [updateStatus, setUpdateStatus] = useState('');
  const [shareStatus,setShareStatus]=useState('');
  const [manualShareLink,setManualShareLink]=useState('');
  const [shareError,setShareError]=useState('');
  const resultFocusedRef=useRef(false);
  const text=designText(locale);

  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const preciseDetailsRef = useRef<HTMLDetailsElement>(null);
  const resultsViewedTrackedRef = useRef(false);

  useEffect(() => {
    let active = true;
    let shared:EstimateAnswers|undefined;
    if(window.location.hash.startsWith(sharedEstimatePrefix)){
      try{shared=restoreSharedEstimate(window.location.hash);sessionStorage.setItem(storageKey,JSON.stringify(shared));}
      catch{queueMicrotask(()=>{if(active){setShareError(english?'This shared estimate is invalid or unsupported. Start a new assessment.':'ลิงก์ผลประเมินนี้ไม่ถูกต้องหรือไม่รองรับ กรุณาเริ่มแบบประเมินใหม่');setReady(true);}});return()=>{active=false;};}
    }
    const parsed = shared?estimateAnswersSchema.safeParse(shared):readAnswers();
    if (!parsed.success) {
      queueMicrotask(() => { if (active) setReady(true); });
      return () => { active = false; };
    }
    const signature = answerSignature(parsed.data);
    const frozenAnswers:EstimateAnswers={...parsed.data,estimateModelVersion:parsed.data.estimateModelVersion??'legacy-v5',calculationReferenceDate:parsed.data.calculationReferenceDate??'2026-10-17'};
    const storedView = readResultViewState(signature);
    const storedConfiguration = readAssessmentContext();
    let initialized = false;
    const finish = (nextConfiguration: PublicAssessmentConfig | null) => {
      if (!active) return;
      // Freeze this journey's original release/fact snapshot. A late refresh
      // must not mix assessment versions or re-authorise contact collection.
      if (initialized) return;
      initialized = true;
      setAnswers(frozenAnswers);
      const snapshot=storedView?.resultSnapshot;
      setSavedSnapshot(snapshot&&snapshot.assumptionVersion&&Array.isArray(snapshot.lifetimeCostSeries)&&Number.isFinite(snapshot.planningInstalledCostThb)?snapshot:null);
      setConfiguration(contactSafeFallback(nextConfiguration));
      setSelectedFact(storedView?.fact ?? null);
      setLoadingDuration(storedView?.loadingDurationMs);
      setLoadingStartedAt(storedView?.loadingStartedAt);
      if (shared||storedView?.viewed) setJourney('result');
      else setJourney('preparing');
      setReady(true);
    };
    // The estimate is already available locally. A hung configuration refresh
    // must not hold the result hostage after a saved or declined request.
    if (storedConfiguration) queueMicrotask(() => finish(contactSafeFallback(storedConfiguration)));
    const controller = new AbortController();
    // Direct result visits may have answers but no fact/configuration snapshot.
    // Give that configuration a short bounded chance, never an unlimited wait.
    const timeout = window.setTimeout(() => { finish(contactSafeFallback(storedConfiguration)); controller.abort(); }, 1500);
    fetch('/api/assessment/config', { headers: { Accept: 'application/json' }, cache: 'no-store', signal: controller.signal })
      .then(async (response) => response.ok ? response.json() as Promise<PublicAssessmentConfig> : contactSafeFallback(storedConfiguration))
      .then(finish)
      .catch(() => finish(contactSafeFallback(storedConfiguration)))
      .finally(() => window.clearTimeout(timeout));
    return () => { active = false; window.clearTimeout(timeout); controller.abort(); };
  }, [english]);

  const result = useMemo(() => savedSnapshot??(answers ? calculateEstimate(answers) : null), [answers,savedSnapshot]);
  const hasPrecisionInputs=answers?hasResultRefinements(answers):false;
  useEffect(()=>{
    // Auto-open when optional facts arrive; thereafter let the native disclosure
    // retain its state. Clearing its last input must not hide that focused input.
    if(hasPrecisionInputs&&journey==='result'&&preciseDetailsRef.current)preciseDetailsRef.current.open=true;
  },[hasPrecisionInputs,journey]);
  const exportIntervals=useMemo(()=>answers?.estimateModelVersion==='energy-v3'&&result?.selectedSystem&&result.modelStatus!=='unsupported'?modelEnergyYear(energyInput(answers,consumptionMonths(answers),result.selectedSystem),{includeIntervals:true}).intervals:undefined,[answers,result]);

  useEffect(() => {
    if (!result || journey !== 'result' || resultsViewedTrackedRef.current) return;
    resultsViewedTrackedRef.current = true;
    track('estimate_result_viewed', { recommendation: result.recommendation, systemKw: result.planningSystemKw });
    track('results_viewed', { language: locale, recommendation: result.recommendation });
    if(resultFocusedRef.current)return;
    const timer = window.setTimeout(() => {
      const active=document.activeElement;
      // Announce the arriving screen, but never steal focus after the user has
      // already reached an input/link during the transition.
      if(!active||active===document.body||active===document.documentElement||active===resultHeadingRef.current)resultHeadingRef.current?.focus({preventScroll:true});
      resultFocusedRef.current=true;
    }, 390);
    return () => window.clearTimeout(timer);
  }, [journey, locale, result, selectedFact?.id]);

  const persistResultView = useCallback((patch: Partial<ResultViewState>) => {
    if (!answers) return;
    const signature = answerSignature(answers);
    const current = readResultViewState(signature);
    const next: ResultViewState = {
      signature,
      factSetVersionId: configuration?.loadingFactSetVersionId ?? current?.factSetVersionId ?? 'unavailable',
      fact: current?.fact ?? null,
      contactOutcome: current?.contactOutcome ?? null,
      viewed: current?.viewed ?? false,
      ...patch,
    };
    try { sessionStorage.setItem(resultViewStorageKey, JSON.stringify(next)); } catch { /* Journey still works without storage. */ }
  }, [answers, configuration?.loadingFactSetVersionId]);

  useEffect(() => {
    if (result) persistResultView({ resultSnapshot: result });
  }, [persistResultView, result]);

  const loadingStarted = useCallback((fact: PublicLoadingFact | null, durationMs: number, startedAt: number) => {
    setSelectedFact(fact);
    setLoadingDuration(durationMs);
    setLoadingStartedAt(startedAt);
    persistResultView({ fact, loadingDurationMs: durationMs, loadingStartedAt: startedAt, viewed: false });
  }, [persistResultView]);

  const loadingCompleted = useCallback((fact: PublicLoadingFact | null) => {
    setSelectedFact(fact);
    persistResultView({ fact, viewed: true });
    setJourney('result');
  }, [persistResultView]);

  useEffect(()=>{if(!updateStatus)return;const timer=window.setTimeout(()=>setUpdateStatus(''),2600);return()=>window.clearTimeout(timer);},[updateStatus]);

  function makeShareUrl(){if(!answers)throw Error('no_estimate');return sharedEstimateUrl(answers,window.location.origin,locale);}
  async function copyShare(){
    try{const url=makeShareUrl();setManualShareLink(url);if(!navigator.clipboard)throw Error('clipboard_unavailable');await navigator.clipboard.writeText(url);setShareStatus(text.copied);}
    catch{setShareStatus(english?'Could not copy automatically. Copy the link below if available.':'คัดลอกอัตโนมัติไม่ได้ คุณคัดลอกลิงก์ด้านล่างได้หากมีลิงก์แสดงอยู่');}
  }
  function shareLine(){try{const url=makeShareUrl();setManualShareLink(url);window.open('https://social-plugins.line.me/lineit/share?url='+encodeURIComponent(url),'_blank','noopener,noreferrer');}catch{setShareStatus(english?'This estimate cannot be shared safely.':'ไม่สามารถแชร์ผลประเมินนี้อย่างปลอดภัยได้');}}
  function restartEstimate(){for(const key of [storageKey,resultViewStorageKey,assessmentContextStorageKey,'solarmatch:estimate-draft','solarmatch:starter'])sessionStorage.removeItem(key);window.location.assign(localizedPath('/estimate',locale));}

  function update<K extends keyof EstimateAnswers>(key: K, value: EstimateAnswers[K] | undefined, status: string) {
    setSavedSnapshot(null);
    setAnswers((current) => {
      if (!current) return current;
      const next = { ...current, [key]: value };
      try { sessionStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Live recalculation still works. */ }
      return next;
    });
    setUpdateStatus(status);
  }

  function recalculateCurrent(){
    if(!answers)return;
    const next={...answers,roofArea:answers.roofArea??'unsure',estimateModelVersion:'energy-v3' as const,calculationReferenceDate:currentCalculationDate()};
    setSavedSnapshot(null);setAnswers(next);sessionStorage.setItem(storageKey,JSON.stringify(next));
    setUpdateStatus(english?'Recalculated with the current reviewed model.':'คำนวณใหม่ด้วยแบบจำลองอ้างอิงปัจจุบันแล้ว');
  }

  if (!ready) return <main className="results-page"><section className="site-shell result-loading" aria-busy="true"><h1>{english ? 'Your rooftop solar estimate' : 'ผลประเมินโซลาร์รูฟท็อปของคุณ'}</h1><p>{english ? 'Loading the answers saved in this browser…' : 'กำลังโหลดคำตอบที่เก็บไว้ในเบราว์เซอร์นี้…'}</p></section></main>;

  if (!answers || !result) return <main className="results-page"><section className="site-shell empty-result"><Sun aria-hidden="true" /><h1>{english ? 'Start with your electricity bill' : 'เริ่มจากค่าไฟของคุณ'}</h1><p>{shareError||(english ? 'Complete the short estimator to see a practical solar starting point.' : 'ตอบคำถามสั้น ๆ เพื่อดูจุดเริ่มต้นโซลาร์ที่เหมาะกับสถานที่ของคุณ')}</p><Link className="button" href={localizedPath('/estimate', locale)}>{english ? 'Start estimate' : 'เริ่มประเมิน'} <ArrowRight /></Link></section></main>;

  if (journey === 'preparing' || journey === 'initializing') {
    return <ScreenTransition transitionKey="journey-preparing" direction="forward" pace="result" className="journey-transition-surface"><CalculationLoading
      facts={configuration?.loadingFacts ?? []}
      locale={locale}
      initialFact={selectedFact}
      initialDurationMs={loadingDuration}
      initialStartedAt={loadingStartedAt}
      onStarted={loadingStarted}
      onComplete={loadingCompleted}
    /></ScreenTransition>;
  }

  const afterSolarBill = result.planningAfterSolarMonthlyBillThb;
  const presentation=resultsPresentation(result);
  const recommendation = {
    'strong-fit': english ? ['Solar looks worth exploring for your home', 'Your bill and daytime use support arranging a properly surveyed residential system.'] : ['โซลาร์น่าจะเหมาะกับบ้านของคุณ', 'ค่าไฟและการใช้ไฟช่วงกลางวันสนับสนุนให้ประเมินหน้างานเพื่อออกแบบระบบที่เหมาะสม'],
    'worth-comparing': english ? ['Solar may suit your home', 'The initial numbers support a site assessment, while price and roof details will determine the final fit.'] : ['โซลาร์อาจเหมาะกับบ้านของคุณ', 'ตัวเลขเบื้องต้นสนับสนุนให้ประเมินหน้างาน โดยราคาและรายละเอียดหลังคาจะเป็นตัวตัดสินสุดท้าย'],
    'site-check-first': english ? ['A roof check should come first', 'Shade or available roof space may limit the system, so a careful site assessment is the useful next step.'] : ['ควรตรวจหลังคาเป็นอันดับแรก', 'เงาบังหรือพื้นที่หลังคาอาจจำกัดระบบ การประเมินหน้างานอย่างละเอียดจึงเป็นขั้นตอนถัดไปที่เหมาะสม'],
  }[result.recommendation];

  const negativeNet = result.planningTwentyFiveYearNetBenefitThb < 0;
  const unavailable=result.modelStatus==='unsupported';
  const noSelection=result.modelStatus==='no-economic-option'||result.modelStatus==='no-feasible-option';
  const financialVerdict = unavailable?(english?'This project is outside the supported model':'โครงการนี้อยู่นอกขอบเขตที่แบบจำลองรองรับ'):noSelection?(english?'No suitable economic installation identified':'ยังไม่พบตัวเลือกติดตั้งที่เหมาะสมและคุ้มค่า'):negativeNet ? text.negNote : result.modelStatus==='infeasible-quote'?(english?'The quoted system does not meet the stated constraints':'ระบบตามใบเสนอราคาไม่ตรงตามข้อจำกัดที่ระบุ'):result.modelStatus==='conditional'?(english?'Conditional solar-only planning illustration':'ตัวอย่างวางแผนเฉพาะโซลาร์ที่ยังมีเงื่อนไข'):recommendation[0];
  const onRefine=<K extends keyof EstimateAnswers>(key:K,value:EstimateAnswers[K]|undefined)=>update(key,value,english?'Estimate updated from the revised inputs.':'อัปเดตผลประเมินตามข้อมูลที่แก้ไขแล้ว');
  const place=[localizedDistrictOptions(answers.province,locale).find(item=>item.value===answers.district)?.label,provinceOptions.find(item=>item.value===answers.province)?.[locale]].filter(Boolean).join(', ');
  return <ScreenTransition transitionKey="journey-result" direction="forward" pace="result" className="journey-transition-surface"><main className="results-page v2-results">
    <p className="sr-only" role="status">{english?'Your solar estimate is ready.':'ผลประเมินโซลาร์ของคุณพร้อมแล้ว'}</p>
    <section className="rhero"><div className="wrap rgrid"><div>
      <p className="eyebrow">{answers.estimateModelVersion==='energy-v3'?(english?`Reference bill · ${place}`:`ค่าไฟอ้างอิง · ${place}`):text.rEyebrow.replace('{place}',place)}</p>
      {presentation.available&&<div className="ba xl num"><span className="sr-only">{english?'Without solar: ':'กรณีไม่ติดโซลาร์: '}</span><span className="was">{baht(presentation.beforeBill)}</span><span className="sr-only">{english?'With solar: ':'กรณีติดโซลาร์: '}</span><span className="now">{baht(afterSolarBill)}</span></div>}
      <h1 className="rsub" ref={resultHeadingRef} tabIndex={-1}>{!presentation.available?financialVerdict:presentation.savingDirection==='unchanged'?(english?'No modeled monthly bill reduction':'ค่าไฟรายเดือนตามแบบจำลองไม่ลดลง'):english?`${baht(Math.abs(result.planningMonthlySavingsThb))} ${presentation.savingDirection} each month`:`${presentation.savingDirection==='less'?'ลดลง':'เพิ่มขึ้น'} ${baht(Math.abs(result.planningMonthlySavingsThb))} ต่อเดือน`}{presentation.available&&<span className="muted pct">{english?`about ${Math.abs(Math.round(result.planningBillReductionPct))}% of ${answers.estimateModelVersion==='energy-v3'?'reference':'current'} bill`:`ประมาณ ${Math.abs(Math.round(result.planningBillReductionPct))}% ของค่าไฟ${answers.estimateModelVersion==='energy-v3'?'อ้างอิง':'ปัจจุบัน'}`}</span>}</h1>
      <span className={'verdict'+(negativeNet?' v2-negative-verdict':result.recommendation!=='strong-fit'||!presentation.available?' careful':'')}>{negativeNet||!presentation.available?<ResultIcon name="info" size={16}/>:<ResultIcon name="sun" size={16}/>}{financialVerdict}</span>
      {result.recommendation==='site-check-first'&&financialVerdict!==recommendation[0]&&<p className="rfine v2-site-warning">{recommendation[0]}</p>}
    </div><div><div className="rstats"><div><b>{!presentation.available?'—':result.planningSystemKw+' kWp'}</b><span>{text.rSystem}</span></div><div className={moneyExact(result.planningInstalledCostThb,locale).length>8?'long-price-stat':undefined}><b>{!presentation.available?'—':moneyExact(result.planningInstalledCostThb,locale)}</b><span>{text.rPrice}</span></div><div><b>{presentation.hasPayback?payback(result.planningPaybackYears)+' '+text.yrs:'—'}</b><span>{text.rPayback}</span></div></div><p className="rfine">{text.rFine} <Link href={localizedPath('/methodology',locale)}>{text.rHow}</Link></p></div></div></section>
    <div className="wrap rbody"><div className="col results-main-col">
      {!unavailable&&<section className="card results-lifetime"><div className="card-head"><h2>{text.cTitle}</h2><div className="legend"><span><i/>{text.cWith}</span><span><i className="dash"/>{text.cWithout}</span></div></div><LifetimeCostChart data={result.lifetimeCostSeries} netBenefit={result.planningTwentyFiveYearNetBenefitThb} locale={locale}/>{answers.estimateModelVersion==='energy-v3'&&presentation.selfUsePercent!==null&&<p className="note reference-scenario"><strong>{english?'Reference scenario':'กรณีอ้างอิง'}</strong>{english?` · ${number(presentation.selfUsePercent,1)}% of solar used immediately. Smooth assumed load and solar profiles are uncalibrated; this is not measured household performance.`:` · ใช้โซลาร์ทันที ${number(presentation.selfUsePercent,1)}% รูปแบบโหลดและแสงอาทิตย์เป็นสมมติฐานเรียบที่ยังไม่เทียบข้อมูลจริง ไม่ใช่ผลที่วัดจากบ้าน`}</p>}</section>}
      {answers.estimateModelVersion==='energy-v3'&&result.selectedSystem&&!unavailable&&result.modelStatus!=='infeasible-quote'&&<OptionalScenarios locale={locale} installationPriceThb={result.planningInstalledCostThb} annualBillSavingsThb={result.planningAnnualSavingsThb} annualReserveThb={result.planningAnnualMaintenanceReserveThb} lifetimeBenefitThb={result.planningTwentyFiveYearNetBenefitThb} systemDcKwp={result.selectedSystem.dcKwp} inverterAcKw={result.selectedSystem.inverterAcKw} exportIntervals={exportIntervals}/ >}
      {answers.estimateModelVersion==='energy-v3'&&<section className="card results-precise"><details className="disc" ref={preciseDetailsRef}><summary><span>{text.rfTitle} <span className="opt-tag">{english?'Optional':'ไม่บังคับ'}</span></span></summary><div className="in refine"><EnergyInputFields section="roof" answers={answers} locale={locale} onChange={onRefine}/><EnergyRefinements answers={answers} locale={locale} onChange={onRefine}/></div></details></section>}
    </div><div className="col results-side-col">
      <section className="card nextsteps"><h2>{text.nsTitle}</h2><div className="row"><button className="btn btn-primary btn-sm" type="button" onClick={shareLine}><ResultIcon name="chat"/>{text.nsLine}</button><button className="btn btn-soft btn-sm" type="button" onClick={copyShare}><ResultIcon name="copy"/>{text.nsCopy}</button></div><p className="note">{english?'The link holds your area, bill and answers, not your name or number.':'ลิงก์มีพื้นที่ ค่าไฟและคำตอบของคุณ ไม่รวมชื่อหรือเบอร์โทร'}</p><details className="disc share-contents"><summary>{english?'What’s in the link?':'ในลิงก์มีอะไรบ้าง?'}</summary><div className="in"><p>{english?'The link contains coarse area, numerical consumption, equipment and schedule inputs with a frozen model/reference version. It is not anonymous or encrypted. Names, contact details, exact location, free text, consent, tax income and financing are excluded. Legacy links use the legacy model.':'ลิงก์มีพื้นที่คร่าว ๆ ข้อมูลการใช้ไฟ อุปกรณ์ และตารางใช้ไฟที่เป็นตัวเลข พร้อมรุ่นแบบจำลองและวันอ้างอิง ไม่ใช่ข้อมูลนิรนามหรือการเข้ารหัส ไม่รวมชื่อ ข้อมูลติดต่อ พิกัด ข้อความอิสระ ความยินยอม รายได้ภาษีหรือสินเชื่อ ลิงก์เก่าใช้แบบจำลองเดิม'}</p></div></details>{shareStatus&&<p role="status">{shareStatus}</p>}{manualShareLink&&<label className="v2-share-fallback">{english?'Estimate link':'ลิงก์ผลประเมิน'}<textarea readOnly value={manualShareLink} onFocus={event=>event.currentTarget.select()}/></label>}<details className="disc"><summary>{text.qaTitle}</summary><div className="in"><ul className="checklist">{text.qa.map(q=><li key={q}>{q}</li>)}</ul></div></details><div className="setrow"><div className="t"><b>{text.mtTitle}</b></div><span className="chip chip-gold">{text.soon}</span></div></section>
      <section className="card v2-breakdown"><details className="disc" open={unavailable||noSelection}><summary>{text.bdTitle}</summary><div className="in"><CalculatorModelDetails answers={answers} result={result} locale={locale} onChange={onRefine} onRecalculate={recalculateCurrent}/>{!unavailable&&<><p>{negativeNet?text.negNote:presentation.available?recommendation[1]:financialVerdict}</p>{negativeNet&&result.recommendation==='site-check-first'&&<p>{recommendation[1]}</p>}<div className="kv">{[[text.bd.use,number(result.estimatedMonthlyConsumptionKwh)+' kWh'],[text.bd.gen,number(result.planningAnnualProductionKwh)+' kWh'],[text.bd.self,number(result.planningAnnualSelfConsumedKwh)+' kWh'],[text.bd.exp,number(result.planningAnnualExportedKwh)+' kWh'],[text.bd.after,money(result.planningAfterSolarMonthlyBillThb,locale)],[text.bd.maint,money(result.planningAnnualMaintenanceReserveThb,locale)],[text.bd.net,baht(result.planningTwentyFiveYearNetBenefitThb)],[text.bd.tariff,english?result.tariffLabelEn:result.tariffLabelTh],[text.bd.method,result.assumptionVersion]].map(([label,value])=><div key={label}><span>{label}</span><b>{value}</b></div>)}</div><h3>{english?'Every displayed figure has a traceable basis':'ทุกตัวเลขที่แสดงมีที่มาที่ตรวจสอบได้'}</h3><div className="trace-list">{result.trace.map(item=><article key={item.labelEn}><strong>{english?item.labelEn:item.labelTh}</strong><span>{english?item.value:item.valueTh??item.value}</span><small>{english?item.basisEn:item.basisTh}{item.sourceUrl&&<> · <a href={item.sourceUrl} target="_blank" rel="noreferrer">{english?item.sourceLabelEn:item.sourceLabelTh}</a></>}</small></article>)}</div><table className="accessible-data-table" tabIndex={0}><caption>{english?'Key lifetime cost points':'จุดสำคัญของต้นทุนระยะยาว'}</caption><thead><tr><th>{english?'Year':'ปี'}</th><th>{text.cWithout}</th><th>{text.cWith}</th></tr></thead><tbody>{result.lifetimeCostSeries.filter(row=>[0,5,10,15,20,25].includes(row.year)).map(row=><tr key={row.year}><td>{row.year}</td><td>{baht(row.withoutSolarThb)}</td><td>{baht(row.withSolarThb)}</td></tr>)}</tbody></table></>}<p className="note">{text.cNote}</p><p>{legalReviewDisclosures.incentives[locale]}</p><p>{legalReviewDisclosures.estimate[locale]}</p><p>{prelaunchNotice[locale]}</p>{answers.projectType==='expand-existing'&&<p>{english?'Existing-system project: use these figures as a general planning reference only. An installer must assess the existing equipment, electrical design, warranties and available expansion capacity.':'โครงการระบบเดิม: ใช้ตัวเลขเหล่านี้เป็นข้อมูลอ้างอิงเบื้องต้นเท่านั้น ผู้ติดตั้งต้องตรวจสอบอุปกรณ์เดิม การออกแบบระบบไฟฟ้า การรับประกัน และความสามารถในการขยายระบบ'}</p>}</div></details></section>
      <div className="v2-result-actions actions2"><Link className="btn btn-ghost btn-sm" href={localizedPath('/estimate',locale)}>{text.change}</Link><button type="button" className="btn btn-ghost btn-sm" onClick={restartEstimate}>{text.restart}</button></div>
    </div></div>{updateStatus&&<div className="toast show" role="status"><RefreshCcw size={16} aria-hidden="true"/>{updateStatus}</div>}
  </main></ScreenTransition>;
}
