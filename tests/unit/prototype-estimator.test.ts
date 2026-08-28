import { describe, expect, it } from 'vitest';
import { prototypeEstimator } from '@/lib/calculator/prototype-estimator';
import type { EstimateAnswers } from '@/lib/calculator/types';

const base: EstimateAnswers = {
  province: 'bangkok',
  monthlyBillThb: 6000,
  propertyType: 'detached-home',
  roofArea: '60-100',
  daytimePattern: 'high',
  daytimeLoads: ['air-conditioning', 'pump', 'office-equipment'],
  roofMaterial: 'concrete-tile',
  shade: 'almost-none',
};

describe('Thailand bill-led planning estimator', () => {
  it('always returns every headline metric after the required eight answers', () => {
    const result = prototypeEstimator.calculate(base);
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
    const medium = prototypeEstimator.calculate({ ...base, monthlyBillThb: 85000, propertyType: 'warehouse', roofArea: 'over-200', daytimePattern: 'very-high' });
    const large = prototypeEstimator.calculate({ ...base, monthlyBillThb: 250000, propertyType: 'warehouse', roofArea: 'over-200', daytimePattern: 'very-high' });
    expect(medium.estimatedMonthlyConsumptionKwh).toBeGreaterThan(10000);
    expect(large.estimatedMonthlyConsumptionKwh).toBeGreaterThan(medium.estimatedMonthlyConsumptionKwh);
    expect(large.planningSystemKw).toBeGreaterThanOrEqual(medium.planningSystemKw);
  });

  it('does not enlarge the starting system to compensate for shade', () => {
    const clear = prototypeEstimator.calculate(base);
    const shaded = prototypeEstimator.calculate({ ...base, shade: 'a-lot' });
    expect(shaded.planningSystemKw).toBe(clear.planningSystemKw);
    expect(shaded.planningAnnualProductionKwh).toBeLessThan(clear.planningAnnualProductionKwh);
    expect(shaded.recommendation).toBe('site-check-first');
  });

  it('uses optional roof details to recalculate production', () => {
    const south = prototypeEstimator.calculate({ ...base, roofDirection: 'south-group', roofSlope: 'gentle' });
    const northSteep = prototypeEstimator.calculate({ ...base, roofDirection: 'north', roofSlope: 'steep' });
    expect(northSteep.planningAnnualProductionKwh).toBeLessThan(south.planningAnnualProductionKwh);
  });

  it('uses stated roof area as a real constraint', () => {
    const unsure = prototypeEstimator.calculate({ ...base, monthlyBillThb: 15000, roofArea: 'unsure' });
    const small = prototypeEstimator.calculate({ ...base, monthlyBillThb: 15000, roofArea: 'under-30' });
    expect(small.planningSystemKw).toBeLessThan(unsure.planningSystemKw);
    expect(small.roofFeasibility).toBe('limited');
  });

  it('lets exact roof area and future loads update the result', () => {
    const limited = prototypeEstimator.calculate({ ...base, monthlyBillThb: 15000, exactRoofAreaSqm: 22 });
    const future = prototypeEstimator.calculate({ ...base, monthlyBillThb: 15000, roofArea: 'over-200', futureLoads: ['ev'] });
    const present = prototypeEstimator.calculate({ ...base, monthlyBillThb: 15000, roofArea: 'over-200', futureLoads: ['none'] });
    expect(limited.planningSystemKw).toBeLessThan(present.planningSystemKw);
    expect(future.planningSystemKw).toBeGreaterThanOrEqual(present.planningSystemKw);
  });

  it('uses a comparable battery-free quote but rejects battery-inclusive price as a solar-only anchor', () => {
    const comparable = prototypeEstimator.calculate({ ...base, quoteSystemKw: 6, quoteCashPriceThb: 222000, quoteBatteryIncluded: false });
    const battery = prototypeEstimator.calculate({ ...base, quoteSystemKw: 6, quoteCashPriceThb: 600000, quoteBatteryIncluded: true });
    expect(comparable.planningInstalledCostThb).toBe(220000);
    expect(battery.planningInstalledCostThb).not.toBe(600000);
  });

  it('includes the annual maintenance and component reserve in the 25-year cash path', () => {
    const result = prototypeEstimator.calculate(base);
    expect(result.lifetimeCostSeries).toHaveLength(26);
    expect(result.lifetimeCostSeries[25].withSolarThb).toBeGreaterThan(result.planningInstalledCostThb);
  });

  it('does not manufacture a payback denominator when annual value is below the reserve', () => {
    const result = prototypeEstimator.calculate({ ...base, monthlyBillThb: 100, daytimePattern: 'very-low', daytimeLoads: ['none'] });
    expect(result.planningPaybackYears).toBeNull();
    expect(result.estimatedPaybackYears).toBeNull();
  });

  it('treats an unsure business phase as three-phase instead of silently pricing single-phase', () => {
    const business = { ...base, propertyType: 'warehouse' as const, electricityPhase: 'unsure' as const };
    const unsure = prototypeEstimator.calculate(business);
    const three = prototypeEstimator.calculate({ ...business, electricityPhase: 'three' });
    expect(unsure.planningInstalledCostThb).toBe(three.planningInstalledCostThb);
  });
});
