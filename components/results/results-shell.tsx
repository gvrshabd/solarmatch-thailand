'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  ChevronDown,
  CircleDollarSign,
  Gauge,
  LocateFixed,
  MapPin,
  RefreshCcw,
  Sun,
  TrendingUp,
  Zap,
} from 'lucide-react';
import Link from '@/components/site/internal-link';
import { ScreenTransition } from '@/components/ui/screen-transition';
import { assessmentContextStorageKey } from '@/components/estimate/estimate-shell';
import { CalculationLoading } from './calculation-loading';
import { LifetimeCostChart } from './lifetime-cost-chart';
import { SavingsChart } from './savings-chart';
import { localizedPath, type Locale } from '@/config/i18n';
import { mapProvinces, makeInitialLocation, provinceCenter } from '@/lib/maps/provider';
import { calculateEstimate } from '@/lib/calculator';
import type { EstimateAnswers, EstimateLocation, EstimateResult, FutureLoad } from '@/lib/calculator/types';
import type { PublicLoadingFact } from '@/lib/loading-facts/types';
import type { PublicAssessmentConfig } from '@/lib/questionnaire/types';
import { estimateAnswersSchema } from '@/lib/validation/estimate';
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
    assessmentToken: null,
    assessmentTokenExpiresAt: null,
    liveLeadSubmissions: false,
    contact: {
      ...configuration.contact,
      enabled: false,
      preview: false,
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

  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const resultsViewedTrackedRef = useRef(false);

  useEffect(() => {
    let active = true;
    const parsed = readAnswers();
    if (!parsed.success) {
      queueMicrotask(() => { if (active) setReady(true); });
      return () => { active = false; };
    }
    const signature = answerSignature(parsed.data);
    const storedView = readResultViewState(signature);
    const storedConfiguration = readAssessmentContext();
    const finish = (nextConfiguration: PublicAssessmentConfig | null) => {
      if (!active) return;
      setAnswers(parsed.data);
      setConfiguration(nextConfiguration);
      setSelectedFact(storedView?.fact ?? null);
      setLoadingDuration(storedView?.loadingDurationMs);
      setLoadingStartedAt(storedView?.loadingStartedAt);
      if (storedView?.viewed) setJourney('result');
      else setJourney('preparing');
      setReady(true);
    };
    fetch('/api/assessment/config', { headers: { Accept: 'application/json' }, cache: 'no-store' })
      .then(async (response) => response.ok ? response.json() as Promise<PublicAssessmentConfig> : contactSafeFallback(storedConfiguration))
      .then(finish)
      .catch(() => finish(contactSafeFallback(storedConfiguration)));
    return () => { active = false; };
  }, []);

  const result = useMemo(() => answers ? calculateEstimate(answers) : null, [answers]);

  useEffect(() => {
    if (!result || journey !== 'result' || resultsViewedTrackedRef.current) return;
    resultsViewedTrackedRef.current = true;
    track('estimate_result_viewed', { recommendation: result.recommendation, systemKw: result.planningSystemKw });
    track('results_viewed', { language: locale, recommendation: result.recommendation });
    const timer = window.setTimeout(() => resultHeadingRef.current?.focus(), 390);
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

  if (!answers || !result) return <main className="results-page"><section className="site-shell empty-result"><Sun aria-hidden="true" /><h1>{english ? 'Start with your electricity bill' : 'เริ่มจากค่าไฟของคุณ'}</h1><p>{english ? 'Complete the short estimator to see a practical solar starting point.' : 'ตอบคำถามสั้น ๆ เพื่อดูจุดเริ่มต้นโซลาร์ที่เหมาะกับสถานที่ของคุณ'}</p><Link className="button" href={localizedPath('/estimate', locale)}>{english ? 'Start estimate' : 'เริ่มประเมิน'} <ArrowRight /></Link></section></main>;

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

  return (
    <ScreenTransition transitionKey="journey-result" direction="forward" pace="result" className="journey-transition-surface"><main className="results-page">
      <p className="sr-only" role="status" aria-live="polite">{english ? 'Your solar estimate is ready.' : 'ผลประเมินโซลาร์ของคุณพร้อมแล้ว'}</p>
      <section className="result-hero-v3">
        <div className="site-shell result-hero-grid">
          <div className="result-recommendation">
            <p className="eyebrow">{english ? 'Your SolarMatch estimate' : 'ผลประเมินจาก SolarMatch'}</p>
            <h1 ref={resultHeadingRef} tabIndex={-1}>{recommendation[0]}</h1>
            <p>{recommendation[1]}</p>
            <div className="result-saving-headline">
              <span>{english ? 'Estimated 25-year net savings' : 'เงินประหยัดสุทธิ 25 ปีโดยประมาณ'}</span>
              <strong>{result.planningTwentyFiveYearNetBenefitThb > 0 ? `${english ? 'About ' : 'ประมาณ '}${money(result.planningTwentyFiveYearNetBenefitThb, locale)}` : (english ? 'Not yet positive' : 'ยังไม่เป็นบวก')}</strong>
              <small>{english ? 'A planning estimate, not a guarantee. Includes the planning cash price and annual maintenance reserve; excludes export income, tax relief, finance costs and future electricity-price changes.' : 'เป็นค่าประเมินเพื่อวางแผน ไม่ใช่การรับประกัน โดยรวมราคาเงินสดเพื่อวางแผนและเงินสำรองค่าบำรุงรักษารายปี แต่ไม่รวมรายได้จากการขายไฟ สิทธิภาษี ต้นทุนทางการเงิน และการเปลี่ยนแปลงค่าไฟในอนาคต'}</small>
            </div>
          </div>
          <div className="result-primary-metrics">
            <article><CircleDollarSign aria-hidden="true" /><span>{english ? 'Estimated first-year bill reduction' : 'ค่าไฟปีแรกที่คาดว่าจะลดได้'}</span><strong>{english ? 'About ' : 'ประมาณ '}{money(result.planningMonthlySavingsThb, locale)}<small>/{english ? 'month' : 'เดือน'}</small></strong><p>{english ? 'About ' : 'ประมาณ '}{number(result.planningBillReductionPct, 1)}% {english ? 'of your current bill' : 'ของค่าไฟปัจจุบัน'}</p></article>
            <article><Zap aria-hidden="true" /><span>{english ? 'Estimated starting system size' : 'ขนาดระบบเริ่มต้นโดยประมาณ'}</span><strong>{number(result.planningSystemKw, 1)} kWp</strong><p>{english ? 'Before installer design' : 'ก่อนผู้ติดตั้งออกแบบจริง'}</p></article>
          </div>
        </div>
      </section>

      <section className="site-shell result-service-disclaimer" aria-label={english ? 'Service and estimate disclaimer' : 'ข้อจำกัดของบริการและผลประเมิน'}>
        <p><strong>{english ? 'SolarMatch is an information and referral service, not a solar installer.' : 'SolarMatch เป็นบริการให้ข้อมูลและแนะนำผู้ให้บริการ ไม่ใช่บริษัทติดตั้งโซลาร์'}</strong> {english ? 'This result is a preliminary planning estimate—not an engineering design, official quotation or guarantee of savings. Site surveys, quotations and installation agreements are provided directly by independent solar companies. SolarMatch may receive payment for qualified introductions.' : 'ผลลัพธ์นี้เป็นค่าประเมินเบื้องต้นเพื่อการวางแผน ไม่ใช่การออกแบบทางวิศวกรรม ใบเสนอราคาอย่างเป็นทางการ หรือการรับประกันผลประหยัด การสำรวจหน้างาน ใบเสนอราคา และสัญญาติดตั้งจะดำเนินการโดยบริษัทโซลาร์อิสระโดยตรง และ SolarMatch อาจได้รับค่าตอบแทนจากการแนะนำลูกค้าที่ผ่านเกณฑ์'}</p>
        {answers.projectType === 'expand-existing' && <p><strong>{english ? 'Existing-system project:' : 'โครงการระบบเดิม:'}</strong> {english ? 'Use these figures as a general planning reference only. An installer must assess the existing equipment, electrical design, warranties and available expansion capacity.' : 'ใช้ตัวเลขเหล่านี้เป็นข้อมูลอ้างอิงเบื้องต้นเท่านั้น ผู้ติดตั้งต้องตรวจสอบอุปกรณ์เดิม การออกแบบระบบไฟฟ้า การรับประกัน และความสามารถในการขยายระบบ'}</p>}
      </section>

      <section className="site-shell result-metrics-v3" aria-label={english ? 'Key estimate figures' : 'ตัวเลขสำคัญ'}>
        <article><Banknote aria-hidden="true" /><span>{english ? 'Planning cash price' : 'ราคาเงินสดเพื่อวางแผน'}</span><strong>{money(result.planningInstalledCostThb, locale)}</strong><small>{english ? 'Current planning evidence; not a quotation' : 'อิงหลักฐานราคาเพื่อวางแผนปัจจุบัน ไม่ใช่ใบเสนอราคา'}</small></article>
        <article><TrendingUp aria-hidden="true" /><span>{english ? 'Simple payback (first-year basis)' : 'ระยะคืนทุนอย่างง่าย (อิงปีแรก)'}</span><strong>{result.planningPaybackYears === null ? (english ? 'Not reached' : 'ยังไม่คืนทุน') : `${number(result.planningPaybackYears, 1)} ${english ? 'years' : 'ปี'}`}</strong><small>{result.planningPaybackYears === null ? (english ? 'First-year bill savings do not exceed the annual maintenance reserve.' : 'เงินประหยัดค่าไฟปีแรกยังไม่สูงกว่าเงินสำรองค่าบำรุงรักษารายปี') : (english ? 'Planning price divided by first-year bill savings after the annual maintenance reserve. Excludes finance, tax relief and future tariff changes.' : 'ราคาเพื่อวางแผนหารด้วยเงินประหยัดค่าไฟปีแรกหลังหักเงินสำรองค่าบำรุงรักษารายปี ไม่รวมต้นทุนทางการเงิน สิทธิภาษี และการเปลี่ยนแปลงอัตราค่าไฟในอนาคต')}</small></article>
        <article><Sun aria-hidden="true" /><span>{english ? 'Estimated first-year solar generation' : 'การผลิตไฟโซลาร์ปีแรกโดยประมาณ'}</span><strong>{number(result.planningAnnualProductionKwh)} kWh</strong><small>{english ? 'Long-run solar data; not a clear-sky assumption' : 'ใช้ข้อมูลแดดระยะยาว ไม่ได้สมมติว่าฟ้าใสทุกวัน'}</small></article>
        <article><CircleDollarSign aria-hidden="true" /><span>{english ? 'Annual maintenance/component reserve' : 'เงินสำรองค่าบำรุงรักษา/อุปกรณ์ต่อปี'}</span><strong>{money(result.planningAnnualMaintenanceReserveThb, locale)}</strong><small>{english ? '1.02% of the planning price each year' : '1.02% ของราคาเพื่อวางแผนในแต่ละปี'}</small></article>
        <article><Gauge aria-hidden="true" /><span>{english ? 'Estimated monthly use' : 'การใช้ไฟต่อเดือนโดยประมาณ'}</span><strong>{number(result.estimatedMonthlyConsumptionKwh)} kWh</strong><small>{english ? 'Reverse-calculated from your bill' : 'คำนวณย้อนกลับจากยอดค่าไฟ'}</small></article>
      </section>

      <section className="site-shell accuracy-upgrade" aria-labelledby="accuracy-title">
        <details>
          <summary><span><strong id="accuracy-title">{english ? 'Want a more precise estimate?' : 'อยากให้ค่าประเมินละเอียดขึ้น?'}</strong><small>{english ? 'Optional details update the figures immediately.' : 'ข้อมูลเสริมจะอัปเดตตัวเลขทันที'}</small></span><ChevronDown aria-hidden="true" /></summary>
          <div className="accuracy-fields">
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

            <label>{english ? 'Usable roof area (m²)' : 'พื้นที่หลังคาที่ใช้ได้ (ตร.ม.)'}<input type="number" inputMode="decimal" min="1" value={answers.exactRoofAreaSqm ?? ''} onChange={(event) => update('exactRoofAreaSqm', event.target.value ? Number(event.target.value) : undefined, english ? 'Exact roof area now limits the starting system.' : 'ใช้พื้นที่หลังคาจริงจำกัดขนาดระบบแล้ว')} /></label>
            <label>{english ? 'Main roof direction' : 'ทิศหลักของหลังคา'}<select value={answers.roofDirection ?? 'unsure'} onChange={(event) => update('roofDirection', event.target.value as EstimateAnswers['roofDirection'], english ? 'Roof direction applied to production.' : 'ใช้ทิศหลังคาปรับผลผลิตแล้ว')}><option value="south-group">{english ? 'South / southeast / southwest' : 'ใต้ / ตะวันออกเฉียงใต้ / ตะวันตกเฉียงใต้'}</option><option value="east">{english ? 'East' : 'ตะวันออก'}</option><option value="west">{english ? 'West' : 'ตะวันตก'}</option><option value="north">{english ? 'North' : 'เหนือ'}</option><option value="flat">{english ? 'Flat roof' : 'หลังคาแบน'}</option><option value="several">{english ? 'Several directions' : 'หลายทิศ'}</option><option value="unsure">{english ? 'Unsure' : 'ไม่แน่ใจ'}</option></select></label>
            <label>{english ? 'Roof slope' : 'ความลาดหลังคา'}<select value={answers.roofSlope ?? 'unsure'} onChange={(event) => update('roofSlope', event.target.value as EstimateAnswers['roofSlope'], english ? 'Roof slope applied to production.' : 'ใช้ความลาดหลังคาปรับผลผลิตแล้ว')}><option value="flat">{english ? 'Flat' : 'แบน'}</option><option value="gentle">{english ? 'Gentle' : 'ลาดเล็กน้อย'}</option><option value="steep">{english ? 'Steep' : 'ลาดชัน'}</option><option value="unsure">{english ? 'Unsure' : 'ไม่แน่ใจ'}</option></select></label>
            <label>{english ? 'Electricity phase' : 'ระบบไฟฟ้า'}<select value={answers.electricityPhase ?? 'unsure'} onChange={(event) => update('electricityPhase', event.target.value as EstimateAnswers['electricityPhase'], english ? 'Phase-specific package pricing applied.' : 'ใช้ราคาตามระบบไฟฟ้าแล้ว')}><option value="single">{english ? 'Single phase' : '1 เฟส'}</option><option value="three">{english ? 'Three phase' : '3 เฟส'}</option><option value="unsure">{english ? 'Unsure' : 'ไม่แน่ใจ'}</option></select></label>
            <fieldset className="future-loads"><legend>{english ? 'Planned future electricity use' : 'การใช้ไฟที่วางแผนเพิ่มในอนาคต'}</legend>{([
              ['ev', english ? 'EV' : 'รถไฟฟ้า'], ['air-conditioning', english ? 'More air conditioning' : 'เพิ่มเครื่องปรับอากาศ'], ['pump', english ? 'Pool or water pump' : 'ปั๊มน้ำหรือปั๊มสระ'], ['none', english ? 'None planned' : 'ยังไม่มีแผน'], ['unsure', english ? 'Unsure' : 'ไม่แน่ใจ'],
            ] as const).map(([value, label]) => <label key={value}><input type="checkbox" checked={answers.futureLoads?.includes(value) ?? false} onChange={() => toggleFutureLoad(value)} /> {label}</label>)}</fieldset>
          </div>
          {updateStatus && <p className="calculation-updated" role="status"><RefreshCcw aria-hidden="true" /> {updateStatus}</p>}
        </details>
      </section>

      <section className="site-shell results-explanation">
        <div className="result-chart-card"><div><p className="eyebrow">{english ? 'Monthly effect' : 'ผลต่อค่าไฟต่อเดือน'}</p><h2>{english ? 'Estimated monthly bill before and after solar' : 'ค่าไฟต่อเดือนโดยประมาณก่อนและหลังติดโซลาร์'}</h2></div><SavingsChart currentBill={result.currentMonthlyBillThb} estimatedBill={afterSolarBill} locale={locale} /><table className="sr-only"><caption>{english ? 'Monthly bill comparison' : 'เปรียบเทียบค่าไฟต่อเดือน'}</caption><tbody><tr><th>{english ? 'Before solar' : 'ก่อนติดโซลาร์'}</th><td>{money(result.currentMonthlyBillThb, locale)}</td></tr><tr><th>{english ? 'After solar estimate' : 'หลังติดโซลาร์โดยประมาณ'}</th><td>{money(afterSolarBill, locale)}</td></tr></tbody></table></div>
        <div className="result-chart-card"><div><p className="eyebrow">{english ? '25-year view' : 'มุมมอง 25 ปี'}</p><h2>{english ? 'Estimated cumulative cost with and without solar' : 'ต้นทุนสะสมโดยประมาณเมื่อติดและไม่ติดโซลาร์'}</h2></div><LifetimeCostChart data={result.lifetimeCostSeries} locale={locale} /><p className="chart-method-note">{english ? 'With-solar costs include the planning cash price and annual maintenance reserve and reflect 0.5% yearly module degradation. Export income, tax relief, finance costs and future electricity-price changes are excluded.' : 'ต้นทุนเมื่อติดโซลาร์รวมราคาเงินสดเพื่อวางแผนและเงินสำรองค่าบำรุงรักษารายปี พร้อมคำนวณการเสื่อมของแผง 0.5% ต่อปี โดยไม่รวมรายได้จากการขายไฟ สิทธิภาษี ต้นทุนทางการเงิน และการเปลี่ยนแปลงค่าไฟในอนาคต'}</p><table className="accessible-data-table"><caption>{english ? 'Key lifetime cost points' : 'จุดสำคัญของต้นทุนระยะยาว'}</caption><thead><tr><th>{english ? 'Year' : 'ปี'}</th><th>{english ? 'Without solar' : 'ไม่ติดโซลาร์'}</th><th>{english ? 'With solar' : 'ติดโซลาร์'}</th></tr></thead><tbody>{result.lifetimeCostSeries.filter((row) => [0, 5, 10, 15, 20, 25].includes(row.year)).map((row) => <tr key={row.year}><td>{row.year}</td><td>{money(row.withoutSolarThb, locale)}</td><td>{money(row.withSolarThb, locale)}</td></tr>)}</tbody></table></div>
      </section>

      <section className="site-shell result-policy-note"><BadgeCheck aria-hidden="true" /><div><h2>{english ? 'You may be eligible for tax relief and surplus payments' : 'คุณอาจมีสิทธิ์ได้รับสิทธิลดหย่อนภาษีและรายได้จากไฟส่วนเกิน'}</h2><p>{english ? 'Qualifying residential installations may be eligible for a tax deduction on qualifying spend up to ฿200,000 through 31 December 2028. Separately, approved surplus may be purchased at ฿2.20/kWh for 10 years, subject to current programme conditions, quota and utility approval. Neither benefit is included in the estimate above.' : 'การติดตั้งที่อยู่อาศัยซึ่งเข้าเงื่อนไขอาจใช้สิทธิลดหย่อนจากรายจ่ายที่เข้าเกณฑ์ได้สูงสุด 200,000 บาท ถึง 31 ธันวาคม 2571 และไฟส่วนเกินที่ได้รับอนุมัติอาจขายได้ 2.20 บาท/หน่วย เป็นเวลา 10 ปี ภายใต้เงื่อนไข โควตา และการอนุมัติจากการไฟฟ้าที่ใช้บังคับในปัจจุบัน โดยยังไม่รวมสิทธิทั้งสองในผลด้านบน'}</p><small>{english ? 'Official sources reviewed 2 September 2026: ' : 'ตรวจสอบแหล่งข้อมูลทางการเมื่อ 2 กันยายน 2569: '}<a href="https://myenergy.mea.or.th/project" target="_blank" rel="noreferrer">{english ? 'MEA residential solar programmes' : 'โครงการโซลาร์บ้านของ MEA'}</a></small></div></section>

      <section className="site-shell result-methodology-summary"><div><p className="eyebrow">{english ? 'How the estimate works' : 'ค่าประเมินมาจากไหน'}</p><h2>{english ? 'Every displayed figure has a traceable basis' : 'ทุกตัวเลขที่แสดงมีที่มาที่ตรวจสอบได้'}</h2></div><div className="trace-list">{result.trace.map((item) => <article key={item.labelEn}><strong>{english ? item.labelEn : item.labelTh}</strong><span>{english ? item.value : item.valueTh ?? item.value}</span><small>{english ? item.basisEn : item.basisTh}{item.sourceUrl && <> · <a href={item.sourceUrl} target="_blank" rel="noreferrer">{english ? item.sourceLabelEn : item.sourceLabelTh}</a></>}</small></article>)}</div><p>{english ? `Tariff used: ${result.tariffLabelEn}.` : `อัตราค่าไฟที่ใช้: ${result.tariffLabelTh}`}</p><Link className="text-link" href={localizedPath('/methodology', locale)}>{english ? 'Read the public methodology' : 'อ่านวิธีคำนวณฉบับสาธารณะ'} <ArrowRight /></Link></section>
    </main></ScreenTransition>
  );
}
