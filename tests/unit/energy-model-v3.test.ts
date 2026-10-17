import { describe, expect, it } from 'vitest';
import { modelEnergyYear, type EnergyModelInput } from '@/lib/calculator/energy-model';
import { solarPackages } from '@/config/solar-packages';
import { solarResourceV3, solarResourceMonthlyShares } from '@/config/solar-resource-v3';
import solarResourceSnapshot from '@/docs/calculator-v3/pvgis-era5-bangkok-2026-10-17.json';

const base: EnergyModelInput = {
  monthlyConsumptionKwh: Array(12).fill(500), weekdayPattern: 'low', weekendPattern: 'high',
  dcKwp: 3.3, inverterAcKw: 3, panelTiltDegrees: 15, panelAzimuthDegrees: 180,
};

describe('v3 synthetic hourly energy matching', () => {
  it('conserves both demand and generation in every interval and month, with no night generation', () => {
    const result = modelEnergyYear(base, { includeIntervals: true });
    expect(result.intervals).toHaveLength(8760);
    for (const interval of result.intervals!) {
      expect(interval.demandKwh).toBeCloseTo(interval.selfConsumedKwh + interval.gridImportKwh, 12);
      expect(interval.generationKwh).toBeCloseTo(interval.selfConsumedKwh + interval.surplusKwh, 12);
      expect(interval.selfConsumedKwh).toBeGreaterThanOrEqual(0);
      expect(interval.generationKwh).toBeLessThanOrEqual(3);
      const hour = Number(interval.startDateTime.slice(11, 13));
      if (hour < 6 || hour >= 18) expect(interval.generationKwh).toBe(0);
    }
    for (const month of result.monthly) {
      expect(month.demandKwh).toBeCloseTo(500, 8);
      expect(month.demandKwh).toBeCloseTo(month.selfConsumedKwh + month.gridImportKwh, 8);
      expect(month.generationKwh).toBeCloseTo(month.selfConsumedKwh + month.surplusKwh, 8);
    }
    expect(result.totals.demandKwh).toBeCloseTo(6000, 8);
  });

  it('reproduces the stored primary JRC reference and its explicit monthly rounding reconciliation before clipping', () => {
    expect(solarResourceSnapshot.inputs.location).toEqual({ latitude: 13.75, longitude: 100.5, elevation: 9 });
    expect(solarResourceSnapshot.inputs.meteo_data).toEqual({ radiation_db: 'PVGIS-ERA5', meteo_db: 'ERA5', year_min: 2005, year_max: 2023, use_horizon: true, horizon_db: 'DEM-calculated' });
    expect(solarResourceSnapshot.inputs.pv_module).toEqual({ technology: 'c-Si', peak_power: 1, system_loss: 14 });
    expect(solarResourceSnapshot.inputs.mounting_system.fixed).toEqual({ slope: { value: 15, optimal: false }, azimuth: { value: 0, optimal: false }, type: 'building-integrated' });
    expect(solarResourceSnapshot.outputs.totals.fixed.E_y).toBe(1398.23);
    expect(solarResourceSnapshot.outputs.monthly.fixed.map(month => month.E_m)).toEqual([131.07, 123.93, 137.39, 125.83, 114.89, 104.78, 101.73, 105.48, 99.74, 109.5, 116.88, 127]);
    expect(solarResourceV3.annualYieldKwhPerKwp).toBe(solarResourceSnapshot.outputs.totals.fixed.E_y);
    expect(solarResourceV3.monthlyYieldKwhPerKwp).toEqual(solarResourceSnapshot.outputs.monthly.fixed.map(month => month.E_m));
    expect(solarResourceMonthlyShares.reduce((total, value) => total + value, 0)).toBeCloseTo(1, 12);
    const result = modelEnergyYear({ ...base, dcKwp: 1, inverterAcKw: undefined });
    expect(result.totals.generationKwh).toBeCloseTo(1398.23, 8);
    const roundingReconciliation = 1398.23 / 1398.22;
    result.monthly.forEach((month, index) => expect(month.generationKwh).toBeCloseTo(solarResourceSnapshot.outputs.monthly.fixed[index].E_m * roundingReconciliation, 8));
    // This independently catches accidentally applying the configured 14% loss twice.
    expect(result.totals.generationKwh).not.toBeCloseTo(1398.23 * 0.86, 1);
  });

  it('uses each monthly baseline and distinct weekday/weekend patterns', () => {
    const result = modelEnergyYear({ ...base, monthlyConsumptionKwh: Array.from({ length: 12 }, (_, i) => 100 + i * 20), weekdayPattern: 'very-low', weekendPattern: 'very-high' }, { includeIntervals: true });
    result.monthly.forEach((month, index) => expect(month.demandKwh).toBeCloseTo(100 + index * 20, 8));
    const weekdayNoon = result.intervals!.find(i => i.startDateTime === '2027-01-04T12:00:00+07:00')!;
    const weekendNoon = result.intervals!.find(i => i.startDateTime === '2027-01-02T12:00:00+07:00')!;
    expect(weekendNoon.demandKwh).toBeGreaterThan(weekdayNoon.demandKwh);
  });

  it('reallocates existing AC/EV/pump consumption instead of adding it to the bill', () => {
    const result = modelEnergyYear({ ...base, existingLoads: [
      { kind: 'air-conditioning', powerKw: 0.8, units: 2, hoursPerDay: 3, startHour: 12 },
      { kind: 'ev', monthlyKwh: 100, homeChargingFraction: 0.5, daytimeFraction: 0 },
      { kind: 'pump', powerKw: 0.5, units: 1, hoursPerDay: 1, startHour: 8 },
    ] });
    expect(result.totals.demandKwh).toBeCloseTo(6000, 8);
    expect(result.monthly[0].existingScheduledKwh).toBeCloseTo(31 * 5.3 + 50, 8);
    expect(result.totals.futureDemandKwh).toBe(0);
  });

  it('scales contradictory appliance schedules down to bill kWh without negative residuals', () => {
    const result = modelEnergyYear({ ...base, monthlyConsumptionKwh: Array(12).fill(10), existingLoads: [{ kind: 'air-conditioning', powerKw: 3, units: 5, hoursPerDay: 24, startHour: 0 }] }, { includeIntervals: true });
    expect(result.diagnostics).toHaveLength(12);
    expect(result.totals.demandKwh).toBeCloseTo(120, 8);
    expect(result.monthly[0].existingScheduledKwh).toBeCloseTo(10, 8);
    expect(result.intervals!.every(interval => interval.demandKwh >= 0)).toBe(true);
  });

  it('adds only quantified future energy, beginning at its requested month and year', () => {
    const futureLoads: EnergyModelInput['futureLoads'] = [
      { kind: 'ev', monthlyKwh: 200, homeChargingFraction: 0.25, daytimeFraction: 0.5, startMonth: 7, startYearOffset: 1 },
      { kind: 'pump', powerKw: 1, units: 1, hoursPerDay: 2, startHour: 10, startMonth: 7, startYearOffset: 1 },
    ];
    expect(modelEnergyYear({ ...base, futureLoads }).totals.futureDemandKwh).toBe(0);
    const active = modelEnergyYear({ ...base, futureLoads, yearOffset: 1 });
    expect(active.monthly.slice(0, 6).every(month => month.futureDemandKwh === 0)).toBe(true);
    expect(active.monthly[6].futureDemandKwh).toBeCloseTo(50 + 31 * 2, 8);
    expect(active.totals.futureDemandKwh).toBeCloseTo(6 * 50 + 184 * 2, 8);
    expect(active.totals.demandKwh).toBeCloseTo(6000 + 668, 8);
    expect(modelEnergyYear({ ...base, futureLoads, yearOffset: 2 }).monthly[0].futureDemandKwh).toBeCloseTo(50 + 31 * 2, 8);
  });

  it('uses EV timing and home fraction to distinguish additional solar use from extra grid demand', () => {
    const future = { kind: 'ev' as const, monthlyKwh: 200, homeChargingFraction: 1, startMonth: 1 };
    const day = modelEnergyYear({ ...base, futureLoads: [{ ...future, daytimeFraction: 1 }] });
    const night = modelEnergyYear({ ...base, futureLoads: [{ ...future, daytimeFraction: 0 }] });
    const outside = modelEnergyYear({ ...base, futureLoads: [{ ...future, homeChargingFraction: 0, daytimeFraction: 1 }] });
    expect(day.totals.demandKwh).toBeCloseTo(night.totals.demandKwh, 8);
    expect(day.totals.selfConsumedKwh).toBeGreaterThan(night.totals.selfConsumedKwh);
    expect(night.totals.selfConsumedKwh).toBeCloseTo(outside.totals.selfConsumedKwh, 8);
    expect(outside.totals.futureDemandKwh).toBe(0);
  });

  it('handles fractional midnight schedules and weekday-only appliance energy', () => {
    const result = modelEnergyYear({ ...base, monthlyConsumptionKwh: Array(12).fill(0), futureLoads: [{ kind: 'pump', powerKw: 2, units: 1, hoursPerDay: 2.5, startHour: 23.5, days: 'weekdays', startMonth: 1 }] }, { includeIntervals: true });
    // January 2027 has 21 weekdays. Two kW × 2.5 hours is 5 kWh per selected day.
    expect(result.monthly[0].futureDemandKwh).toBeCloseTo(21 * 5, 8);
    // The final Friday's four kWh after midnight belong to the next model year.
    expect(result.totals.futureDemandKwh).toBeCloseTo(261 * 5 - 4, 8);
    const demandAt = (time: string) => result.intervals!.find(interval => interval.startDateTime === time)!.demandKwh;
    expect(demandAt('2027-01-01T01:00:00+07:00')).toBe(0); // not active the preceding month
    expect(demandAt('2027-01-02T01:00:00+07:00')).toBe(2); // Friday carry-over
    expect(demandAt('2027-01-04T01:00:00+07:00')).toBe(0); // Sunday did not start a run
  });

  it('makes a horizontal panel independent of azimuth and applies geometry only once', () => {
    const east = modelEnergyYear({ ...base, panelTiltDegrees: 0, panelAzimuthDegrees: 90 });
    const north = modelEnergyYear({ ...base, panelTiltDegrees: 0, panelAzimuthDegrees: 0 });
    expect(east.monthly).toEqual(north.monthly);
    expect(modelEnergyYear({ ...base, panelTiltDegrees: 45, panelAzimuthDegrees: 0 }).totals.generationKwh)
      .toBeLessThan(modelEnergyYear({ ...base, panelTiltDegrees: 45, panelAzimuthDegrees: 180 }).totals.generationKwh);
  });

  it('explicitly omits unsupported province personalization', () => {
    expect(modelEnergyYear({ ...base, province: 'bangkok' }).totals).toEqual(modelEnergyYear({ ...base, province: 'other' }).totals);
  });

  it('degrades generation before hourly matching rather than scaling savings', () => {
    const first = modelEnergyYear({ ...base, inverterAcKw: undefined });
    const degraded = modelEnergyYear({ ...base, inverterAcKw: undefined, degradationFactor: 0.8 });
    expect(degraded.totals.demandKwh).toBeCloseTo(first.totals.demandKwh, 8);
    expect(degraded.totals.generationKwh).toBeCloseTo(first.totals.generationKwh * 0.8, 8);
    expect(degraded.totals.selfConsumedKwh).toBeGreaterThan(first.totals.selfConsumedKwh * 0.8);
    expect(degraded.totals.gridImportKwh).toBeGreaterThanOrEqual(first.totals.gridImportKwh);
  });

  it('returns zero generation for zero capacity or full shade and validates malformed quantities', () => {
    expect(modelEnergyYear({ ...base, dcKwp: 0 }).totals.generationKwh).toBe(0);
    expect(modelEnergyYear({ ...base, shadeFactor: 0 }).totals.generationKwh).toBe(0);
    expect(() => modelEnergyYear({ ...base, monthlyConsumptionKwh: [1] })).toThrow();
    expect(() => modelEnergyYear({ ...base, dcKwp: Number.NaN })).toThrow();
    expect(() => modelEnergyYear({ ...base, futureLoads: [{ kind: 'ev', monthlyKwh: 1, daytimeFraction: 2, startMonth: 1 }] })).toThrow();
  });
});

describe('finite installer reference packages', () => {
  it('keeps module DC capacity, inverter AC and roof allowance distinct, with no tiny prorated options', () => {
    expect(solarPackages.length).toBe(4);
    for (const candidate of solarPackages) {
      expect(candidate.dcKwp).toBeCloseTo(candidate.moduleCount * candidate.moduleWp / 1000, 8);
      expect(candidate.dcKwp).toBeGreaterThanOrEqual(3);
      expect(candidate.requiredRoofAreaSqm).toBeGreaterThanOrEqual(candidate.publishedRoofAreaSqm);
      expect(candidate.requiredRoofAreaSqm + 1e-8).toBeGreaterThanOrEqual(candidate.dcKwp * 5.5);
      expect(candidate.planningPriceThb).toBeCloseTo(candidate.referencePriceThb * 1.07, 6);
      expect(candidate.sourceUrl).toMatch(/^https:\/\/www\.cxenertech\.com\//);
      expect(candidate.verifiedDate).toBe('2026-10-17');
    }
    expect(solarPackages[0].dcKwp).not.toBe(solarPackages[0].inverterAcKw);
  });
});
