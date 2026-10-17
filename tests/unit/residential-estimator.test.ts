import { describe, expect, it } from 'vitest';
import { legacyResidentialEstimator as residentialEstimator } from '@/lib/calculator/legacy-residential-estimator';
import { residentialEstimator as modernEstimator } from '@/lib/calculator/residential-estimator';
import { solarPackages } from '@/config/solar-packages';
import type { EstimateAnswers } from '@/lib/calculator/types';

const base: EstimateAnswers = {
  province: 'bangkok',
  district: 'sathon',
  monthlyBillThb: 6000,
  activelyPlanningSolar: true,
  planningTimeframe: 'within-3-months',
  projectType: 'new-rooftop',
  propertyType: 'detached-home',
  ownershipStatus: 'owner',
  roofArea: '60-100',
  daytimePattern: 'high',
  daytimeLoads: ['air-conditioning', 'pump', 'home-office-equipment'],
  airConditionerCount: 5,
  roofMaterial: 'concrete-tile',
  shade: 'almost-none',
  installationTimeframe: 'one-three-months',
  quoteContactRequested: false,
};

describe('frozen legacy Thailand bill-led planning estimator', () => {
  it('always returns every headline metric after the required eight answers', () => {
    const result = residentialEstimator.calculate(base);
    for (const value of [
      result.planningSystemKw,
      result.planningAnnualProductionKwh,
      result.planningMonthlySavingsThb,
      result.planningInstalledCostThb,
      result.planningPaybackYears,
      result.planningTwentyFiveYearNetBenefitThb,
    ]) {
      expect(typeof value).toBe('number');
      if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true);
    }
    expect(result.trace.length).toBeGreaterThanOrEqual(6);
  });

  it('supports large bills without a ฿50,000 calculation cap', () => {
    const medium = residentialEstimator.calculate({ ...base, monthlyBillThb: 85000, propertyType: 'large-home', roofArea: 'over-200', daytimePattern: 'very-high' });
    const large = residentialEstimator.calculate({ ...base, monthlyBillThb: 250000, propertyType: 'large-home', roofArea: 'over-200', daytimePattern: 'very-high' });
    expect(medium.estimatedMonthlyConsumptionKwh).toBeGreaterThan(10000);
    expect(large.estimatedMonthlyConsumptionKwh).toBeGreaterThan(medium.estimatedMonthlyConsumptionKwh);
    expect(large.planningSystemKw).toBeGreaterThanOrEqual(medium.planningSystemKw);
  });

  it('does not enlarge the starting system to compensate for shade', () => {
    const clear = residentialEstimator.calculate(base);
    const shaded = residentialEstimator.calculate({ ...base, shade: 'a-lot' });
    expect(shaded.planningSystemKw).toBe(clear.planningSystemKw);
    expect(shaded.planningAnnualProductionKwh).toBeLessThan(clear.planningAnnualProductionKwh);
    expect(shaded.recommendation).toBe('site-check-first');
  });

  it('uses optional roof details to recalculate production', () => {
    const south = residentialEstimator.calculate({ ...base, roofDirection: 'south-group', roofSlope: 'gentle' });
    const northSteep = residentialEstimator.calculate({ ...base, roofDirection: 'north', roofSlope: 'steep' });
    expect(northSteep.planningAnnualProductionKwh).toBeLessThan(south.planningAnnualProductionKwh);
  });

  it('uses stated roof area as a real constraint', () => {
    const unsure = residentialEstimator.calculate({ ...base, monthlyBillThb: 15000, roofArea: 'unsure' });
    const small = residentialEstimator.calculate({ ...base, monthlyBillThb: 15000, roofArea: 'under-30' });
    expect(small.planningSystemKw).toBeLessThan(unsure.planningSystemKw);
    expect(small.roofFeasibility).toBe('limited');
  });

  it('uses the daytime-use answer to moderate installed-appliance effects', () => {
    const veryLowWithoutHighUse = residentialEstimator.calculate({ ...base, daytimePattern: 'very-low', daytimeLoads: ['none'], airConditionerCount: undefined });
    const veryLowWithInstalledHighUse = residentialEstimator.calculate({ ...base, daytimePattern: 'very-low', daytimeLoads: ['ev', 'other-high-use'], airConditionerCount: undefined });
    const veryHighWithoutHighUse = residentialEstimator.calculate({ ...base, daytimePattern: 'very-high', daytimeLoads: ['none'], airConditionerCount: undefined });
    const veryHighWithInstalledHighUse = residentialEstimator.calculate({ ...base, daytimePattern: 'very-high', daytimeLoads: ['ev', 'other-high-use'], airConditionerCount: undefined });

    expect(veryLowWithInstalledHighUse.loadProfile).toBe('low');
    expect(veryLowWithInstalledHighUse.planningMonthlySavingsThb).toBe(veryLowWithoutHighUse.planningMonthlySavingsThb);
    expect(veryHighWithInstalledHighUse.loadProfile).toBe('high');
    expect(veryHighWithInstalledHighUse.planningMonthlySavingsThb).toBeGreaterThan(veryHighWithoutHighUse.planningMonthlySavingsThb);
  });

  it('lets exact roof area and future loads update the result', () => {
    const limited = residentialEstimator.calculate({ ...base, monthlyBillThb: 15000, exactRoofAreaSqm: 22 });
    const future = residentialEstimator.calculate({ ...base, monthlyBillThb: 15000, roofArea: 'over-200', futureLoads: ['ev'] });
    const present = residentialEstimator.calculate({ ...base, monthlyBillThb: 15000, roofArea: 'over-200', futureLoads: ['none'] });
    expect(limited.planningSystemKw).toBeLessThan(present.planningSystemKw);
    expect(future.planningSystemKw).toBeGreaterThanOrEqual(present.planningSystemKw);
  });

  it('uses a comparable battery-free quote but rejects battery-inclusive price as a solar-only anchor', () => {
    const comparable = residentialEstimator.calculate({ ...base, quoteSystemKw: 6, quoteCashPriceThb: 222000, quoteBatteryIncluded: false });
    const battery = residentialEstimator.calculate({ ...base, quoteSystemKw: 6, quoteCashPriceThb: 600000, quoteBatteryIncluded: true });
    expect(comparable.planningInstalledCostThb).toBe(220000);
    expect(battery.planningInstalledCostThb).not.toBe(600000);
  });

  it('includes the annual maintenance and component reserve in the 25-year cash path', () => {
    const result = residentialEstimator.calculate(base);
    expect(result.lifetimeCostSeries).toHaveLength(26);
    expect(result.lifetimeCostSeries[25].withSolarThb).toBeGreaterThan(result.planningInstalledCostThb);
  });

  it('does not manufacture a payback denominator when annual value is below the reserve', () => {
    const result = residentialEstimator.calculate({ ...base, monthlyBillThb: 100, daytimePattern: 'very-low', daytimeLoads: ['none'], airConditionerCount: undefined });
    expect(result.planningPaybackYears).toBeNull();
    expect(result.estimatedPaybackYears).toBeNull();
  });

  it('uses single phase as the conservative residential default when phase is unsure', () => {
    const unsure = residentialEstimator.calculate({ ...base, electricityPhase: 'unsure' });
    const single = residentialEstimator.calculate({ ...base, electricityPhase: 'single' });
    expect(unsure.planningInstalledCostThb).toBe(single.planningInstalledCostThb);
  });

  it('keeps the visible ฿4,800 Bangkok example internally reconciled', () => {
    const result = residentialEstimator.calculate({
      ...base,
      monthlyBillThb: 4800,
      roofArea: undefined,
      daytimePattern: 'moderate',
      daytimeLoads: ['air-conditioning'],
      airConditionerCount: 4,
    });
    expect(result.tariffVersion).toContain('mea');
    expect(result.planningSystemKw).toBe(3);
    expect(result.planningInstalledCostThb).toBe(130000);
    expect(result.planningMonthlySavingsThb).toBeGreaterThanOrEqual(980);
    expect(result.planningMonthlySavingsThb).toBeLessThanOrEqual(990);
    expect(result.planningBillReductionPct).toBe(20.5);
    expect(result.planningAnnualMaintenanceReserveThb).toBe(1326);
    expect(result.planningPaybackYears).toBe(12.4);
    expect(result.lifetimeCostSeries[25]?.withoutSolarThb).toBe(1440000);
    expect(result.lifetimeCostSeries[25]?.withSolarThb).toBeGreaterThanOrEqual(1324000);
    expect(result.lifetimeCostSeries[25]?.withSolarThb).toBeLessThanOrEqual(1326000);
    expect(result.planningTwentyFiveYearNetBenefitThb).toBe(115000);
  });
});

describe('modern residential hourly estimator integration', () => {
  const modern: EstimateAnswers = { ...base, estimateModelVersion: 'energy-v3',
    calculationReferenceDate: '2026-10-17', consumptionInput: 'kwh', monthlyConsumptionKwh: 1_200,
    billingPeriodDays: 30, tariffCategory: 'ordinary-1.2', utility: 'MEA',
    exactRoofAreaSqm: 100, electricityPhase: 'three' };

  it('uses actual kWh and finite evidenced equipment rather than scaling a price curve from the bill', () => {
    const normal = modernEstimator.calculate(modern);
    const changedMoneyOnly = modernEstimator.calculate({ ...modern, monthlyBillThb: 500_000 });
    expect(normal.modelVersion).toBe('residential-hourly-2026-10-17-v3');
    expect(normal.calculationReferenceDate).toBe('2026-10-17');
    expect(normal.candidateSystems?.map(candidate => candidate.id)).toEqual(solarPackages.map(item => item.id));
    expect(normal.selectedSystem?.feasible).toBe(true);
    expect(solarPackages.some(item => item.dcKwp === normal.planningSystemKw)).toBe(true);
    expect(changedMoneyOnly.energy).toEqual(normal.energy);
    expect(changedMoneyOnly.planningMonthlySavingsThb).toBe(normal.planningMonthlySavingsThb);
    expect(normal.energy!.generationKwh).toBeCloseTo(normal.energy!.selfConsumedKwh + normal.energy!.surplusKwh, 6);
    expect(normal.energy!.demandKwh).toBeCloseTo(normal.energy!.selfConsumedKwh + normal.energy!.gridImportKwh, 6);
  });

  it('reports no feasible package on a tiny roof rather than shrinking an arbitrary system', () => {
    const result = modernEstimator.calculate({ ...modern, exactRoofAreaSqm: 1 });
    expect(result.modelStatus).toBe('no-feasible-option');
    expect(result.selectedSystem).toBeUndefined();
    expect(result.planningSystemKw).toBe(0);
    expect(result.planningPaybackYears).toBeNull();
    expect(result.candidateSystems?.every(candidate => !candidate.feasible)).toBe(true);
  });

  it('evaluates a quote at its exact cash price and reconciles reserves with lifetime benefit', () => {
    const result = modernEstimator.calculate({ ...modern, quoteSystemKw: 5.5, quoteModuleCount: 10,
      quoteModuleWp: 550, quoteInverterAcKw: 5, quoteCashPriceThb: 150_123.45, quoteBatteryIncluded: false });
    expect(result.selectedSystem?.id).toBe('user-quotation');
    expect(result.planningInstalledCostThb).toBe(150_123.45);
    expect(result.selectedSystem?.inverterAcKw).toBe(5);
    expect(result.planningAnnualMaintenanceReserveThb).toBeCloseTo(150_123.45 * 0.0102, 8);
    expect(result.lifetimeCostSeries).toHaveLength(26);
    const final = result.lifetimeCostSeries[25];
    expect(final.withoutSolarThb - final.withSolarThb).toBeCloseTo(result.planningTwentyFiveYearNetBenefitThb, 6);
  });

  it('does not add guessed EV energy or silently treat battery and TOU projects as ordinary solar', () => {
    const labelled = modernEstimator.calculate({ ...modern, futureLoads: ['ev'] });
    expect(labelled.energy?.futureDemandKwh).toBe(0);
    expect(labelled.warnings?.some(warning => warning.code === 'future-unquantified')).toBe(true);
    const battery = modernEstimator.calculate({ ...modern, projectType: 'solar-with-battery' });
    const tou = modernEstimator.calculate({ ...modern, tariffCategory: 'tou' });
    expect(battery.modelStatus).toBe('unsupported');
    expect(tou.modelStatus).toBe('unsupported');
    expect(battery.selectedSystem).toBeUndefined();
    expect(tou.selectedSystem).toBeUndefined();
    expect(battery.planningPaybackYears).toBeNull();
  });
});
