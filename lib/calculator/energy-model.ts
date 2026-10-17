import type { DaytimePattern } from './types';
import { solarResourceV3, solarResourceMonthlyShares } from '@/config/solar-resource-v3';

/** A reproducible synthetic hourly scenario, not metered demand or site weather. */
export const ENERGY_MODEL_VERSION = 'synthetic-hourly-th-v3-pvgis-era5-2026-10-17';
export const MONTHLY_PRODUCTION_SHARES = solarResourceMonthlyShares;
export const REFERENCE_ANNUAL_YIELD_KWH_PER_KWP = solarResourceV3.annualYieldKwhPerKwp;

export type ScheduledLoad = {
  kind: 'ev';
  /** Charging energy at the wall, before the fraction charged at home. */
  monthlyKwh: number;
  homeChargingFraction?: number;
  /** Portion of home charging allocated to 09:00–17:00, remainder 20:00–06:00. */
  daytimeFraction: number;
  days?: 'all' | 'weekdays' | 'weekends';
} | {
  kind: 'air-conditioning' | 'pump';
  /** Average electric input while running, including cycling; not thermal BTU/kW. */
  powerKw: number;
  units: number;
  hoursPerDay: number;
  startHour: number;
  days?: 'all' | 'weekdays' | 'weekends';
};

export type FutureLoadIncrement = ScheduledLoad & {
  /** 1=January; active from the beginning of this month. */
  startMonth: number;
  startYearOffset?: number;
};

export type EnergyModelInput = {
  monthlyConsumptionKwh: readonly number[];
  weekdayPattern: DaytimePattern;
  weekendPattern: DaytimePattern;
  existingLoads?: readonly ScheduledLoad[];
  futureLoads?: readonly FutureLoadIncrement[];
  /** Retained for traceability only: province does not select measured solar data. */
  province?: string;
  dcKwp: number;
  inverterAcKw?: number;
  panelTiltDegrees?: number;
  /** Compass bearing: north=0, east=90, south=180, west=270. Ignored at zero tilt. */
  panelAzimuthDegrees?: number;
  shadeFactor?: number;
  degradationFactor?: number;
  /** Reuse this representative calendar every lifetime year to avoid calendar confounding. */
  calendarYear?: number;
  yearOffset?: number;
};

export type EnergyBalance = {
  demandKwh: number;
  generationKwh: number;
  selfConsumedKwh: number;
  gridImportKwh: number;
  surplusKwh: number;
};
export type EnergyMonth = EnergyBalance & {
  month: number;
  baselineDemandKwh: number;
  existingScheduledKwh: number;
  futureDemandKwh: number;
  clippedGenerationKwh: number;
};
export type EnergyInterval = EnergyBalance & { startDateTime: string; durationHours: 1 };
export type EnergyYearResult = {
  version: string;
  monthly: EnergyMonth[];
  totals: EnergyBalance & { baselineDemandKwh: number; futureDemandKwh: number; clippedGenerationKwh: number };
  intervals?: EnergyInterval[];
  diagnostics: string[];
  assumptions: string[];
};

const DAYTIME_SHARE: Record<DaytimePattern, number> = { 'very-low': 0.12, low: 0.25, moderate: 0.4, high: 0.55, 'very-high': 0.7 };
const rad = (degrees: number) => degrees * Math.PI / 180;
const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0);
const nonnegative = (n: number, name: string) => {
  if (!Number.isFinite(n) || n < 0) throw new RangeError(`${name} must be finite and non-negative`);
  return n;
};
const fraction = (n: number, name: string) => {
  nonnegative(n, name);
  if (n > 1) throw new RangeError(`${name} must be between 0 and 1`);
  return n;
};
const normalize = (values: number[]) => { const total = sum(values); return values.map(value => total ? value / total : 0); };
const blankBalance = (): EnergyBalance => ({ demandKwh: 0, generationKwh: 0, selfConsumedKwh: 0, gridImportKwh: 0, surplusKwh: 0 });
const balanceKeys = ['demandKwh', 'generationKwh', 'selfConsumedKwh', 'gridImportKwh', 'surplusKwh'] as const;

function baselineShape(pattern: DaytimePattern) {
  const daylight = DAYTIME_SHARE[pattern];
  if (daylight === undefined) throw new RangeError('Unknown daytime pattern');
  const day = normalize(Array.from({ length: 24 }, (_, h) => h >= 8 && h < 18 ? 1 + 0.3 * Math.cos((h - 12.5) * Math.PI / 10) : 0));
  const night = normalize(Array.from({ length: 24 }, (_, h) => h >= 8 && h < 18 ? 0 : h >= 18 && h < 23 ? 2 : 0.7));
  return day.map((value, h) => daylight * value + (1 - daylight) * night[h]);
}

function scheduledShape(load: ScheduledLoad, weekends: readonly boolean[], previousWeekend: boolean, allowPreviousDay = true) {
  if (load.days && !['all', 'weekdays', 'weekends'].includes(load.days)) throw new RangeError('Unknown schedule day selection');
  const applies = (weekend: boolean) => !load.days || load.days === 'all' || (load.days === 'weekends' ? weekend : !weekend);
  if (load.kind === 'ev') {
    nonnegative(load.monthlyKwh, 'EV monthly kWh');
    const atHome = fraction(load.homeChargingFraction ?? 1, 'EV home charging fraction');
    const daytime = fraction(load.daytimeFraction, 'EV daytime fraction');
    const day = normalize(Array.from({ length: 24 }, (_, h) => h >= 9 && h < 17 ? 1 : 0));
    const night = normalize(Array.from({ length: 24 }, (_, h) => h >= 20 || h < 6 ? 1 : 0));
    const eligibleDays = weekends.filter(applies).length;
    return weekends.flatMap(weekend => day.map((value, h) => applies(weekend) && eligibleDays ? load.monthlyKwh * atHome / eligibleDays * (value * daytime + night[h] * (1 - daytime)) : 0));
  }
  nonnegative(load.powerKw, 'Load power');
  nonnegative(load.units, 'Load units');
  nonnegative(load.hoursPerDay, 'Load hours');
  nonnegative(load.startHour, 'Load start hour');
  if (load.hoursPerDay > 24 || load.startHour >= 24) throw new RangeError('Schedule requires hours <=24 and start hour <24');
  const shape = Array<number>(weekends.length * 24).fill(0);
  // Schedules belong to their start day. A Friday-night run can finish Saturday.
  // Include the preceding month's carry-in only if the load was already active.
  for (let day = allowPreviousDay ? -1 : 0; day < weekends.length; day++) {
    if (!applies(day < 0 ? previousWeekend : weekends[day])) continue;
    let remaining = load.hoursPerDay;
    let cursor = load.startHour;
    while (remaining > 1e-10) {
      const duration = Math.min(1 - (cursor % 1), remaining);
      const index = day * 24 + Math.floor(cursor);
      if (index >= 0 && index < shape.length) shape[index] += duration * load.powerKw * load.units;
      cursor += duration;
      remaining -= duration;
    }
  }
  return shape;
}

/** Reference geometry at Bangkok latitude. No coordinates/address enter this model. */
function solarShape(monthIndex: number, tilt: number, azimuth: number) {
  const latitude = rad(solarResourceV3.latitudeDegrees);
  const midMonthDay = [15, 46, 74, 105, 135, 166, 196, 227, 258, 288, 319, 349][monthIndex];
  const declination = rad(23.45 * Math.sin(2 * Math.PI * (284 + midMonthDay) / 365));
  const beta = rad(tilt);
  const bearing = rad(azimuth);
  return Array.from({ length: 24 }, (_, h) => {
    // The representative daylight window is 06:00–18:00 solar time.
    if (h < 6 || h >= 18) return 0;
    const hourAngle = rad(15 * (h + 0.5 - 12));
    const east = -Math.cos(declination) * Math.sin(hourAngle);
    const north = Math.cos(latitude) * Math.sin(declination) - Math.sin(latitude) * Math.cos(declination) * Math.cos(hourAngle);
    const up = Math.sin(latitude) * Math.sin(declination) + Math.cos(latitude) * Math.cos(declination) * Math.cos(hourAngle);
    if (up <= 0) return 0;
    const beam = Math.max(0, east * Math.sin(beta) * Math.sin(bearing) + north * Math.sin(beta) * Math.cos(bearing) + up * Math.cos(beta));
    return 0.7 * beam + 0.3 * up * (1 + Math.cos(beta)) / 2;
  });
}

/** Hourly demand/generation matching; existing appliances never add bill-included kWh. */
export function modelEnergyYear(input: EnergyModelInput, options: { includeIntervals?: boolean } = {}): EnergyYearResult {
  if (input.monthlyConsumptionKwh.length !== 12) throw new RangeError('Exactly 12 monthly consumption values are required');
  for (const value of input.monthlyConsumptionKwh) nonnegative(value, 'Monthly consumption');
  nonnegative(input.dcKwp, 'DC capacity');
  const acKw = input.inverterAcKw === undefined ? Infinity : nonnegative(input.inverterAcKw, 'AC capacity');
  const shade = fraction(input.shadeFactor ?? 1, 'Shade factor');
  const degradation = fraction(input.degradationFactor ?? 1, 'Degradation factor');
  const tilt = input.panelTiltDegrees ?? 15;
  const azimuth = input.panelAzimuthDegrees ?? 180;
  if (!Number.isFinite(tilt) || tilt < 0 || tilt > 90 || !Number.isFinite(azimuth)) throw new RangeError('Invalid panel geometry');
  const calendarYear = input.calendarYear ?? 2027;
  const yearOffset = input.yearOffset ?? 0;
  if (!Number.isInteger(calendarYear) || calendarYear < 2000 || calendarYear > 2200 || !Number.isInteger(yearOffset) || yearOffset < 0) throw new RangeError('Invalid model year');
  for (const future of input.futureLoads ?? []) {
    if (!Number.isInteger(future.startMonth) || future.startMonth < 1 || future.startMonth > 12 || !Number.isInteger(future.startYearOffset ?? 0) || (future.startYearOffset ?? 0) < 0) throw new RangeError('Invalid future load start month/year');
  }
  const weekdayShape = baselineShape(input.weekdayPattern);
  const weekendShape = baselineShape(input.weekendPattern);
  const diagnostics: string[] = [];
  const monthly: EnergyMonth[] = [];
  const intervals: EnergyInterval[] | undefined = options.includeIntervals ? [] : undefined;
  for (let month = 0; month < 12; month++) {
    const days = new Date(Date.UTC(calendarYear, month + 1, 0)).getUTCDate();
    const weekends = Array.from({ length: days }, (_, day) => [0, 6].includes(new Date(Date.UTC(calendarYear, month, day + 1)).getUTCDay()));
    const previousWeekend = [0, 6].includes(new Date(Date.UTC(calendarYear, month, 0)).getUTCDay());
    const hours = days * 24;
    const baseline = input.monthlyConsumptionKwh[month];
    const existing = Array<number>(hours).fill(0);
    for (const load of input.existingLoads ?? []) scheduledShape(load, weekends, previousWeekend).forEach((value, h) => { existing[h] += value; });
    const requestedExisting = sum(existing);
    const existingScale = requestedExisting > baseline && requestedExisting > 0 ? baseline / requestedExisting : 1;
    if (existingScale < 1) diagnostics.push(`month-${month + 1}:existing-schedules-scaled-to-bill`);
    const existingTotal = requestedExisting * existingScale;
    const residual = Math.max(0, baseline - existingTotal);
    const future = Array<number>(hours).fill(0);
    for (const load of input.futureLoads ?? []) {
      const startYear = load.startYearOffset ?? 0;
      if (yearOffset < startYear || (yearOffset === startYear && month + 1 < load.startMonth)) continue;
      const alreadyActive = yearOffset > startYear || month + 1 > load.startMonth;
      scheduledShape(load, weekends, previousWeekend, alreadyActive).forEach((value, h) => { future[h] += value; });
    }
    const generationShape = solarShape(month, tilt, azimuth);
    const referenceShapeTotal = sum(solarShape(month, 15, 180));
    // PVGIS E_y already includes its configured 14% system loss and modeled losses.
    // Apply no second generic system-loss factor to this net production reference.
    const kwhPerShapeUnit = REFERENCE_ANNUAL_YIELD_KWH_PER_KWP * MONTHLY_PRODUCTION_SHARES[month] * input.dcKwp * shade * degradation / days / referenceShapeTotal;
    const result: EnergyMonth = { month: month + 1, ...blankBalance(), baselineDemandKwh: baseline, existingScheduledKwh: existingTotal, futureDemandKwh: sum(future), clippedGenerationKwh: 0 };
    for (let h = 0; h < hours; h++) {
      const hour = h % 24;
      const dayIndex = Math.floor(h / 24);
      const demandKwh = residual / days * (weekends[dayIndex] ? weekendShape[hour] : weekdayShape[hour]) + existing[h] * existingScale + future[h];
      const unclipped = generationShape[hour] * kwhPerShapeUnit;
      const generationKwh = Math.min(unclipped, acKw);
      const selfConsumedKwh = Math.min(demandKwh, generationKwh);
      const interval: EnergyBalance = { demandKwh, generationKwh, selfConsumedKwh, gridImportKwh: demandKwh - selfConsumedKwh, surplusKwh: generationKwh - selfConsumedKwh };
      balanceKeys.forEach(key => { result[key] += interval[key]; });
      result.clippedGenerationKwh += unclipped - generationKwh;
      if (intervals) intervals.push({ ...interval, startDateTime: `${calendarYear}-${String(month + 1).padStart(2, '0')}-${String(dayIndex + 1).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00+07:00`, durationHours: 1 });
    }
    monthly.push(result);
  }
  const totals = { ...blankBalance(), baselineDemandKwh: 0, futureDemandKwh: 0, clippedGenerationKwh: 0 };
  monthly.forEach(month => {
    balanceKeys.forEach(key => { totals[key] += month[key]; });
    totals.baselineDemandKwh += month.baselineDemandKwh;
    totals.futureDemandKwh += month.futureDemandKwh;
    totals.clippedGenerationKwh += month.clippedGenerationKwh;
  });
  return {
    version: ENERGY_MODEL_VERSION, monthly, totals, ...(intervals ? { intervals } : {}), diagnostics,
    assumptions: [
      'Synthetic hourly demand from monthly kWh and weekday/weekend answers; not measured interval data.',
      'Existing appliance schedules reallocate the bill baseline; only quantified future loads add energy.',
      `JRC PVGIS 5.3 ERA5 reference: ${REFERENCE_ANNUAL_YIELD_KWH_PER_KWP} kWh/kWp/year at 13.75N/100.5E, 15-degree south-facing, building-integrated c-Si; weather 2005–2023; 14% configured system loss already included.`,
      'Monthly shares come from the stored JRC response, normalized from 1398.22 rounded monthly kWh to the 1398.23 annual output. Synthetic hourly disaggregation and 70% beam/30% diffuse adjustments for other panel planes are unvalidated approximations.',
      'Representative Bangkok latitude, fixed solar-time daylight 06:00–18:00, repeated mean day within each month.',
      'Province/address/coordinates do not personalize irradiance; panel plane is separate from roof geometry.',
      'No battery, no sub-hourly peaks, no outage/curtailment model; surplus is unvalued unless separately approved.',
    ],
  };
}
