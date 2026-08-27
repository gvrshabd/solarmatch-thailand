import { describe, expect, it } from 'vitest';
import { prototypeEstimator } from '@/lib/calculator/prototype-estimator';
import type { EstimateAnswers } from '@/lib/calculator/types';

const base: EstimateAnswers = {
  province: 'bangkok', monthlyBillThb: 3500, daytimeUsage: 'medium', authority: 'owner', propertyType: 'detached', roofKnown: true, roofMaterial: 'tile', shade: 'none', timing: '3-6', energyInterest: 'solar',
};

describe('prototypeEstimator', () => {
  it('returns ordered Thai self-use ranges without policy benefits in the base result', () => {
    const result = prototypeEstimator.calculate(base);
    expect(result.recommendedSystemKw.min).toBeLessThanOrEqual(result.recommendedSystemKw.max);
    expect(result.estimatedMonthlySavingsThb.min).toBeGreaterThan(0);
    expect(result.estimatedMonthlySavingsThb.max).toBeLessThanOrEqual(base.monthlyBillThb * 0.85);
    expect(result.estimatedInstalledCostThb.min).toBeGreaterThan(0);
    expect(result.estimatedPaybackYears?.min).toBeGreaterThan(0);
    expect(result.estimatedExportRevenueThb).toBeNull();
    expect(result.conditionalAnnualExportRevenueThb.min).toBeGreaterThanOrEqual(0);
    expect(result.estimatedTaxBenefitThb).toBeNull();
    expect(result.lifetimeCostSeries).toHaveLength(26);
    expect(result.lifetimeCostSeries[0].withoutSolarThb).toBe(0);
    expect(result.lifetimeCostSeries[0].withSolarLowThb).toBe(result.estimatedInstalledCostThb.min);
  });

  it('widens uncertainty when roof details are unknown', () => {
    const known = prototypeEstimator.calculate(base).recommendedSystemKw;
    const unknown = prototypeEstimator.calculate({ ...base, roofKnown: false, shade: 'unknown' }).recommendedSystemKw;
    expect(unknown.max - unknown.min).toBeGreaterThanOrEqual(known.max - known.min);
  });

  it('caps extreme bill inputs at the prototype guardrail', () => {
    expect(prototypeEstimator.calculate({ ...base, monthlyBillThb: 90000 }).currentMonthlyBillThb).toBe(50000);
  });

  it('values higher daytime use above low daytime use without adding export revenue', () => {
    const high = prototypeEstimator.calculate({ ...base, daytimeUsage: 'high' });
    const low = prototypeEstimator.calculate({ ...base, daytimeUsage: 'low' });
    expect(high.estimatedAnnualSelfConsumptionValueThb.max).toBeGreaterThan(low.estimatedAnnualSelfConsumptionValueThb.max);
    expect(high.estimatedExportRevenueThb).toBeNull();
    expect(low.estimatedExportRevenueThb).toBeNull();
  });
});
