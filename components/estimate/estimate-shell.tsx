'use client';

import dynamic from 'next/dynamic';
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
  FileQuestion,
  FlaskConical,
  Gauge,
  Home,
  House,
  LocateFixed,
  MapPin,
  MoonStar,
  ReceiptText,
  SunMedium,
  Trees,
  Warehouse,
  Waves,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { estimateFlow, estimateFlowEn } from '@/config/estimate-flow';
import { localizedPath, type Locale } from '@/config/i18n';
import { mapProvinces, makeInitialLocation, provinceCenter } from '@/lib/maps/provider';
import { track } from '@/lib/analytics/track';
import { estimateAnswersSchema, estimateDraftSchema } from '@/lib/validation/estimate';
import type { DaytimeLoad, EstimateAnswers, EstimateLocation } from '@/lib/calculator/types';

const AddressMap = dynamic(() => import('./address-map'), {
  ssr: false,
  loading: () => <div className="address-map address-map-loading" aria-busy="true"><span>กำลังโหลดแผนที่ / Loading map…</span></div>,
});

type Draft = Partial<EstimateAnswers>;
type SavedDraft = { version: 2; answers: Draft; step: number };

const resultStorageKey = 'solarmatch:estimate';
const draftStorageKey = 'solarmatch:estimate-draft';
const starterStorageKey = 'solarmatch:starter';

const optionIcons: Record<string, LucideIcon> = {
  kwh: Zap,
  bill: ReceiptText,
  help: FileQuestion,
  standard: Home,
  tou: Gauge,
  private: Building2,
  'mostly-empty': MoonStar,
  'light-use': House,
  'work-or-ac': BriefcaseBusiness,
  'regular-loads': AirVent,
  'air-conditioning': AirVent,
  pump: Waves,
  ev: CarFront,
  'home-office': BriefcaseBusiness,
  'home-business': Warehouse,
  'laundry-cooking': CookingPot,
  none: SunMedium,
  'concrete-tile': House,
  'clay-tile': House,
  'fibre-cement': House,
  'metal-sheet': Warehouse,
  'flat-concrete': Building2,
  short: SunMedium,
  'several-hours': Trees,
  heavy: Trees,
  unknown: CircleHelp,
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

function migrateLegacy(raw: unknown): SavedDraft | null {
  if (!raw || typeof raw !== 'object') return null;
  const object = raw as Record<string, unknown>;
  if (object.version === 2) {
    const parsed = estimateDraftSchema.safeParse(object);
    return parsed.success ? { version: 2, answers: parsed.data.answers as Draft, step: parsed.data.step } : null;
  }
  const legacyAnswers = (object.answers && typeof object.answers === 'object' ? object.answers : object) as Record<string, unknown>;
  const migrated: Draft = {};
  if (typeof legacyAnswers.monthlyBillThb === 'number') {
    migrated.electricityInputKind = 'bill';
    migrated.monthlyBillThb = legacyAnswers.monthlyBillThb;
  }
  if (typeof legacyAnswers.province === 'string') migrated.province = legacyAnswers.province;
  if (typeof legacyAnswers.roofMaterial === 'string') migrated.roofMaterial = legacyAnswers.roofMaterial;
  const oldUsage = legacyAnswers.daytimeUsage;
  if (oldUsage === 'high') migrated.daytimePattern = 'regular-loads';
  if (oldUsage === 'medium') migrated.daytimePattern = 'work-or-ac';
  if (oldUsage === 'low') migrated.daytimePattern = 'mostly-empty';
  if (oldUsage === 'unknown') migrated.daytimePattern = 'unknown';
  const oldShade = legacyAnswers.shade;
  if (oldShade === 'none') migrated.shade = 'none';
  if (oldShade === 'partial') migrated.shade = 'short';
  if (oldShade === 'high') migrated.shade = 'several-hours';
  if (oldShade === 'unknown') migrated.shade = 'unknown';
  return Object.keys(migrated).length ? { version: 2, answers: migrated, step: 0 } : null;
}

export function EstimateShell({ locale = 'th' }: { locale?: Locale }) {
  const english = locale === 'en';
  const visibleFlow = useMemo(() => english ? estimateFlowEn : estimateFlow, [english]);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>({});
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [locationStatus, setLocationStatus] = useState('');
  const questionHeadingRef = useRef<HTMLHeadingElement>(null);
  const question = visibleFlow[step];

  useEffect(() => {
    const savedDraft = migrateLegacy(parseJson(readSessionValue(draftStorageKey)));
    const completed = estimateAnswersSchema.safeParse(parseJson(readSessionValue(resultStorageKey)));
    const starter = migrateLegacy(parseJson(readSessionValue(starterStorageKey)));
    const restored = starter?.answers ?? savedDraft?.answers ?? (completed.success ? completed.data : {});
    removeSessionValue(starterStorageKey);
    track('estimate_started', { source: starter ? 'home' : savedDraft ? 'resume' : completed.success ? 'edit' : 'estimate' });
    queueMicrotask(() => {
      setDraft(restored);
      if (!starter && savedDraft) setStep(Math.min(Math.max(savedDraft.step, 0), visibleFlow.length - 1));
      if (restored.location) setShowMap(true);
      setReady(true);
    });
  }, [visibleFlow.length]);

  useEffect(() => {
    if (!ready) return;
    try { sessionStorage.setItem(draftStorageKey, JSON.stringify({ version: 2, answers: draft, step } satisfies SavedDraft)); } catch { /* The estimator remains usable. */ }
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

  function selected(id: string, value: string) {
    return draft[id as keyof Draft] === value;
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

  function validCurrent() {
    if (question.id === 'location') return Boolean(draft.location?.address.trim().length && draft.location.confirmed);
    if (question.id === 'electricity') {
      if (draft.electricityInputKind === 'kwh') return Boolean(draft.monthlyKwh && draft.monthlyKwh >= 50 && draft.monthlyKwh <= 10000);
      return Boolean(draft.electricityInputKind && draft.monthlyBillThb && draft.monthlyBillThb >= 300 && draft.monthlyBillThb <= 50000);
    }
    if (question.id === 'daytimeLoads') return Boolean(draft.daytimeLoads?.length);
    return Boolean(draft[question.id as keyof Draft]);
  }

  function next() {
    if (!validCurrent()) {
      const message = question.id === 'location'
        ? (english ? 'Enter the address, position the marker, then confirm the property.' : 'กรอกที่อยู่ วางหมุด แล้วกดยืนยันตำแหน่งบ้าน')
        : question.id === 'electricity'
          ? (english ? 'Enter 50–10,000 kWh or a bill amount from ฿300–฿50,000.' : 'กรอก 50–10,000 หน่วย หรือยอดค่าไฟ 300–50,000 บาท')
          : (english ? 'Choose an answer before continuing.' : 'กรุณาเลือกคำตอบก่อนดำเนินการต่อ');
      setError(message);
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
      setError(english ? 'Some information is still incomplete. Review the questions before viewing the estimate.' : 'ข้อมูลบางส่วนยังไม่ครบ กรุณาย้อนกลับไปตรวจคำตอบก่อนดูผล');
      return;
    }
    try { sessionStorage.setItem(resultStorageKey, JSON.stringify(parsed.data)); } catch { /* The results page will show its safe empty state. */ }
    removeSessionValue(draftStorageKey);
    window.location.assign(localizedPath('/estimate/results', locale));
  }

  function previous() {
    setStep((current) => Math.max(0, current - 1));
    setError('');
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  function restart() {
    removeSessionValue(starterStorageKey);
    removeSessionValue(draftStorageKey);
    removeSessionValue(resultStorageKey);
    setDraft({});
    setStep(0);
    setShowMap(false);
    setError('');
    setLocationStatus('');
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  function updateAddress(address: string) {
    const current = draft.location;
    const next = current ? { ...current, address, confirmed: false } : makeInitialLocation(address);
    setDraft((value) => ({ ...value, location: next, province: next.province }));
    setError('');
  }

  function openMap() {
    const address = draft.location?.address.trim() ?? '';
    if (address.length < 5) {
      setError(english ? 'Enter enough of the address to identify the home.' : 'กรอกที่อยู่ให้เพียงพอที่จะระบุบ้าน');
      return;
    }
    const location = draft.location ?? makeInitialLocation(address);
    setDraft((value) => ({ ...value, location, province: location.province }));
    setShowMap(true);
    setError('');
  }

  function updateLocation(location: EstimateLocation) {
    setDraft((current) => ({ ...current, location, province: location.province }));
    setError('');
  }

  function changeProvince(province: string) {
    if (!draft.location) return;
    const center = provinceCenter(province);
    updateLocation({ ...draft.location, ...center, province, source: 'manual-map', confirmed: false });
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationStatus(english ? 'This browser does not provide location access.' : 'เบราว์เซอร์นี้ไม่รองรับการเข้าถึงตำแหน่ง');
      return;
    }
    setLocationStatus(english ? 'Waiting for browser permission…' : 'กำลังรอการอนุญาตจากเบราว์เซอร์…');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const current = draft.location ?? makeInitialLocation(english ? 'Current location' : 'ตำแหน่งปัจจุบัน');
        updateLocation({ ...current, latitude: position.coords.latitude, longitude: position.coords.longitude, source: 'current-location', confirmed: false });
        setShowMap(true);
        setLocationStatus(english ? 'Location found. Check the marker before confirming.' : 'พบตำแหน่งแล้ว กรุณาตรวจหมุดก่อนยืนยัน');
      },
      () => setLocationStatus(english ? 'Location was not available. Enter the address and position the marker manually.' : 'ไม่สามารถใช้ตำแหน่งได้ กรุณากรอกที่อยู่และวางหมุดด้วยตนเอง'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }

  function toggleDaytimeLoad(value: DaytimeLoad) {
    const current = draft.daytimeLoads ?? [];
    const exclusive = value === 'none' || value === 'unknown';
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : exclusive
        ? [value]
        : [...current.filter((item) => item !== 'none' && item !== 'unknown'), value];
    setValue('daytimeLoads', next);
  }

  const energyKindOptions = english
    ? [
      { value: 'kwh', label: 'Electricity used in kWh', description: 'Look for “units” or kWh on the bill.' },
      { value: 'bill', label: 'Bill amount in baht', description: 'Use the total from a fairly typical month.' },
      { value: 'help', label: 'Help me find it', description: 'Use the large total amount if the kWh figure is unclear.' },
    ]
    : [
      { value: 'kwh', label: 'จำนวนหน่วยไฟฟ้า (kWh)', description: 'มองหาคำว่า “หน่วย” หรือ kWh บนบิล' },
      { value: 'bill', label: 'ยอดค่าไฟเป็นบาท', description: 'ใช้ยอดรวมจากเดือนที่ค่อนข้างปกติ' },
      { value: 'help', label: 'ช่วยบอกว่าดูตรงไหน', description: 'หากหา kWh ไม่เจอ ให้ใช้ยอดรวมตัวใหญ่บนบิล' },
    ];

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

              {question.type === 'address' && <div className="address-question">
                <label htmlFor="home-address">{english ? 'Home address' : 'ที่อยู่บ้าน'}</label>
                <textarea id="home-address" autoComplete="street-address" rows={3} value={draft.location?.address ?? ''} placeholder={english ? 'House number, street, district and province' : 'บ้านเลขที่ ถนน เขต/อำเภอ และจังหวัด'} aria-invalid={Boolean(error)} aria-describedby="address-privacy-note" onChange={(event) => updateAddress(event.target.value)} />
                <p id="address-privacy-note" className="privacy-inline"><MapPin aria-hidden="true" /> {english ? 'Your typed address stays in this browser session. It is not put in a URL or sent to SolarMatch, an installer, or a geocoder.' : 'ที่อยู่ที่พิมพ์จะอยู่ในเซสชันเบราว์เซอร์นี้เท่านั้น ไม่ใส่ใน URL และไม่ส่งให้ SolarMatch ผู้ติดตั้ง หรือบริการค้นหาที่อยู่'}</p>
                <div className="address-entry-actions">
                  <button type="button" className="button" onClick={openMap}>{showMap ? (english ? 'Update map from province' : 'อัปเดตแผนที่จากจังหวัด') : (english ? 'Position home on map' : 'วางตำแหน่งบ้านบนแผนที่')}</button>
                  <button type="button" className="button button-secondary" onClick={useCurrentLocation}><LocateFixed aria-hidden="true" /> {english ? 'Use my current location' : 'ใช้ตำแหน่งปัจจุบัน'}</button>
                </div>
                {locationStatus && <p className="map-status" role="status">{locationStatus}</p>}
                {showMap && draft.location && <div className="map-confirmation-stage">
                  <div className="province-correction"><label htmlFor="province-correction">{english ? 'Province (you can correct it)' : 'จังหวัด (แก้ไขได้)'}</label><select id="province-correction" value={draft.location.province} onChange={(event) => changeProvince(event.target.value)}>{mapProvinces.map((province) => <option value={province.value} key={province.value}>{province[locale]}</option>)}</select></div>
                  <AddressMap locale={locale} location={draft.location} onChange={updateLocation} />
                  <p className="map-provider-note">{english ? 'The map loads from OpenStreetMap. It receives your IP address, browser referrer, and the viewed map area—not the address text you typed. Satellite imagery is not used because no fully free, verified option met the prototype’s licensing and privacy requirements.' : 'แผนที่โหลดจาก OpenStreetMap ซึ่งได้รับ IP, referrer ของเบราว์เซอร์ และบริเวณแผนที่ที่เปิดดู แต่ไม่ได้รับข้อความที่อยู่ที่พิมพ์ไว้ ไม่ใช้ภาพดาวเทียมเพราะยังไม่พบตัวเลือกฟรีที่ตรวจสอบเงื่อนไขสิทธิ์และความเป็นส่วนตัวได้ครบ'}</p>
                  <button type="button" className={`confirm-location-button ${draft.location.confirmed ? 'confirmed' : ''}`} onClick={() => updateLocation({ ...draft.location!, confirmed: true })}><Check aria-hidden="true" /> {draft.location.confirmed ? (english ? 'Property location confirmed' : 'ยืนยันตำแหน่งบ้านแล้ว') : (english ? 'Confirm this property location' : 'ยืนยันตำแหน่งบ้านนี้')}</button>
                </div>}
              </div>}

              {question.type === 'energy' && <div className="energy-question">
                <div className="choice-grid" role="radiogroup" aria-labelledby="estimate-question" onKeyDown={handleRadioKeys}>
                  {energyKindOptions.map((option) => {
                    const isSelected = draft.electricityInputKind === option.value;
                    const Icon = optionIcons[option.value];
                    return <button key={option.value} type="button" role="radio" aria-checked={isSelected} tabIndex={isSelected || !draft.electricityInputKind && option.value === 'kwh' ? 0 : -1} className={`choice-card visual-choice ${isSelected ? 'selected' : ''}`} onClick={() => {
                      setDraft((current) => ({ ...current, electricityInputKind: option.value as EstimateAnswers['electricityInputKind'], additionalMonthlyValues: undefined }));
                      setError('');
                    }}><Icon className="choice-icon" aria-hidden="true" /><span><strong>{option.label}</strong><small>{option.description}</small></span><span className="choice-indicator" aria-hidden="true">{isSelected && <Check />}</span></button>;
                  })}
                </div>
                {draft.electricityInputKind && <div className="energy-number-panel">
                  {draft.electricityInputKind === 'help' && <p className="gentle-callout">{english ? 'On most bills, the kWh value is near “units used.” If it is still unclear, enter the large total payable amount below.' : 'ในบิลส่วนใหญ่ จำนวนหน่วยอยู่ใกล้คำว่า “หน่วยที่ใช้” หากยังหาไม่พบ ให้กรอกยอดรวมที่ต้องชำระด้านล่าง'}</p>}
                  <label htmlFor="electricity-value">{draft.electricityInputKind === 'kwh' ? (english ? 'Monthly electricity used' : 'จำนวนหน่วยต่อเดือน') : (english ? 'Monthly bill amount' : 'ยอดค่าไฟต่อเดือน')}</label>
                  <div className="large-currency-input"><span>{draft.electricityInputKind === 'kwh' ? '' : '฿'}</span><input id="electricity-value" type="number" inputMode="decimal" min={draft.electricityInputKind === 'kwh' ? 50 : 300} max={draft.electricityInputKind === 'kwh' ? 10000 : 50000} value={draft.electricityInputKind === 'kwh' ? draft.monthlyKwh ?? '' : draft.monthlyBillThb ?? ''} placeholder={draft.electricityInputKind === 'kwh' ? '850' : '3,500'} onChange={(event) => {
                    const value = Number(event.target.value);
                    if (draft.electricityInputKind === 'kwh') setValue('monthlyKwh', value);
                    else setValue('monthlyBillThb', value);
                  }} /><small>{draft.electricityInputKind === 'kwh' ? 'kWh' : (english ? '/ month' : '/ เดือน')}</small></div>
                  <button type="button" className="add-months-button" onClick={() => setValue('additionalMonthlyValues', draft.additionalMonthlyValues ? undefined : [0, 0])}>{draft.additionalMonthlyValues ? (english ? 'Remove extra months' : 'ลบเดือนเพิ่มเติม') : (english ? 'Add two more monthly figures (optional)' : 'เพิ่มตัวเลขอีก 2 เดือน (ไม่บังคับ)')}</button>
                  {draft.additionalMonthlyValues && <div className="additional-months-grid">{draft.additionalMonthlyValues.map((value, index) => <label key={index}>{english ? `Additional month ${index + 1}` : `เดือนเพิ่มเติม ${index + 1}`}<input type="number" inputMode="decimal" min="1" value={value || ''} onChange={(event) => {
                    const next = [...(draft.additionalMonthlyValues ?? [])];
                    next[index] = Number(event.target.value);
                    setValue('additionalMonthlyValues', next);
                  }} /></label>)}</div>}
                </div>}
              </div>}

              {(question.type === 'choice' || question.type === 'period' || question.type === 'tariff') && <div className="choice-grid" role="radiogroup" aria-labelledby="estimate-question" aria-describedby={error ? 'estimate-error' : undefined} onKeyDown={handleRadioKeys}>
                {question.options?.map((option, index) => {
                  const isSelected = selected(question.id, option.value);
                  const hasSelection = question.options?.some((candidate) => selected(question.id, candidate.value));
                  const Icon = optionIcons[option.value] ?? CircleHelp;
                  return <button key={option.value} type="button" role="radio" aria-checked={isSelected} tabIndex={isSelected || (!hasSelection && index === 0) ? 0 : -1} className={`choice-card visual-choice ${isSelected ? 'selected' : ''}`} onClick={() => setValue(question.id as keyof EstimateAnswers, option.value as never)}><Icon className="choice-icon" aria-hidden="true" /><span><strong>{option.label}</strong>{option.description && <small>{option.description}</small>}</span><span className="choice-indicator" aria-hidden="true">{isSelected && <Check />}</span></button>;
                })}
              </div>}

              {question.type === 'tariff' && draft.tariffType === 'tou' && <div className="tou-details"><p>{english ? 'Enter the split if it is available. SolarMatch will still withhold a financial result until the current TOU calculation is fully validated.' : 'กรอกหน่วยแยกหากมีข้อมูล SolarMatch จะยังไม่แสดงผลการเงินจนกว่าจะตรวจสอบแบบจำลอง TOU ปัจจุบันครบถ้วน'}</p><div><label>{english ? 'On Peak kWh (optional)' : 'On Peak (หน่วย) ไม่บังคับ'}<input type="number" inputMode="decimal" min="0" value={draft.touOnPeakKwh ?? ''} onChange={(event) => setValue('touOnPeakKwh', Number(event.target.value))} /></label><label>{english ? 'Off Peak kWh (optional)' : 'Off Peak (หน่วย) ไม่บังคับ'}<input type="number" inputMode="decimal" min="0" value={draft.touOffPeakKwh ?? ''} onChange={(event) => setValue('touOffPeakKwh', Number(event.target.value))} /></label></div></div>}

              {question.type === 'multichoice' && <div className="choice-grid multichoice-grid" aria-labelledby="estimate-question">{question.options?.map((option) => {
                const checked = draft.daytimeLoads?.includes(option.value as DaytimeLoad) ?? false;
                const Icon = optionIcons[option.value] ?? CircleHelp;
                return <button key={option.value} type="button" role="checkbox" aria-checked={checked} className={`choice-card visual-choice ${checked ? 'selected' : ''}`} onClick={() => toggleDaytimeLoad(option.value as DaytimeLoad)}><Icon className="choice-icon" aria-hidden="true" /><strong>{option.label}</strong><span className="choice-indicator checkbox-indicator" aria-hidden="true">{checked && <Check />}</span></button>;
              })}</div>}

              {question.type === 'multichoice' && draft.daytimeLoads?.includes('air-conditioning') && <div className="conditional-followup"><label htmlFor="ac-hours">{english ? 'Roughly how long does daytime air conditioning run? (optional)' : 'ปกติเปิดแอร์กลางวันนานแค่ไหน? (ไม่บังคับ)'}</label><select id="ac-hours" value={draft.acDaytimeHours ?? 'unknown'} onChange={(event) => setValue('acDaytimeHours', event.target.value as EstimateAnswers['acDaytimeHours'])}><option value="under-2">{english ? 'Less than 2 hours' : 'น้อยกว่า 2 ชั่วโมง'}</option><option value="2-4">{english ? '2–4 hours' : '2–4 ชั่วโมง'}</option><option value="over-4">{english ? 'More than 4 hours' : 'มากกว่า 4 ชั่วโมง'}</option><option value="unknown">{english ? 'Not sure' : 'ไม่แน่ใจ'}</option></select></div>}
              {question.type === 'multichoice' && draft.daytimeLoads?.includes('ev') && <div className="conditional-followup"><label htmlFor="ev-daytime">{english ? 'Is the EV normally charged in daylight at least three days a week? (optional)' : 'ปกติชาร์จรถช่วงกลางวันอย่างน้อย 3 วันต่อสัปดาห์ไหม? (ไม่บังคับ)'}</label><select id="ev-daytime" value={draft.evChargesInDaytime ?? 'unknown'} onChange={(event) => setValue('evChargesInDaytime', event.target.value as EstimateAnswers['evChargesInDaytime'])}><option value="yes">{english ? 'Yes' : 'ใช่'}</option><option value="no">{english ? 'No' : 'ไม่ใช่'}</option><option value="unknown">{english ? 'Not sure' : 'ไม่แน่ใจ'}</option></select></div>}

              {question.type === 'period' && draft.consumptionPeriod === 'latest' && <p className="gentle-callout">{english ? 'If this bill is from March–May, air-conditioning demand may make it higher than the annual average.' : 'หากเป็นบิลเดือนมีนาคม–พฤษภาคม การใช้แอร์อาจทำให้ตัวเลขสูงกว่าค่าเฉลี่ยทั้งปี'}</p>}

              {error && <p className="form-error" id="estimate-error" role="alert">{error}</p>}
              <div className="estimate-actions">
                <button className="button button-secondary" type="button" disabled={step === 0 || !ready} onClick={previous}><ArrowLeft aria-hidden="true" /> {english ? 'Back' : 'ย้อนกลับ'}</button>
                <button className="button" type="button" disabled={!ready} onClick={next}>{step === visibleFlow.length - 1 ? (english ? 'See estimate' : 'ดูผลประเมิน') : (english ? 'Next' : 'ถัดไป')} <ArrowRight aria-hidden="true" /></button>
              </div>
            </div>
          </fieldset>
          <div className="estimate-prototype-line"><FlaskConical aria-hidden="true" /><span>{english ? 'Prototype: estimator answers, including the address, stay in this browser session. No lead is sent.' : 'เวอร์ชันต้นแบบ: คำตอบรวมถึงที่อยู่จะอยู่ในเซสชันเบราว์เซอร์นี้ และไม่มีการส่งข้อมูลลูกค้า'}</span><button type="button" className="estimate-restart" onClick={restart}>{english ? 'Clear and start over' : 'ล้างข้อมูลและเริ่มใหม่'}</button></div>
        </section>
      </div>
    </main>
  );
}
