/** Diagnostic counterfactuals only: never used to recommend or price a system. */
import { calculateEstimate } from '../lib/calculator';
import { calculateResidentialBill, estimateKwhFromBill, resolveResidentialTariff } from '../config/electricity-tariffs';
import { selectResidentialTariff as legacyTariff } from '../config/legacy-electricity-tariffs';
import { solarAssumptions } from '../config/solar-assumptions';
import { modelEnergyYear } from '../lib/calculator/energy-model';
import { consumptionMonths, energyInput } from '../lib/calculator/residential-estimator';
import type { EstimateAnswers } from '../lib/calculator/types';

export const attributionFixture: EstimateAnswers = {
  province: 'bangkok', district: 'sathon', monthlyBillThb: 6000,
  calculationReferenceDate: '2026-10-17', billDate: '2026-10-01', tariffCategory: 'ordinary-1.2', utility: 'MEA',
  activelyPlanningSolar: true, planningTimeframe: 'within-3-months', projectType: 'new-rooftop',
  propertyType: 'detached-home', ownershipStatus: 'owner', roofArea: '100-200', exactRoofAreaSqm: 100,
  electricityPhase: 'single', daytimePattern: 'high', weekendDaytimePattern: 'high',
  daytimeLoads: ['air-conditioning'], airConditionerCount: 4, roofMaterial: 'concrete-tile', shade: 'almost-none',
  panelTiltDegrees: 15, panelAzimuthDegrees: 180, quoteContactRequested: false,
};

// Demand calendar and degradation stay separate instead of being mislabeled
// as tariff, generation, or self-use corrections. Operating cost switches its
// absolute annual reserve; price switches only CAPEX, avoiding hidden coupling.
export const factors = ['size', 'price', 'generation', 'selfConsumption', 'tariff', 'operatingCost', 'demandCalendar', 'degradationMethod'] as const;
type Factor = typeof factors[number];
const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);
const bit = (name: Factor) => 1 << factors.indexOf(name);
const enabled = (mask: number, name: Factor) => Boolean(mask & bit(name));
const factorial = (n: number): number => n <= 1 ? 1 : n * factorial(n - 1);

export function buildBenefitAttribution() {
  const old = calculateEstimate({ ...attributionFixture, estimateModelVersion: 'legacy-v5' });
  const modern = calculateEstimate({ ...attributionFixture, estimateModelVersion: 'energy-v3' });
  const oldTariff = legacyTariff('bangkok');
  const newTariff = resolveResidentialTariff({ province: 'bangkok', utility: 'MEA', category: 'ordinary-1.2', billingDate: '2026-10-17' }).tariff!;
  const constantDemand = Array<number>(12).fill(estimateKwhFromBill(6000, oldTariff));
  const calendarDemand = consumptionMonths(attributionFixture);
  const physicalCache = new Map<string, { generation: number; selfUse: number; savings: number }[]>();

  function physicalRows(mask: number) {
    const key = ['size', 'generation', 'selfConsumption', 'tariff', 'demandCalendar', 'degradationMethod'].map(f => enabled(mask, f as Factor) ? 1 : 0).join('');
    const cached = physicalCache.get(key);
    if (cached) return cached;
    const size = enabled(mask, 'size') ? modern.planningSystemKw : old.planningSystemKw;
    const demand = enabled(mask, 'demandCalendar') ? calendarDemand : constantDemand;
    const tariff = enabled(mask, 'tariff') ? newTariff : oldTariff;
    // Legacy has no hourly weather. For the diagnostic bridge only, distribute
    // each legacy monthly total across v3's solar hours. This convention matters
    // only in mixed states using legacy generation with hourly self-consumption.
    const scaffold = modelEnergyYear(energyInput(attributionFixture, demand, { dcKwp: size, inverterAcKw: 5 }), { includeIntervals: true });
    const generationByMonth = scaffold.monthly.map((m, i) => enabled(mask, 'generation') ? m.generationKwh : size * 1380 * 0.95 * solarAssumptions.monthlyProductionShare[i]);
    const byMonth = scaffold.monthly.map(() => [] as Array<{ demand: number; generation: number }>);
    for (const interval of scaffold.intervals!) {
      const month = Number(interval.startDateTime.slice(5, 7)) - 1;
      byMonth[month].push({ demand: interval.demandKwh, generation: interval.generationKwh * generationByMonth[month] / scaffold.monthly[month].generationKwh });
    }
    const rows = Array.from({ length: 25 }, (_, year) => {
      const degradation = 0.995 ** year;
      const physicalDegradation = enabled(mask, 'degradationMethod');
      const generationFactor = physicalDegradation ? degradation : 1;
      const self = generationByMonth.map((generation, month) => enabled(mask, 'selfConsumption')
        ? sum(byMonth[month].map(h => Math.min(h.demand, h.generation * generationFactor)))
        : Math.min(demand[month], generation * generationFactor * 0.7));
      const savings = sum(self.map((kwh, month) => calculateResidentialBill(demand[month], tariff) - calculateResidentialBill(demand[month] - kwh, tariff))) * (physicalDegradation ? 1 : degradation);
      return { generation: sum(generationByMonth) * generationFactor, selfUse: sum(self), savings };
    });
    physicalCache.set(key, rows);
    return rows;
  }

  function scenario(mask: number) {
    const rows = physicalRows(mask);
    const capex = enabled(mask, 'price') ? modern.planningInstalledCostThb : old.planningInstalledCostThb;
    // The legacy API rounds its annual reserve; use the source's exact rate here.
    const reserve = (enabled(mask, 'operatingCost') ? modern.planningInstalledCostThb : old.planningInstalledCostThb) * 0.0102;
    return { mask, capex, reserve, generation: rows[0].generation, selfUse: rows[0].selfUse, saving: rows[0].savings, lifetimeGrossSaving: sum(rows.map(r => r.savings)), net: sum(rows.map(r => r.savings)) - capex - reserve * 25, rows };
  }
  const scenarios = Array.from({ length: 1 << factors.length }, (_, mask) => scenario(mask));
  function path(order: readonly Factor[]) {
    let mask = 0;
    return order.map(factor => {
      const previous = scenarios[mask];
      mask |= bit(factor);
      const next = scenarios[mask];
      return { factor, delta: next.net - previous.net, net: next.net };
    });
  }
  const contributions = factors.map(factor => {
    let shapley = 0;
    const marginals: number[] = [];
    for (const scenario of scenarios) {
      if (enabled(scenario.mask, factor)) continue;
      const count = factors.filter(f => enabled(scenario.mask, f)).length;
      const marginal = scenarios[scenario.mask | bit(factor)].net - scenario.net;
      marginals.push(marginal);
      shapley += factorial(count) * factorial(factors.length - count - 1) / factorial(factors.length) * marginal;
    }
    return { factor, shapley, minMarginal: Math.min(...marginals), maxMarginal: Math.max(...marginals) };
  });
  const pairInteractions = factors.flatMap((left, i) => factors.slice(i + 1).map(right => ({
    left, right,
    // Discrete interaction with all other switches at legacy. Higher order
    // interactions still exist; these pair effects must not be added to Shapley.
    delta: scenarios[bit(left) | bit(right)].net - scenarios[bit(left)].net - scenarios[bit(right)].net + scenarios[0].net,
  }))).filter(p => Math.abs(p.delta) > 1e-6);
  return { old, modern, oldTariff, newTariff, constantDemand, calendarDemand, scenarios, forward: path(factors), reverse: path([...factors].reverse()), contributions, pairInteractions };
}
