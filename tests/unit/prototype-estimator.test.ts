import { describe, expect, it } from 'vitest';
import { prototypeEstimator } from '@/lib/calculator/prototype-estimator';
import type { EstimateAnswers } from '@/lib/calculator/types';

const base: EstimateAnswers = {
  province: 'bangkok',
  location: { address: '99 ถนนสุขุมวิท กรุงเทพมหานคร', latitude: 13.735, longitude: 100.58, province: 'bangkok', source: 'manual-map', confirmed: true },
  electricityInputKind: 'kwh',
  monthlyKwh: 1000,
  consumptionPeriod: 'average-12',
  tariffType: 'standard',
  daytimePattern: 'regular-loads',
  daytimeLoads: ['air-conditioning', 'pump', 'home-office'],
  acDaytimeHours: 'over-4',
  roofMaterial: 'concrete-tile',
  shade: 'none',
  roofDirection: 'south-group',
  roofSlope: 'gentle',
  roofArea: 'large',
  electricityPhase: 'single',
};

describe('Thailand planning estimator', () => {
  it('returns one planning value and a restrained up-to ceiling for strong evidence', () => {
    const result = prototypeEstimator.calculate(base);
    expect(result.confidence).toBe('high');
    expect(result.planningMonthlySavingsThb).toBeGreaterThan(0);
    expect(result.upToMonthlySavingsThb).toBeGreaterThan(result.planningMonthlySavingsThb ?? 0);
    expect(result.upToMonthlySavingsThb).toBeLessThanOrEqual((result.planningMonthlySavingsThb ?? 0) * 1.2);
    expect(result.estimatedExportRevenueThb).toBeNull();
    expect(result.estimatedTaxBenefitThb).toBeNull();
  });

  it('uses actual kWh and the progressive bill difference rather than a flat value per generated unit', () => {
    const lower = prototypeEstimator.calculate({ ...base, monthlyKwh: 500 });
    const higher = prototypeEstimator.calculate({ ...base, monthlyKwh: 1500 });
    expect(higher.currentMonthlyBillThb).toBeGreaterThan(lower.currentMonthlyBillThb);
    expect(higher.planningAnnualSavingsThb).toBeGreaterThan(lower.planningAnnualSavingsThb ?? 0);
  });

  it('does not enlarge the recommended system to compensate for shade', () => {
    const clear = prototypeEstimator.calculate({ ...base, shade: 'none' });
    const shaded = prototypeEstimator.calculate({ ...base, shade: 'heavy' });
    expect(shaded.planningSystemKw).toBe(clear.planningSystemKw);
    expect(shaded.planningAnnualProductionKwh).toBeLessThan(clear.planningAnnualProductionKwh);
  });

  it('suppresses up-to and narrow payback claims for heavy shade', () => {
    const result = prototypeEstimator.calculate({ ...base, shade: 'heavy' });
    expect(result.confidence).toBe('low');
    expect(result.upToMonthlySavingsThb).toBeNull();
    expect(result.planningPaybackYears).toBeNull();
    expect(result.improvementActions).toContain('site-survey');
  });

  it('withholds standard-tariff savings and payback for TOU or private billing', () => {
    for (const tariffType of ['tou', 'private'] as const) {
      const result = prototypeEstimator.calculate({ ...base, tariffType });
      expect(result.financialResultAvailable).toBe(false);
      expect(result.planningMonthlySavingsThb).toBeNull();
      expect(result.upToMonthlySavingsThb).toBeNull();
      expect(result.planningPaybackYears).toBeNull();
    }
  });

  it('applies orientation and slope without presenting degree-level precision', () => {
    const south = prototypeEstimator.calculate({ ...base, roofDirection: 'south-group', roofSlope: 'gentle' });
    const northSteep = prototypeEstimator.calculate({ ...base, roofDirection: 'north', roofSlope: 'steep' });
    expect(northSteep.planningAnnualProductionKwh).toBeLessThan(south.planningAnnualProductionKwh);
  });

  it('flags a roof-space mismatch without silently reducing the electricity-based target', () => {
    const unknownArea = prototypeEstimator.calculate({ ...base, roofArea: 'unknown' });
    const smallArea = prototypeEstimator.calculate({ ...base, roofArea: 'small' });
    expect(smallArea.planningSystemKw).toBe(unknownArea.planningSystemKw);
    expect(smallArea.roofFeasibility).toBe('check');
  });

  it('uses a comparable cash quote but excludes battery-inclusive prices from the solar-only comparison', () => {
    const comparable = prototypeEstimator.calculate({ ...base, quoteSystemKw: 6, quoteCashPriceThb: 222000, quoteBatteryIncluded: false });
    const battery = prototypeEstimator.calculate({ ...base, quoteSystemKw: 6, quoteCashPriceThb: 600000, quoteBatteryIncluded: true });
    expect(comparable.planningInstalledCostThb).toBe(220000);
    expect(battery.planningInstalledCostThb).not.toBe(600000);
  });

  it('uses phase-specific planning prices', () => {
    const single = prototypeEstimator.calculate({ ...base, electricityPhase: 'single' });
    const three = prototypeEstimator.calculate({ ...base, electricityPhase: 'three' });
    expect(three.planningInstalledCostThb).toBeGreaterThan(single.planningInstalledCostThb);
  });

  it('includes routine maintenance, degradation and a year-13 inverter reserve in long-term cash flow', () => {
    const result = prototypeEstimator.calculate(base);
    expect(result.lifetimeCostSeries).toHaveLength(26);
    const year11 = result.lifetimeCostSeries[11];
    const year12 = result.lifetimeCostSeries[12];
    const year13 = result.lifetimeCostSeries[13];
    expect(year13.withSolarHighThb - year12.withSolarHighThb).toBeGreaterThan(year12.withSolarHighThb - year11.withSolarHighThb);
  });
});
