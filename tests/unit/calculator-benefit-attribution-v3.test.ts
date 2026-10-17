import { describe, expect, it } from 'vitest';
import { buildBenefitAttribution, factors } from '../../scripts/calculator-benefit-attribution-v3';

describe('lifetime benefit attribution: synthetic THB6000 daytime example', () => {
  it('reconciles both engines, every modern financial year, and all factorial orders', () => {
    const report = buildBenefitAttribution();
    const first = report.scenarios[0], last = report.scenarios.at(-1)!;
    // Public legacy lifetime is rounded to THB1000. Do not attribute rounding
    // residue to energy, price, or assume the printed endpoint is exact.
    expect(Math.round(first.net / 1000) * 1000).toBe(report.old.planningTwentyFiveYearNetBenefitThb);
    expect(Math.round(first.saving)).toBe(report.old.planningAnnualSavingsThb);
    expect(last.net).toBeCloseTo(report.modern.planningTwentyFiveYearNetBenefitThb, 6);
    expect(last.generation).toBeCloseTo(report.modern.planningAnnualProductionKwh, 7);
    expect(last.selfUse).toBeCloseTo(report.modern.planningAnnualSelfConsumedKwh, 7);
    last.rows.forEach((row, i) => expect(row.savings).toBeCloseTo(report.modern.annualFinancials![i].grossSavingsThb, 6));
    const delta = last.net - first.net;
    for (const path of [report.forward, report.reverse]) expect(path.reduce((s, r) => s + r.delta, 0)).toBeCloseTo(delta, 6);
    expect(report.contributions.reduce((s, r) => s + r.shapley, 0)).toBeCloseTo(delta, 6);
    expect(report.scenarios).toHaveLength(2 ** factors.length);
    // The same fixture uses numerically identical tariff charges in both engines.
    const charges = ({ tiers, ftThbPerKwh, vatRate, serviceChargeThb }: typeof report.newTariff) => ({ tiers, ftThbPerKwh, vatRate, serviceChargeThb });
    expect(charges(report.oldTariff)).toEqual(charges(report.newTariff));
    expect(report.contributions.find(r => r.factor === 'tariff')!.shapley).toBeCloseTo(0, 8);
    // Order dependence is material: do not present sequential increments as
    // unique causal corrections or claim smooth synthetic profiles are measured.
    const self = report.contributions.find(r => r.factor === 'selfConsumption')!;
    expect(self.maxMarginal - self.minMarginal).toBeGreaterThan(20000);
    expect(last.selfUse / last.generation).toBeGreaterThan(0.97);
    expect(last.net).toBeCloseTo(last.lifetimeGrossSaving - last.capex - last.reserve * 25, 7);
    expect(report.modern.assumptionsUsed.some(a => a.includes('Base result excludes export revenue, personal tax and financing'))).toBe(true);
    console.log('BENEFIT_ATTRIBUTION_JSON=' + JSON.stringify({
      legacy: { published: report.old.planningTwentyFiveYearNetBenefitThb, ...first, rows: undefined },
      modern: { published: report.modern.planningTwentyFiveYearNetBenefitThb, ...last, rows: undefined },
      exactDelta: delta, displayedDelta: last.net - report.old.planningTwentyFiveYearNetBenefitThb,
      forward: report.forward, reverse: report.reverse, contributions: report.contributions, pairInteractions: report.pairInteractions,
      demandKwh: { old: report.constantDemand.reduce((s, n) => s + n, 0), modern: report.calendarDemand.reduce((s, n) => s + n, 0) },
    }));
  }, 30000);
});
