'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {ArrowRight,LocateFixed,MapPin,RefreshCcw,Sun,Copy,MessageCircle} from 'lucide-react';
import Link from '@/components/site/internal-link';
import { ScreenTransition } from '@/components/ui/screen-transition';
import { assessmentContextStorageKey } from '@/components/estimate/estimate-shell';
import { CalculationLoading } from './calculation-loading';
import { LifetimeCostChart } from './lifetime-cost-chart';
import { SavingsChart } from './savings-chart';
import { localizedPath, type Locale } from '@/config/i18n';
import { legalReviewDisclosures, prelaunchNotice } from '@/config/legal-review';
import { mapProvinces, makeInitialLocation, provinceCenter } from '@/lib/maps/provider';
import { calculateEstimate } from '@/lib/calculator';
import type { EstimateAnswers, EstimateLocation, EstimateResult, FutureLoad } from '@/lib/calculator/types';
import type { PublicLoadingFact } from '@/lib/loading-facts/types';
import type { PublicAssessmentConfig } from '@/lib/questionnaire/types';
import { estimateAnswersSchema } from '@/lib/validation/estimate';
import {designText} from '@/config/design-v2-copy';
import {provinceOptions} from '@/config/provinces';
import {localizedDistrictOptions} from '@/config/districts';
import {baht,payback} from '@/lib/design-v2/figures';
import {sharedEstimatePrefix,sharedEstimateUrl,restoreSharedEstimate} from '@/lib/design-v2/share-estimate';
import { track } from '@/lib/analytics/track';

const AddressMap = dynamic(() => import('@/components/estimate/address-map'), {
  ssr: false,
  loading: () => <div className="address-map address-map-loading" aria-busy="true"><span>Loading map…</span></div>,
});

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

export function ResultsShell({ locale = 'th' }: { locale?: Locale }) {
  const english = locale === 'en';
  const [answers, setAnswers] = useState<EstimateAnswers | null>(null);
  const [configuration, setConfiguration] = useState<PublicAssessmentConfig | null>(null);
  const [ready, setReady] = useState(false);
  const [journey, setJourney] = useState<JourneyPhase>('initializing');
  const [selectedFact, setSelectedFact] = useState<PublicLoadingFact | null>(null);
  const [loadingDuration, setLoadingDuration] = useState<number | undefined>();
  const [loadingStartedAt, setLoadingStartedAt] = useState<number | undefined>();
  const [showMap, setShowMap] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('');
  const [locationStatus, setLocationStatus] = useState('');
  const [shareStatus,setShareStatus]=useState('');
  const [manualShareLink,setManualShareLink]=useState('');
  const [shareError,setShareError]=useState('');
  const resultFocusedRef=useRef(false);
  const text=designText(locale);

  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
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
    const storedView = readResultViewState(signature);
    const storedConfiguration = readAssessmentContext();
    let initialized = false;
    const finish = (nextConfiguration: PublicAssessmentConfig | null) => {
      if (!active) return;
      // Freeze this journey's original release/fact snapshot. A late refresh
      // must not mix assessment versions or re-authorise contact collection.
      if (initialized) return;
      initialized = true;
      setAnswers(parsed.data);
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

  const result = useMemo(() => answers ? calculateEstimate(answers) : null, [answers]);

  useEffect(() => {
    if (!result || journey !== 'result' || resultsViewedTrackedRef.current) return;
    resultsViewedTrackedRef.current = true;
    track('estimate_result_viewed', { recommendation: result.recommendation, systemKw: result.planningSystemKw });
    track('results_viewed', { language: locale, recommendation: result.recommendation });
    if(resultFocusedRef.current)return;
    const timer = window.setTimeout(() => {resultHeadingRef.current?.focus();resultFocusedRef.current=true;}, 390);
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
    setAnswers((current) => {
      if (!current) return current;
      const next = { ...current, [key]: value };
      try { sessionStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Live recalculation still works. */ }
      return next;
    });
    setUpdateStatus(status);
  }

  function updateLocation(location: EstimateLocation) {
    update('location', location, english ? 'Map location applied. Production has been recalculated.' : 'ใช้ตำแหน่งบนแผนที่แล้ว และคำนวณผลผลิตใหม่');
    if (location.province !== answers?.province) update('province', location.province, english ? 'Province and production have been updated.' : 'อัปเดตจังหวัดและผลผลิตแล้ว');
  }

  function startMap() {
    if (!answers) return;
    const location = answers.location ?? makeInitialLocation(english ? 'Optional property location' : 'ตำแหน่งสถานที่ (ไม่บังคับ)');
    update('location', location, english ? 'Map is ready. Move the pin to refine the location.' : 'แผนที่พร้อมแล้ว เลื่อนหมุดเพื่อเพิ่มความแม่นยำ');
    setShowMap(true);
  }

  function useCurrentLocation() {
    if (!answers || !navigator.geolocation) {
      setLocationStatus(english ? 'Location access is not available in this browser.' : 'เบราว์เซอร์นี้ไม่รองรับการเข้าถึงตำแหน่ง');
      return;
    }
    setLocationStatus(english ? 'Waiting for browser permission…' : 'กำลังรอการอนุญาตจากเบราว์เซอร์…');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const current = answers.location ?? makeInitialLocation(english ? 'Current location' : 'ตำแหน่งปัจจุบัน');
        updateLocation({ ...current, latitude: position.coords.latitude, longitude: position.coords.longitude, source: 'current-location', confirmed: true });
        setShowMap(true);
        setLocationStatus(english ? 'Location applied. You can still move the marker.' : 'ใช้ตำแหน่งแล้ว และยังสามารถเลื่อนหมุดได้');
      },
      () => setLocationStatus(english ? 'Location was not available. You can use the map or province instead.' : 'ไม่สามารถใช้ตำแหน่งได้ คุณยังใช้แผนที่หรือจังหวัดได้'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }

  function toggleFutureLoad(value: FutureLoad) {
    if (!answers) return;
    const current = answers.futureLoads ?? [];
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : value === 'none' || value === 'unsure'
        ? [value]
        : [...current.filter((item) => !['none', 'unsure'].includes(item)), value];
    update('futureLoads', next, english ? 'Future electricity use has been included in the starting size.' : 'รวมการใช้ไฟในอนาคตไว้ในขนาดเริ่มต้นแล้ว');
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
  const recommendation = {
    'strong-fit': english ? ['Solar looks worth exploring for your home', 'Your bill and daytime use support arranging a properly surveyed residential system.'] : ['โซลาร์น่าจะเหมาะกับบ้านของคุณ', 'ค่าไฟและการใช้ไฟช่วงกลางวันสนับสนุนให้ประเมินหน้างานเพื่อออกแบบระบบที่เหมาะสม'],
    'worth-comparing': english ? ['Solar may suit your home', 'The initial numbers support a site assessment, while price and roof details will determine the final fit.'] : ['โซลาร์อาจเหมาะกับบ้านของคุณ', 'ตัวเลขเบื้องต้นสนับสนุนให้ประเมินหน้างาน โดยราคาและรายละเอียดหลังคาจะเป็นตัวตัดสินสุดท้าย'],
    'site-check-first': english ? ['A roof check should come first', 'Shade or available roof space may limit the system, so a careful site assessment is the useful next step.'] : ['ควรตรวจหลังคาเป็นอันดับแรก', 'เงาบังหรือพื้นที่หลังคาอาจจำกัดระบบ การประเมินหน้างานอย่างละเอียดจึงเป็นขั้นตอนถัดไปที่เหมาะสม'],
  }[result.recommendation];

  const place=[localizedDistrictOptions(answers.province,locale).find(item=>item.value===answers.district)?.label,provinceOptions.find(item=>item.value===answers.province)?.[locale]].filter(Boolean).join(', ');
  return <ScreenTransition transitionKey="journey-result" direction="forward" pace="result" className="journey-transition-surface"><main className="results-page v2-results">
    <p className="sr-only" role="status">{english?'Your solar estimate is ready.':'ผลประเมินโซลาร์ของคุณพร้อมแล้ว'}</p>
    <section className="rhero"><div className="wrap rgrid"><div><p className="eyebrow">{text.rEyebrow.replace('{place}',place)}</p><div className="rbig num">{baht(result.planningMonthlySavingsThb)}</div><h1 className="rsub" ref={resultHeadingRef} tabIndex={-1}>{text.rLess}</h1><p className="muted">{text.rPct.replace('{p}',String(Math.round(result.planningBillReductionPct)))}</p><span className={'verdict'+(result.recommendation!=='strong-fit'?' careful':'')}><Sun size={16} aria-hidden="true"/>{recommendation[0]}</span>{result.planningTwentyFiveYearNetBenefitThb<0&&<p className="rfine v2-negative-warning">{text.negNote}</p>}</div><div><div className="rstats"><div><b>{result.planningSystemKw} kWp</b><span>{text.rSystem}</span></div><div><b>{baht(result.planningInstalledCostThb)}</b><span>{text.rPrice}</span></div><div><b>{payback(result.planningPaybackYears)} {result.planningPaybackYears!==null&&text.yrs}</b><span>{text.rPayback}</span></div></div><p className="rfine">{text.rFine} <Link href={localizedPath('/methodology',locale)}>{text.rHow}</Link></p></div></div></section>
    <div className="wrap rbody"><div className="col">
      <section className="card"><div className="card-head"><h2>{text.cTitle}</h2><div className="legend"><span><i/>{text.cWith}</span><span><i className="dash"/>{text.cWithout}</span></div></div><LifetimeCostChart data={result.lifetimeCostSeries} netBenefit={result.planningTwentyFiveYearNetBenefitThb} locale={locale}/><p className="note">{text.cNote}</p></section>
      <section className="card"><h2>{text.billTitle}</h2><SavingsChart currentBill={result.currentMonthlyBillThb} estimatedBill={afterSolarBill} locale={locale}/><p className="eyebrow v2-top-space">{text.exTitle}</p><div className="extras"><Link className="chip chip-line" href={localizedPath('/resources',locale)}>{english?'Tax relief eligibility':'เงื่อนไขสิทธิภาษี'}</Link><a className="chip chip-line" href="https://myenergy.mea.or.th/project" target="_blank" rel="noreferrer">{english?'Surplus purchase programmes':'โครงการรับซื้อไฟส่วนเกิน'}</a></div><p className="note">{text.exNote}</p><details className="disc"><summary>{english?'Incentive conditions and sources':'เงื่อนไขและแหล่งข้อมูลสิทธิประโยชน์'}</summary><div className="in"><p>{legalReviewDisclosures.incentives[locale]}</p><small>{english?'Existing official-source review: 2 September 2026.':'ตรวจสอบแหล่งข้อมูลทางการเดิมเมื่อ 2 กันยายน 2569'}</small></div></details></section>
      <section className="card refine v2-accuracy-upgrade" aria-labelledby="accuracy-title"><div><h2 id="accuracy-title">{text.rfTitle}</h2><p className="note">{text.rfP}</p></div><div className="grid accuracy-fields">
            <label>{english ? 'Usable roof area (m²)' : 'พื้นที่หลังคาที่ใช้ได้ (ตร.ม.)'}<input type="number" inputMode="decimal" min="1" value={answers.exactRoofAreaSqm ?? ''} onChange={(event) => update('exactRoofAreaSqm', event.target.value ? Number(event.target.value) : undefined, english ? 'Exact roof area now limits the starting system.' : 'ใช้พื้นที่หลังคาจริงจำกัดขนาดระบบแล้ว')} /></label>
            <label>{english ? 'Main roof direction' : 'ทิศหลักของหลังคา'}<select value={answers.roofDirection ?? 'unsure'} onChange={(event) => update('roofDirection', event.target.value as EstimateAnswers['roofDirection'], english ? 'Roof direction applied to production.' : 'ใช้ทิศหลังคาปรับผลผลิตแล้ว')}><option value="south-group">{english ? 'South / southeast / southwest' : 'ใต้ / ตะวันออกเฉียงใต้ / ตะวันตกเฉียงใต้'}</option><option value="east">{english ? 'East' : 'ตะวันออก'}</option><option value="west">{english ? 'West' : 'ตะวันตก'}</option><option value="north">{english ? 'North' : 'เหนือ'}</option><option value="flat">{english ? 'Flat roof' : 'หลังคาแบน'}</option><option value="several">{english ? 'Several directions' : 'หลายทิศ'}</option><option value="unsure">{english ? 'Unsure' : 'ไม่แน่ใจ'}</option></select></label>
            <label>{english ? 'Roof slope' : 'ความลาดหลังคา'}<select value={answers.roofSlope ?? 'unsure'} onChange={(event) => update('roofSlope', event.target.value as EstimateAnswers['roofSlope'], english ? 'Roof slope applied to production.' : 'ใช้ความลาดหลังคาปรับผลผลิตแล้ว')}><option value="flat">{english ? 'Flat' : 'แบน'}</option><option value="gentle">{english ? 'Gentle' : 'ลาดเล็กน้อย'}</option><option value="steep">{english ? 'Steep' : 'ลาดชัน'}</option><option value="unsure">{english ? 'Unsure' : 'ไม่แน่ใจ'}</option></select></label>
            <label>{english ? 'Electricity phase' : 'ระบบไฟฟ้า'}<select value={answers.electricityPhase ?? 'unsure'} onChange={(event) => update('electricityPhase', event.target.value as EstimateAnswers['electricityPhase'], english ? 'Phase-specific package pricing applied.' : 'ใช้ราคาตามระบบไฟฟ้าแล้ว')}><option value="single">{english ? 'Single phase' : '1 เฟส'}</option><option value="three">{english ? 'Three phase' : '3 เฟส'}</option><option value="unsure">{english ? 'Unsure' : 'ไม่แน่ใจ'}</option></select></label>
      </div><details className="disc"><summary>{english?'More optional details':'รายละเอียดเพิ่มเติม (ไม่บังคับ)'}</summary><div className="in">
            <div className="accuracy-map-block">
              <label htmlFor="precision-address">{english ? 'Exact address (optional)' : 'ที่อยู่เต็ม (ไม่บังคับ)'}<input id="precision-address" autoComplete="street-address" value={answers.location?.address ?? ''} onChange={(event) => {
                const next = answers.location ? { ...answers.location, address: event.target.value, confirmed: false } : makeInitialLocation(event.target.value);
                update('location', next, english ? 'Address saved in this browser. Open the map to position the property.' : 'เก็บที่อยู่ในเบราว์เซอร์แล้ว เปิดแผนที่เพื่อวางตำแหน่ง');
              }} /></label>
              <div className="address-entry-actions"><button type="button" className="button button-secondary" onClick={startMap}><MapPin /> {english ? 'Position on map' : 'วางตำแหน่งบนแผนที่'}</button><button type="button" className="button button-secondary" onClick={useCurrentLocation}><LocateFixed /> {english ? 'Use current location' : 'ใช้ตำแหน่งปัจจุบัน'}</button></div>
              {locationStatus && <p className="map-status" role="status">{locationStatus}</p>}
              {showMap && answers.location && <div className="map-confirmation-stage"><label>{english ? 'Province' : 'จังหวัด'}<select value={answers.location.province} onChange={(event) => {
                const province = event.target.value;
                const center = provinceCenter(province);
                updateLocation({ ...answers.location!, ...center, province, confirmed: true, source: 'manual-map' });
              }}>{mapProvinces.map((province) => <option value={province.value} key={province.value}>{province[locale]}</option>)}</select></label><AddressMap locale={locale} location={answers.location} onChange={(location) => updateLocation({ ...location, confirmed: true })} /><p className="map-provider-note">{english ? 'OpenStreetMap receives ordinary tile requests for the area you view. Your typed address is not sent to a geocoder.' : 'OpenStreetMap ได้รับคำขอแผนที่ตามพื้นที่ที่เปิดดู แต่ข้อความที่อยู่ไม่ได้ถูกส่งไปค้นหาพิกัด'}</p></div>}
            </div>

            <fieldset className="future-loads"><legend>{english ? 'Planned future electricity use' : 'การใช้ไฟที่วางแผนเพิ่มในอนาคต'}</legend>{([
              ['ev', english ? 'EV' : 'รถไฟฟ้า'], ['air-conditioning', english ? 'More air conditioning' : 'เพิ่มเครื่องปรับอากาศ'], ['pump', english ? 'Pool or water pump' : 'ปั๊มน้ำหรือปั๊มสระ'], ['none', english ? 'None planned' : 'ยังไม่มีแผน'], ['unsure', english ? 'Unsure' : 'ไม่แน่ใจ'],
            ] as const).map(([value, label]) => <label key={value}><input type="checkbox" checked={answers.futureLoads?.includes(value) ?? false} onChange={() => toggleFutureLoad(value)} /> {label}</label>)}</fieldset></div></details></section>
    </div><div className="col">
      <section className="card nextsteps"><h2>{text.nsTitle}</h2><div className="row"><button className="btn btn-primary btn-sm" type="button" onClick={shareLine}><MessageCircle aria-hidden="true"/>{text.nsLine}</button><button className="btn btn-soft btn-sm" type="button" onClick={copyShare}><Copy aria-hidden="true"/>{text.nsCopy}</button></div><p className="note">{english?'The link contains your coarse area, bill and selected assessment and roof inputs. It is not anonymous or encrypted. Contact details, exact location and custom text are excluded; figures may differ if excluded details affected the original estimate.':'ลิงก์มีพื้นที่โดยคร่าว ค่าไฟ และคำตอบเกี่ยวกับบ้านและหลังคาที่เลือกไว้ ไม่ใช่ข้อมูลนิรนามหรือข้อมูลที่เข้ารหัส โดยไม่รวมข้อมูลติดต่อ ตำแหน่งที่แน่นอน หรือข้อความที่กรอกเอง ตัวเลขอาจต่างไปหากข้อมูลที่ไม่แชร์มีผลต่อผลประเมินเดิม'}</p>{shareStatus&&<p role="status">{shareStatus}</p>}{manualShareLink&&<label className="v2-share-fallback">{english?'Estimate link':'ลิงก์ผลประเมิน'}<textarea readOnly value={manualShareLink} onFocus={event=>event.currentTarget.select()}/></label>}<details className="disc"><summary>{text.qaTitle}</summary><div className="in"><ul className="checklist">{text.qa.map(q=><li key={q}>{q}</li>)}</ul></div></details><div className="setrow"><div className="t"><b>{text.mtTitle}</b><span>{text.mtP}</span></div><span className="chip chip-gold">{text.soon}</span></div></section>
      <section className="card"><h2>{text.dfTitle}</h2><p className="muted">{text.dfP}</p></section>
      <section className="card v2-breakdown"><details className="disc"><summary>{text.bdTitle}</summary><div className="in"><p>{recommendation[1]}</p><div className="kv">{[[text.bd.use,number(result.estimatedMonthlyConsumptionKwh)+' kWh'],[text.bd.gen,number(result.planningAnnualProductionKwh)+' kWh'],[text.bd.self,number(result.planningAnnualSelfConsumedKwh)+' kWh'],[text.bd.exp,number(result.planningAnnualExportedKwh)+' kWh'],[text.bd.after,money(result.planningAfterSolarMonthlyBillThb,locale)],[text.bd.maint,money(result.planningAnnualMaintenanceReserveThb,locale)],[text.bd.net,baht(result.planningTwentyFiveYearNetBenefitThb)],[text.bd.tariff,english?result.tariffLabelEn:result.tariffLabelTh],[text.bd.method,result.assumptionVersion]].map(([label,value])=><div key={label}><span>{label}</span><b>{value}</b></div>)}</div><h3>{english?'Every displayed figure has a traceable basis':'ทุกตัวเลขที่แสดงมีที่มาที่ตรวจสอบได้'}</h3><div className="trace-list">{result.trace.map(item=><article key={item.labelEn}><strong>{english?item.labelEn:item.labelTh}</strong><span>{english?item.value:item.valueTh??item.value}</span><small>{english?item.basisEn:item.basisTh}{item.sourceUrl&&<> · <a href={item.sourceUrl} target="_blank" rel="noreferrer">{english?item.sourceLabelEn:item.sourceLabelTh}</a></>}</small></article>)}</div><table className="accessible-data-table"><caption>{english?'Key lifetime cost points':'จุดสำคัญของต้นทุนระยะยาว'}</caption><thead><tr><th>{english?'Year':'ปี'}</th><th>{text.cWithout}</th><th>{text.cWith}</th></tr></thead><tbody>{result.lifetimeCostSeries.filter(row=>[0,5,10,15,20,25].includes(row.year)).map(row=><tr key={row.year}><td>{row.year}</td><td>{baht(row.withoutSolarThb)}</td><td>{baht(row.withSolarThb)}</td></tr>)}</tbody></table><p>{legalReviewDisclosures.estimate[locale]}</p><p>{prelaunchNotice[locale]}</p>{answers.projectType==='expand-existing'&&<p>{english?'Existing-system project: use these figures as a general planning reference only. An installer must assess the existing equipment, electrical design, warranties and available expansion capacity.':'โครงการระบบเดิม: ใช้ตัวเลขเหล่านี้เป็นข้อมูลอ้างอิงเบื้องต้นเท่านั้น ผู้ติดตั้งต้องตรวจสอบอุปกรณ์เดิม การออกแบบระบบไฟฟ้า การรับประกัน และความสามารถในการขยายระบบ'}</p>}</div></details></section>
      <div className="v2-result-actions"><Link className="btn btn-ghost btn-sm" href={localizedPath('/estimate',locale)}>{text.change}</Link><button type="button" className="btn btn-ghost btn-sm" onClick={restartEstimate}>{text.restart}</button></div>
    </div></div>{updateStatus&&<div className="toast show" role="status"><RefreshCcw size={16} aria-hidden="true"/>{updateStatus}</div>}
  </main></ScreenTransition>;
}
