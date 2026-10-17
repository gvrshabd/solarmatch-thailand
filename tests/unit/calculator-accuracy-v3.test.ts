import { afterEach, describe, expect, it, vi } from 'vitest';
import { calculateEstimate } from '@/lib/calculator';
import type { EstimateAnswers, EstimateResult } from '@/lib/calculator/types';
import { modelEnergyYear } from '@/lib/calculator/energy-model';
import { calculateResidentialBill, currentCalculationDate, estimateKwhFromBill, resolveResidentialTariff } from '@/config/electricity-tariffs';
import { solarPackages } from '@/config/solar-packages';

const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
afterEach(() => vi.useRealTimers());
const base: EstimateAnswers = {
  estimateModelVersion: 'energy-v3', province: 'bangkok', district: 'sathon', monthlyBillThb: 6000,
  billDate: '2026-10-01', calculationReferenceDate: '2026-10-17', tariffCategory: 'ordinary-1.2', utility: 'MEA',
  activelyPlanningSolar: true, planningTimeframe: 'within-3-months', projectType: 'new-rooftop',
  propertyType: 'detached-home', ownershipStatus: 'owner', roofArea: '100-200', exactRoofAreaSqm: 100,
  electricityPhase: 'single', daytimePattern: 'high', weekendDaytimePattern: 'high',
  daytimeLoads: ['air-conditioning'], airConditionerCount: 4, roofMaterial: 'concrete-tile', shade: 'almost-none',
  panelTiltDegrees: 15, panelAzimuthDegrees: 180, quoteContactRequested: false,
};

const fixedQuote: EstimateAnswers = {
  ...base, quoteSystemKw: 3.3, quoteCashPriceThb: 123456.78, quoteBatteryIncluded: false,
  quoteModuleCount: 6, quoteModuleWp: 550, quoteInverterAcKw: 3,
};

function requireEnergy(result: EstimateResult) {
  expect(result.energy).toBeDefined();
  return result.energy!;
}
function requireAnnual(result: EstimateResult) {
  expect(result.annualFinancials).toHaveLength(25);
  return result.annualFinancials!;
}
function currentTariff() {
  const resolved = resolveResidentialTariff({ utility: 'MEA', billingDate: '2026-10-17', category: 'ordinary-1.2' });
  if (resolved.status !== 'resolved') throw new Error('Fixture requires a verified tariff');
  return resolved.tariff;
}

describe('v3 calculator physical and financial decision boundaries', () => {
  it('returns no installation for a one-square-metre roof without inventing a tiny package', () => {
    const result = calculateEstimate({ ...base, exactRoofAreaSqm: 1 });
    expect(result.modelStatus).toBe('no-feasible-option');
    expect(result.selectedSystem).toBeUndefined();
    expect(result.planningSystemKw).toBe(0);
    expect(result.planningInstalledCostThb).toBe(0);
    expect(result.planningPaybackYears).toBeNull();
    expect(result.roofFeasibility).toBe('limited');
    expect(result.candidateSystems!.every(candidate => !candidate.feasible && candidate.reasons.includes('roof-too-small'))).toBe(true);
    expect(result.lifetimeCostSeries.every(point => point.withSolarThb === point.withoutSolarThb)).toBe(true);
  });

  it('marks a 20 kWp quote on a 20 m² roof infeasible even when its price is evaluable', () => {
    const result = calculateEstimate({ ...fixedQuote, electricityPhase: 'three', quoteSystemKw: 20,
      quoteInverterAcKw: 15, quoteModuleCount: 40, quoteModuleWp: 500, exactRoofAreaSqm: 20 });
    expect(result.modelStatus).toBe('infeasible-quote');
    expect(result.selectedSystem).toMatchObject({ feasible: false, dcKwp: 20, requiredRoofAreaSqm: 110 });
    expect(result.selectedSystem!.reasons).toContain('roof-too-small');
    expect(result.roofFeasibility).toBe('limited');
    expect(result.recommendation).toBe('site-check-first');
    expect(result.warnings!.some(warning => warning.code === 'infeasible-quote')).toBe(true);
  });

  it('retains an exact cash quotation including cents throughout price, reserve and cash flow', () => {
    const result = calculateEstimate(fixedQuote);
    expect(result.selectedSystem!.priceThb).toBe(123456.78);
    expect(result.planningInstalledCostThb).toBe(123456.78);
    expect(result.estimatedInstalledCostThb).toEqual({ min: 123456.78, max: 123456.78 });
    expect(result.lifetimeCostSeries[0].withSolarThb).toBe(123456.78);
    expect(result.planningAnnualMaintenanceReserveThb).toBeCloseTo(123456.78 * 0.0102, 10);
    const annual = requireAnnual(result);
    const net = annual.reduce((total, year) => total + year.grossSavingsThb - year.reserveThb, 0) - 123456.78;
    expect(result.planningTwentyFiveYearNetBenefitThb).toBeCloseTo(net, 6);
    expect(result.lifetimeCostSeries[25].withoutSolarThb - result.lifetimeCostSeries[25].withSolarThb).toBeCloseTo(net, 6);
  });

  it('does not treat an unknown battery scope as a solar-only quotation', () => {
    const result = calculateEstimate({ ...fixedQuote, quoteBatteryIncluded: undefined });
    expect(result.modelStatus).toBe('unsupported');
    expect(result.selectedSystem).toBeUndefined();
    expect(result.planningAnnualSavingsThb).toBe(0);
    expect(result.planningInstalledCostThb).toBe(0);
    expect(result.warnings!.map(warning => warning.code)).toContain('quote-scope-unknown');
  });

  it.each([
    { quoteSystemKw: 100, quoteInverterAcKw: 100, quoteModuleCount: 200, quoteModuleWp: 500, reason: 'unsupported-capacity' },
    { quoteSystemKw: 3.3, quoteInverterAcKw: 3, quoteModuleCount: 10, quoteModuleWp: 550, reason: 'module-dc-mismatch' },
  ])('withholds hypothetical financials for an invalid quote: $reason', ({ reason, ...quote }) => {
    const result = calculateEstimate({ ...fixedQuote, ...quote, electricityPhase: 'three', exactRoofAreaSqm: 1000 });
    expect(result.modelStatus).toBe('unsupported');
    expect(result.selectedSystem).toBeUndefined();
    expect(result.planningSystemKw).toBe(0);
    expect(result.planningAnnualSavingsThb).toBe(0);
    expect(result.planningInstalledCostThb).toBe(0);
    expect(result.planningPaybackYears).toBeNull();
    expect(result.candidateSystems![0].reasons).toContain(reason);
    expect(result.candidateSystems![0].annualSavingsThb).toBe(0);
    expect(result.candidateSystems![0].lifetimeBenefitThb).toBe(0);
    expect(result.warnings!.map(warning => warning.code)).toContain('unsupported-quote');
  });

  it('compares only finite published candidates and selects maximum positive net value among feasible options', () => {
    const result = calculateEstimate(base);
    const candidates = result.candidateSystems!;
    expect(candidates.map(candidate => candidate.id).sort()).toEqual(solarPackages.map(candidate => candidate.id).sort());
    const feasible = candidates.filter(candidate => candidate.feasible);
    expect(feasible.length).toBeGreaterThan(1);
    expect(candidates.filter(candidate => candidate.phase === 'three').every(candidate => !candidate.feasible && candidate.reasons.includes('phase-mismatch'))).toBe(true);
    for (const candidate of candidates) {
      expect(Number.isFinite(candidate.annualSavingsThb)).toBe(true);
      expect(Number.isFinite(candidate.lifetimeBenefitThb)).toBe(true);
    }
    const best = feasible.filter(candidate => candidate.lifetimeBenefitThb > 0)
      .sort((left, right) => right.lifetimeBenefitThb - left.lifetimeBenefitThb || left.priceThb - right.priceThb)[0];
    expect(best).toBeDefined();
    expect(result.selectedSystem!.id).toBe(best.id);
    expect(result.planningTwentyFiveYearNetBenefitThb).toBe(best.lifetimeBenefitThb);
    const constrained = calculateEstimate({ ...base, budgetThb: 120000 });
    expect(constrained.selectedSystem!.priceThb).toBeLessThanOrEqual(120000);
    expect(constrained.candidateSystems!.filter(candidate => candidate.priceThb > 120000).every(candidate => !candidate.feasible && candidate.reasons.includes('over-budget'))).toBe(true);
  });

  it('chooses no investment when all physically feasible options lose money', () => {
    const result = calculateEstimate({ ...base, monthlyBillThb: 100, daytimePattern: 'very-low', weekendDaytimePattern: 'very-low' });
    expect(result.candidateSystems!.some(candidate => candidate.feasible)).toBe(true);
    expect(result.candidateSystems!.filter(candidate => candidate.feasible).every(candidate => candidate.lifetimeBenefitThb < 0)).toBe(true);
    expect(result.modelStatus).toBe('no-economic-option');
    expect(result.selectedSystem).toBeUndefined();
    expect(result.planningInstalledCostThb).toBe(0);
    expect(result.planningTwentyFiveYearNetBenefitThb).toBe(0);
    expect(result.planningPaybackYears).toBeNull();
  });

  it('conserves monthly and annual demand and generation after estimator integration', () => {
    const energy = requireEnergy(calculateEstimate(fixedQuote));
    expect(energy.monthly).toHaveLength(12);
    for (const balance of [energy, ...energy.monthly]) {
      expect(balance.demandKwh).toBeCloseTo(balance.selfConsumedKwh + balance.gridImportKwh, 7);
      expect(balance.generationKwh).toBeCloseTo(balance.selfConsumedKwh + balance.surplusKwh, 7);
      expect(balance.gridImportKwh).toBeGreaterThan(0);
      expect(balance.selfConsumedKwh).toBeGreaterThanOrEqual(0);
    }
    expect(energy.monthly.reduce((total, month) => total + month.demandKwh, 0)).toBeCloseTo(energy.demandKwh, 7);
    expect(energy.monthly.reduce((total, month) => total + month.generationKwh, 0)).toBeCloseTo(energy.generationKwh, 7);
  });

  it('treats unknown phase prices as conditional and exposes both phase alternatives', () => {
    const result = calculateEstimate({ ...base, electricityPhase: 'unsure' });
    expect(result.modelStatus).toBe('conditional');
    expect(result.warnings!.map(warning => warning.code)).toContain('phase-unconfirmed');
    expect(result.selectedSystem!.conditional).toBe(true);
    expect(new Set(result.candidateSystems!.filter(candidate => candidate.feasible).map(candidate => candidate.phase))).toEqual(new Set(['single', 'three']));
    expect(result.candidateSystems!.every(candidate => candidate.conditional)).toBe(true);
  });
});

describe('v3 estimator consumption and tariff evidence', () => {
  it('expires a fresh calculation on the Thai date while retaining an explicit saved reference', () => {
    vi.useFakeTimers();
    // Already January in Thailand, still December at UTC.
    vi.setSystemTime(new Date('2026-12-31T17:00:00Z'));
    expect(currentCalculationDate()).toBe('2027-01-01');
    const fresh = calculateEstimate({ ...base, calculationReferenceDate: undefined });
    expect(fresh.calculationReferenceDate).toBe('2027-01-01');
    expect(fresh.modelStatus).toBe('unsupported');
    expect(fresh.selectedSystem).toBeUndefined();
    expect(fresh.planningAnnualSavingsThb).toBe(0);
    expect(fresh.warnings!.map(warning => warning.code)).toContain('unsupported-tariff');
    const saved = calculateEstimate(base);
    expect(saved.calculationReferenceDate).toBe('2026-10-17');
    expect(saved.modelStatus).toBe('supported');
    expect(saved.selectedSystem).toBeDefined();
  });

  it('inverts an August bill with historical tiers but values future savings with October reference tiers', () => {
    const historical = resolveResidentialTariff({ utility: 'MEA', billingDate: '2026-08-10', category: 'ordinary-1.2' });
    if (historical.status !== 'resolved') throw new Error('Expected historical fixture');
    const result = calculateEstimate({ ...fixedQuote, billDate: '2026-08-10', billingPeriodDays: 30 });
    const inferred = estimateKwhFromBill(6000, historical.tariff);
    expect(result.estimatedMonthlyConsumptionKwh).toBeCloseTo(inferred / 30 * 365 / 12, 7);
    expect(result.historicalTariffVersion).toBe(historical.tariff.id);
    expect(result.tariffVersion).toBe(currentTariff().id);
    expect(result.historicalTariffVersion).not.toBe(result.tariffVersion);
    const energy = requireEnergy(result);
    const expectedAnnualBill = energy.monthly.reduce((total, month) => total + calculateResidentialBill(month.demandKwh, currentTariff()), 0);
    expect(result.baselineFutureMonthlyBillThb).toBeCloseTo(expectedAnnualBill / 12, 7);
    expect(result.baselineFutureMonthlyBillThb).not.toBeCloseTo(6000, 1);
  });

  it.each([
    { tariffCategory: 'tou' as const }, { tariffCategory: 'unknown' as const },
    { calculationReferenceDate: '2027-01-01' }, { billDate: '2026-04-30' }, { billDate: '2026-02-30' },
  ])('withholds a financial recommendation for unsupported tariff input %j', (change) => {
    const result = calculateEstimate({ ...base, ...change });
    expect(result.modelStatus).toBe('unsupported');
    expect(result.selectedSystem).toBeUndefined();
    expect(result.planningInstalledCostThb).toBe(0);
    expect(result.planningAnnualSavingsThb).toBe(0);
    expect(result.warnings!.map(warning => warning.code)).toContain('unsupported-tariff');
  });

  it('uses explicit meter kWh and days rather than the unrelated bill amount', () => {
    const result = calculateEstimate({ ...fixedQuote, consumptionInput: 'kwh', monthlyConsumptionKwh: 600, billingPeriodDays: 30, monthlyBillThb: 999 });
    expect(requireEnergy(result).demandKwh).toBeCloseTo(600 / 30 * 365, 7);
    expect(result.estimatedMonthlyConsumptionKwh).toBeCloseTo(600 / 30 * 365 / 12, 7);
  });

  it('reallocates existing appliance schedules without adding their energy on top of bill-inferred consumption', () => {
    const reference = calculateEstimate(fixedQuote);
    const scheduled = calculateEstimate({ ...fixedQuote, daylightAcUnits: 2, daylightAcHours: 3, acPowerKw: 0.8,
      existingEvMonthlyKwh: 100, evHomeChargingFraction: 0.5, evDaytimeFraction: 0.5, pumpPowerKw: 0.5, pumpHoursPerDay: 1 });
    expect(requireEnergy(scheduled).demandKwh).toBeCloseTo(requireEnergy(reference).demandKwh, 7);
    expect(requireEnergy(scheduled).futureDemandKwh).toBe(0);
    expect(scheduled.estimatedMonthlyConsumptionKwh).toBeCloseTo(reference.estimatedMonthlyConsumptionKwh, 7);
  });
});

describe('v3 quantified future loads and model limits', () => {
  it.each(['2027-01-01', '2028-01-01'])('rejects future demand outside the residential range beginning %s', startDate => {
    const result = calculateEstimate({ ...fixedQuote, plannedLoadChanges: [{ kind: 'ev', startDate, monthlyKwh: 100000, homeChargingFraction: 1, daytimeFraction: 1 }] });
    expect(result.modelStatus).toBe('unsupported');
    expect(result.selectedSystem).toBeUndefined();
    expect(result.planningSystemKw).toBe(0);
    expect(result.planningAnnualSavingsThb).toBe(0);
    expect(result.planningInstalledCostThb).toBe(0);
    expect(result.warnings!.map(warning => warning.code)).toContain('residential-boundary');
  });

  it.each([
    { kind: 'ev' as const, monthlyKwh: 300, homeChargingFraction: 0.5, daytimeFraction: 0.5, expected: 1800, julyExpected: 900 },
    { kind: 'air-conditioning' as const, powerKw: 1, units: 2, hoursPerDay: 3, startHour: 9, expected: 2190, julyExpected: 1104 },
    { kind: 'pump' as const, powerKw: 0.5, units: 1, hoursPerDay: 2, startHour: 10, expected: 365, julyExpected: 184 },
  ])('computes $kind energy from its own quantities and start month', ({ expected, julyExpected, ...load }) => {
    const january = calculateEstimate({ ...fixedQuote, plannedLoadChanges: [{ ...load, startDate: '2027-01-01' }] });
    const july = calculateEstimate({ ...fixedQuote, plannedLoadChanges: [{ ...load, startDate: '2027-07-01' }] });
    const deferred = calculateEstimate({ ...fixedQuote, plannedLoadChanges: [{ ...load, startDate: '2028-01-01' }] });
    expect(requireEnergy(january).futureDemandKwh).toBeCloseTo(expected, 7);
    expect(requireEnergy(july).futureDemandKwh).toBeCloseTo(julyExpected, 7);
    expect(requireEnergy(deferred).futureDemandKwh).toBe(0);
    expect(requireEnergy(january).demandKwh - requireEnergy(deferred).demandKwh).toBeCloseTo(expected, 7);
    expect(requireEnergy(july).monthly.slice(0, 6).every((month, index) => Math.abs(month.demandKwh - requireEnergy(deferred).monthly[index].demandKwh) < 1e-7)).toBe(true);
    const deferredAnnual = requireAnnual(deferred);
    expect(deferredAnnual[1].baselineBillThb).toBeGreaterThan(deferredAnnual[0].baselineBillThb);
  });

  it('adds no future consumption for unquantified appliance names', () => {
    const result = calculateEstimate({ ...fixedQuote, futureLoads: ['ev', 'air-conditioning', 'pump'] });
    expect(requireEnergy(result).futureDemandKwh).toBe(0);
    expect(result.warnings!.map(warning => warning.code)).toContain('future-unquantified');
  });

  it('retains dated future-load baseline bills when no investment is selected', () => {
    const result = calculateEstimate({ ...base, monthlyBillThb: 100, daytimePattern: 'very-low', weekendDaytimePattern: 'very-low',
      plannedLoadChanges: [{ kind: 'pump', powerKw: 0.1, units: 1, hoursPerDay: 1, startHour: 10, startDate: '2028-01-01' }] });
    expect(result.modelStatus).toBe('no-economic-option');
    expect(result.selectedSystem).toBeUndefined();
    const annual = requireAnnual(result);
    expect(annual[1].baselineBillThb).toBeGreaterThan(annual[0].baselineBillThb);
    expect(annual[1].withSolarBillThb).toBe(annual[1].baselineBillThb);
    expect(annual.every(year => year.netCashFlowThb === 0)).toBe(true);
    expect(result.lifetimeCostSeries[25].withoutSolarThb).toBeCloseTo(annual.reduce((total, year) => total + year.baselineBillThb, 0), 6);
    expect(result.lifetimeCostSeries[25].withSolarThb).toBe(result.lifetimeCostSeries[25].withoutSolarThb);
  });

  it('does not personalize production or demand from coordinates or installed AC count alone', () => {
    const original = calculateEstimate(fixedQuote);
    const changed = calculateEstimate({ ...fixedQuote, airConditionerCount: 20,
      location: { address: 'Synthetic test area', latitude: 18.8, longitude: 99, province: 'bangkok', source: 'manual-map', confirmed: true } });
    expect(changed.energy).toEqual(original.energy);
    expect(changed.planningInstalledCostThb).toBe(original.planningInstalledCostThb);
    expect(changed.planningAnnualSavingsThb).toBe(original.planningAnnualSavingsThb);
    expect(changed.warnings!.map(warning => warning.code)).toContain('coordinates-unused');
    expect(changed.warnings!.map(warning => warning.code)).toContain('assumed-profiles');
  });

  it('ignores azimuth for zero panel tilt throughout the integrated financial result', () => {
    const north = calculateEstimate({ ...fixedQuote, panelTiltDegrees: 0, panelAzimuthDegrees: 0 });
    const east = calculateEstimate({ ...fixedQuote, panelTiltDegrees: 0, panelAzimuthDegrees: 90 });
    expect(north.energy).toEqual(east.energy);
    expect(north.annualFinancials).toEqual(east.annualFinancials);
  });

  it('degrades generation before hourly matching and recalculates progressive bills for year 25', () => {
    const answers: EstimateAnswers = { ...fixedQuote, quoteSystemKw: 10, quoteInverterAcKw: 10, quoteModuleCount: 20, quoteModuleWp: 500,
      electricityPhase: 'three', daytimePattern: 'low', weekendDaytimePattern: 'low', consumptionInput: 'kwh', monthlyConsumptionKwh: 500, billingPeriodDays: 365 / 12 };
    const result = calculateEstimate(answers);
    const annual = requireAnnual(result);
    const year25 = modelEnergyYear({ monthlyConsumptionKwh: DAYS.map(days => 500 / (365 / 12) * days), weekdayPattern: 'low', weekendPattern: 'low',
      dcKwp: 10, inverterAcKw: 10, panelTiltDegrees: 15, panelAzimuthDegrees: 180, shadeFactor: 1,
      degradationFactor: 0.995 ** 24, calendarYear: 2027, yearOffset: 24 });
    const tariff = currentTariff();
    const expectedSavings = year25.monthly.reduce((total, month) => total + calculateResidentialBill(month.demandKwh, tariff) - calculateResidentialBill(month.gridImportKwh, tariff), 0);
    expect(annual[24].generationKwh).toBeCloseTo(year25.totals.generationKwh, 7);
    expect(annual[24].selfConsumedKwh).toBeCloseTo(year25.totals.selfConsumedKwh, 7);
    expect(annual[24].grossSavingsThb).toBeCloseTo(expectedSavings, 7);
    expect(Math.abs(annual[24].grossSavingsThb - annual[0].grossSavingsThb * 0.995 ** 24)).toBeGreaterThan(100);
    expect(annual[24].reserveThb).toBe(annual[0].reserveThb);
  });
});
