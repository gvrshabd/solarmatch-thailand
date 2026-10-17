'use client';

import { useEffect, useRef, useState } from 'react';
import type { DaytimePattern, EstimateAnswers } from '@/lib/calculator/types';

export type EnergyAnswersChange = <K extends keyof EstimateAnswers>(key: K, value: EstimateAnswers[K] | undefined) => void;
export type EnergyInputFieldsProps = {
  section: 'consumption' | 'timing' | 'loads' | 'roof';
  answers: Partial<EstimateAnswers>;
  locale: 'en' | 'th';
  onChange: EnergyAnswersChange;
};

/** Date inputs must round-trip: Date.parse alone accepts impossible dates. */
export function isEnergyIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '2000-01-01' || value > '2100-12-31') return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function EnergyNumberField({ label, value, onChange, min = 0, max, step = 'any', hint }: {
  label: string; value: number | undefined; onChange: (value: number | undefined) => void;
  min?: number; max: number; step?: number | 'any'; hint?: string;
}) {
  const formatted = value !== undefined && Number.isFinite(value) ? String(value) : '';
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState(formatted);
  return <label>{label}<input type="number" inputMode={step === 1 ? 'numeric' : 'decimal'} min={min} max={max} step={step}
    value={editing ? raw : formatted}
    onFocus={() => { setRaw(formatted); setEditing(true); }}
    onChange={event => {
      const next = event.currentTarget.value;
      setRaw(next); setEditing(true);
      if (next === '') { onChange(undefined); return; }
      const parsed = Number(next);
      // Keep intermediate decimal entry editable, but never publish invalid numbers.
      if (!Number.isFinite(parsed) || parsed < min || parsed > max || (step === 1 && !Number.isInteger(parsed))) { onChange(undefined); return; }
      onChange(parsed);
    }}
    onBlur={() => {
      setEditing(false);
      if (raw === '') { onChange(undefined); return; }
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) { onChange(undefined); return; }
      const bounded = Math.max(min, Math.min(max, parsed));
      onChange(step === 1 ? Math.round(bounded) : bounded);
    }} />{hint && <small>{hint}</small>}</label>;
}

/** Keep incomplete rows local; only complete, valid facts enter the calculation. */
export function useEnergyDraftRows<T extends object>(incoming: readonly T[] | undefined, complete: (rows: T[]) => T[], onCommit: (rows: T[] | undefined) => void) {
  const [rows, setRows] = useState<T[]>(() => [...(incoming ?? [])]);
  const incomingKey = JSON.stringify(incoming ?? []);
  const lastCommitted = useRef(incomingKey);
  useEffect(() => {
    if (incomingKey !== lastCommitted.current) {
      setRows(JSON.parse(incomingKey) as T[]);
      lastCommitted.current = incomingKey;
    }
  }, [incomingKey]);
  const update = (next: T[]) => {
    setRows(next);
    const valid = complete(next);
    lastCommitted.current = JSON.stringify(valid);
    onCommit(valid.length ? valid : undefined);
  };
  return [rows, update] as const;
}

type MonthlyDraft = { month: number; kwh?: number; periodDays?: number; billDate?: string };
const patternValues: DaytimePattern[] = ['very-low', 'low', 'moderate', 'high', 'very-high'];
const patternLabels = {
  en: ['Very little daytime use', 'Low daytime use', 'Moderate daytime use', 'High daytime use', 'Very high daytime use'],
  th: ['ใช้ช่วงกลางวันน้อยมาก', 'ใช้ช่วงกลางวันน้อย', 'ใช้ช่วงกลางวันปานกลาง', 'ใช้ช่วงกลางวันมาก', 'ใช้ช่วงกลางวันมากเป็นพิเศษ'],
};

export function EnergyInputFields({ section, answers, locale, onChange }: EnergyInputFieldsProps) {
  const en = locale === 'en';
  const t = (english: string, thai: string) => en ? english : thai;
  const [records, setRecords] = useEnergyDraftRows<MonthlyDraft>(answers.monthlyRecords,
    rows => rows.filter(row => row.kwh !== undefined && row.periodDays !== undefined),
    rows => onChange('monthlyRecords', rows?.map(row => ({ ...row, kwh: row.kwh!, periodDays: row.periodDays! }))));
  const updateRecord = (index: number, patch: Partial<MonthlyDraft>) => setRecords(records.map((row, i) => i === index ? { ...row, ...patch } : row));
  const percent = (label: string, value: number | undefined, change: (value: number | undefined) => void, hint?: string) =>
    <EnergyNumberField label={label} value={value === undefined ? undefined : value * 100} max={100} onChange={value => change(value === undefined ? undefined : value / 100)} hint={hint} />;

  if (section === 'consumption') return <fieldset className="inline-followup">
    <legend>{t('Electricity use and bill details', 'ข้อมูลการใช้ไฟและบิลค่าไฟ')}</legend>
    <div className="grid accuracy-fields">
      <label>{t('Use a bill amount or actual electricity units?', 'ต้องการกรอกค่าไฟหรือหน่วยไฟที่ใช้จริง?')}<select value={answers.consumptionInput ?? 'bill'} onChange={event => onChange('consumptionInput', event.currentTarget.value as 'bill' | 'kwh')}>
        <option value="bill">{t('Monthly bill amount (THB)', 'ค่าไฟต่อเดือน (บาท)')}</option><option value="kwh">{t('Actual electricity use (kWh)', 'หน่วยไฟที่ใช้จริง (kWh)')}</option>
      </select></label>
      {answers.consumptionInput === 'kwh' && <EnergyNumberField label={t('Electricity used in this billing period (kWh)', 'หน่วยไฟที่ใช้ในรอบบิลนี้ (kWh)')} value={answers.monthlyConsumptionKwh} min={0.01} max={100000} onChange={value => onChange('monthlyConsumptionKwh', value)} />}
      <EnergyNumberField label={t('Days in this billing period (optional)', 'จำนวนวันในรอบบิลนี้ (ถ้าทราบ)')} value={answers.billingPeriodDays} min={1} max={62} step={1} onChange={value => onChange('billingPeriodDays', value)} hint={t('If blank, assume 365 ÷ 12 ≈ 30.42 days per bill.', 'หากเว้นว่าง สมมติรอบบิล 365 ÷ 12 ≈ 30.42 วัน')} />
      <label>{t('Bill date (optional)', 'วันที่ออกบิล (ถ้าทราบ)')}<input type="date" min="2000-01-01" max="2100-12-31" value={answers.billDate ?? ''} onChange={event => {
        const date = event.currentTarget.value;
        if (!date || isEnergyIsoDate(date)) onChange('billDate', date || undefined);
      }} /></label>
      <label>{t('Tariff category shown on the bill', 'ประเภทอัตราค่าไฟที่ระบุในบิล')}<select value={answers.tariffCategory ?? ''} onChange={event => onChange('tariffCategory', event.currentTarget.value ? event.currentTarget.value as EstimateAnswers['tariffCategory'] : undefined)}>
        <option value="">{t('Assume ordinary residential rate — not confirmed', 'สมมติอัตราบ้านอยู่อาศัยปกติ — ยังไม่ได้ยืนยัน')}</option>
        <option value="ordinary-1.2">{t('Ordinary residential: MEA 1.2 / PEA 1.1.2', 'บ้านอยู่อาศัยอัตราปกติ: กฟน. 1.2 / กฟภ. 1.1.2')}</option><option value="ordinary-1.1">{t('Ordinary residential: MEA 1.1 / PEA 1.1.1', 'บ้านอยู่อาศัยอัตราปกติ: กฟน. 1.1 / กฟภ. 1.1.1')}</option><option value="tou">{t('Time-of-use (TOU)', 'อัตราตามช่วงเวลาการใช้ (TOU)')}</option><option value="unknown">{t('Not sure', 'ไม่แน่ใจ')}</option>
      </select></label>
      <label>{t('Electricity utility', 'การไฟฟ้าที่ให้บริการ')}<select value={answers.utility ?? 'inferred'} onChange={event => onChange('utility', event.currentTarget.value === 'inferred' ? undefined : event.currentTarget.value as EstimateAnswers['utility'])}>
        <option value="inferred">{t('Infer from selected province', 'ประเมินจากจังหวัดที่เลือก')}</option><option value="MEA">{t('MEA', 'กฟน. (MEA)')}</option><option value="PEA">{t('PEA', 'กฟภ. (PEA)')}</option><option value="unknown">{t('Not sure', 'ไม่แน่ใจ')}</option>
      </select></label>
    </div>
    <p className="note">{t('Optional: add up to 12 monthly electricity records to capture seasonal changes. Incomplete rows are not used. Enter kWh, not the bill amount.', 'เพิ่มข้อมูลหน่วยไฟรายเดือนได้สูงสุด 12 เดือน เพื่อสะท้อนการใช้ไฟตามฤดูกาล แถวที่กรอกไม่ครบจะยังไม่ใช้คำนวณ กรุณากรอกหน่วย kWh ไม่ใช่ยอดเงินค่าไฟ')}</p>
    {records.map((record, index) => <fieldset className="inline-followup" key={index}>
      <legend>{t(`Electricity record ${index + 1}`, `ข้อมูลหน่วยไฟรายการที่ ${index + 1}`)}</legend>
      <div className="grid accuracy-fields">
        <label>{t('Calendar month', 'เดือน')}<select value={record.month} onChange={event => updateRecord(index, { month: Number(event.currentTarget.value) })}>
          {Array.from({ length: 12 }, (_, i) => i + 1).filter(month => month === record.month || !records.some(row => row.month === month)).map(month => <option key={month} value={month}>{new Intl.DateTimeFormat(en ? 'en' : 'th', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2027, month - 1, 1)))}</option>)}
        </select></label>
        <EnergyNumberField label={t('Electricity used (kWh)', 'หน่วยไฟที่ใช้ (kWh)')} value={record.kwh} max={100000} onChange={value => updateRecord(index, { kwh: value })} />
        <EnergyNumberField label={t('Billing period (days)', 'จำนวนวันในรอบบิล (วัน)')} value={record.periodDays} min={1} max={62} step={1} onChange={value => updateRecord(index, { periodDays: value })} />
      </div>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRecords(records.filter((_, i) => i !== index))}>{t(`Remove record ${index + 1}`, `ลบรายการที่ ${index + 1}`)}</button>
    </fieldset>)}
    <button type="button" className="btn btn-soft btn-sm" disabled={records.length >= 12} onClick={() => {
      const month = Array.from({ length: 12 }, (_, i) => i + 1).find(value => !records.some(record => record.month === value));
      if (month) setRecords([...records, { month }]);
    }}>{t('Add a monthly electricity record', 'เพิ่มข้อมูลหน่วยไฟรายเดือน')}</button>
  </fieldset>;

  if (section === 'timing') return <fieldset className="inline-followup">
    <legend>{t('Weekend electricity use', 'การใช้ไฟในวันเสาร์–อาทิตย์')}</legend>
    <p className="note">{t('Your main daytime-use answer describes Monday–Friday. You can give a different answer for weekends.', 'คำตอบการใช้ไฟช่วงกลางวันหลักใช้แทนวันจันทร์–ศุกร์ หากเสาร์–อาทิตย์ใช้ต่างกัน สามารถระบุเพิ่มได้')}</p>
    <div className="grid accuracy-fields"><label>{t('Daytime use on Saturday–Sunday (08:00–18:00)', 'การใช้ไฟกลางวันเสาร์–อาทิตย์ (08:00–18:00 น.)')}<select value={answers.weekendDaytimePattern ?? ''} onChange={event => onChange('weekendDaytimePattern', event.currentTarget.value ? event.currentTarget.value as DaytimePattern : undefined)}>
      <option value="">{t('Not sure — use my weekday answer', 'ไม่แน่ใจ — ใช้คำตอบเดียวกับวันธรรมดา')}</option>{patternValues.map((value, i) => <option key={value} value={value}>{patternLabels[locale][i]}</option>)}
    </select></label></div>
  </fieldset>;

  if (section === 'loads') return <fieldset className="inline-followup">
    <legend>{t('When your existing appliances run (optional)', 'ช่วงเวลาที่ใช้อุปกรณ์เดิม (ถ้าทราบ)')}</legend>
    <p className="note">{t('These appliances are already included in your bill. Details change when the same baseline energy is used; they do not add electricity use again. Leave unknown values blank.', 'อุปกรณ์เหล่านี้รวมอยู่ในบิลแล้ว ข้อมูลนี้ใช้ปรับช่วงเวลาของหน่วยไฟเดิม จะไม่บวกการใช้ไฟซ้ำ หากไม่ทราบให้เว้นว่าง')}</p>
    <div className="grid accuracy-fields">
      {answers.daytimeLoads?.includes('air-conditioning') && <>
        <EnergyNumberField label={t('AC units actually running in daytime', 'จำนวนแอร์ที่เปิดใช้งานจริงช่วงกลางวัน (เครื่อง)')} value={answers.daylightAcUnits} max={answers.airConditionerCount ?? 100} step={1} onChange={value => onChange('daylightAcUnits', value)} />
        <EnergyNumberField label={t('Daytime running time per AC unit (hours/day)', 'เวลาเปิดแอร์กลางวันต่อเครื่อง (ชั่วโมง/วัน)')} value={answers.daylightAcHours} max={9} onChange={value => onChange('daylightAcHours', value)} hint={t('Modeled from 09:00, ending by 18:00.', 'จำลองเริ่มเวลา 09:00 น. และสิ้นสุดไม่เกิน 18:00 น.')} />
        <EnergyNumberField label={t('Average AC electric input per unit (kW, optional)', 'กำลังไฟฟ้าเฉลี่ยของแอร์ต่อเครื่อง (kW ถ้าทราบ)')} value={answers.acPowerKw} min={0.01} max={20} onChange={value => onChange('acPowerKw', value)} hint={t('If blank, assume 1 kW average electric input per unit, including compressor cycling; not cooling capacity or BTU.', 'หากเว้นว่าง สมมติกำลังไฟฟ้าเฉลี่ย 1 kW ต่อเครื่อง รวมจังหวะตัด–ต่อคอมเพรสเซอร์ ไม่ใช่ขนาดความเย็นหรือ BTU')} />
      </>}
      {answers.daytimeLoads?.includes('ev') && <>
        <EnergyNumberField label={t('Existing EV charging electricity at the wall (kWh/month)', 'หน่วยไฟชาร์จรถ EV เดิม วัดที่ปลั๊ก (kWh/เดือน)')} value={answers.existingEvMonthlyKwh} max={100000} onChange={value => onChange('existingEvMonthlyKwh', value)} />
        {percent(t('Share of EV charging done at home (%)', 'สัดส่วนการชาร์จ EV ที่บ้าน (%)'), answers.evHomeChargingFraction, value => onChange('evHomeChargingFraction', value), t('If blank, assume 100% of charging happens at home.', 'หากเว้นว่าง สมมติว่าชาร์จที่บ้าน 100%'))}
        {percent(t('Share of home EV charging in daytime (%)', 'สัดส่วนการชาร์จ EV ที่บ้านในช่วงกลางวัน (%)'), answers.evDaytimeFraction, value => onChange('evDaytimeFraction', value), t('If blank, assume 0% daytime charging; all home charging is modeled at night.', 'หากเว้นว่าง สมมติว่าชาร์จกลางวัน 0% โดยจำลองการชาร์จที่บ้านทั้งหมดในช่วงกลางคืน'))}
      </>}
      {answers.daytimeLoads?.includes('pump') && <>
        <EnergyNumberField label={t('Existing pump electric input (kW)', 'กำลังไฟฟ้าของปั๊มเดิม (kW)')} value={answers.pumpPowerKw} min={0.01} max={100} onChange={value => onChange('pumpPowerKw', value)} />
        <EnergyNumberField label={t('Existing pump operating time (hours/day)', 'เวลาเดินปั๊มเดิม (ชั่วโมง/วัน)')} value={answers.pumpHoursPerDay} max={24} onChange={value => onChange('pumpHoursPerDay', value)} />
        <EnergyNumberField label={t('Existing pump daily start time (hour, optional)', 'เวลาเริ่มเดินปั๊มเดิมในแต่ละวัน (ชั่วโมง ถ้าทราบ)')} value={answers.pumpStartHour} max={23.99} onChange={value => onChange('pumpStartHour', value)} hint={t('If blank, assume 10:00. For example, 13.5 means 13:30; use the actual timer setting if known.', 'หากเว้นว่าง สมมติเริ่มเวลา 10:00 น. เช่น 13.5 หมายถึง 13:30 น. หากทราบให้ใช้เวลาตั้งจริงของปั๊ม')} />
      </>}
    </div>
  </fieldset>;

  return <fieldset className="inline-followup">
    <legend>{t('Roof capacity and project limits (optional)', 'พื้นที่หลังคาและข้อจำกัดโครงการ (ถ้าทราบ)')}</legend>
    <div className="grid accuracy-fields">
      <EnergyNumberField label={t('Usable roof area for solar (m²)', 'พื้นที่หลังคาที่ใช้ติดโซลาร์ได้ (ตร.ม.)')} value={answers.exactRoofAreaSqm} min={0.1} max={100000} onChange={value => onChange('exactRoofAreaSqm', value)} hint={t('Exclude obstructions and areas that must remain clear.', 'หักพื้นที่สิ่งกีดขวางและส่วนที่ต้องเว้นว่างแล้ว')} />
      <label>{t('Electricity phase', 'ระบบไฟฟ้า')}<select value={answers.electricityPhase ?? 'unsure'} onChange={event => onChange('electricityPhase', event.currentTarget.value as EstimateAnswers['electricityPhase'])}>
        <option value="unsure">{t('Not sure', 'ไม่แน่ใจ')}</option><option value="single">{t('Single phase', '1 เฟส')}</option><option value="three">{t('Three phase', '3 เฟส')}</option>
      </select></label>
      <EnergyNumberField label={t('Maximum installed-system budget (THB, optional)', 'งบสูงสุดสำหรับระบบรวมติดตั้ง (บาท ถ้าทราบ)')} value={answers.budgetThb} min={1} max={100000000} step={1} onChange={value => onChange('budgetThb', value)} />
    </div>
  </fieldset>;
}
