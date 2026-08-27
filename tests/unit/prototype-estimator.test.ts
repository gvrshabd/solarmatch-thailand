import { describe, expect, it } from 'vitest';
import { prototypeEstimator } from '@/lib/calculator/prototype-estimator';
import type { EstimateAnswers } from '@/lib/calculator/types';

const base: EstimateAnswers = {
  province: 'bangkok', monthlyBillThb: 3500, daytimeUsage: 'medium', authority: 'owner', propertyType: 'detached', roofKnown: true, roofMaterial: 'tile', shade: 'none', timing: '3-6', energyInterest: 'solar',
};

describe('prototypeEstimator', () => {
  it('returns ordered, bounded ranges without policy benefits', () => {
    const result = prototypeEstimator.calculate(base);
    expect(result.recommendedSystemKw.min).toBeLessThanOrEqual(result.recommendedSystemKw.max);
    expect(result.estimatedMonthlySavingsThb.min).toBeGreaterThan(0);
    expect(result.estimatedMonthlySavingsThb.max).toBeLessThanOrEqual(base.monthlyBillThb * 0.85);
    expect(result.estimatedPaybackYears).toBeNull();
    expect(result.estimatedExportRevenueThb).toBeNull();
    expect(result.estimatedTaxBenefitThb).toBeNull();
  });

  it('widens uncertainty when roof details are unknown', () => {
    const known = prototypeEstimator.calculate(base).recommendedSystemKw;
    const unknown = prototypeEstimator.calculate({ ...base, roofKnown: false, shade: 'unknown' }).recommendedSystemKw;
    expect(unknown.max - unknown.min).toBeGreaterThanOrEqual(known.max - known.min);
  });

  it('caps extreme bill inputs at the prototype guardrail', () => {
    expect(prototypeEstimator.calculate({ ...base, monthlyBillThb: 90000 }).currentMonthlyBillThb).toBe(50000);
  });
});
