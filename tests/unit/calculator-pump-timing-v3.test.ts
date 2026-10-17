import { describe, expect, it } from 'vitest';
import { calculateModernEstimate, consumptionMonths, energyInput } from '@/lib/calculator/residential-estimator';
import { estimateAnswersSchema, sanitizeEstimateDraftAnswers } from '@/lib/validation/estimate';
import { permittedEstimateInputs, restoreSharedEstimate, sharedEstimateUrl } from '@/lib/design-v2/share-estimate';
import type { EstimateAnswers } from '@/lib/calculator/types';

const base: EstimateAnswers = {
  estimateModelVersion: 'energy-v3', calculationReferenceDate: '2026-10-17', billDate: '2026-10-01',
  province: 'bangkok', district: 'sathon', monthlyBillThb: 2000, utility: 'MEA', tariffCategory: 'ordinary-1.2',
  activelyPlanningSolar: true, planningTimeframe: 'within-3-months', projectType: 'new-rooftop',
  propertyType: 'detached-home', ownershipStatus: 'owner', roofArea: '100-200', exactRoofAreaSqm: 100,
  electricityPhase: 'single', daytimePattern: 'very-low', weekendDaytimePattern: 'very-low',
  daytimeLoads: ['pump'], pumpPowerKw: 1, pumpHoursPerDay: 4,
  roofMaterial: 'concrete-tile', shade: 'almost-none', panelTiltDegrees: 15, panelAzimuthDegrees: 180,
  quoteSystemKw: 3.3, quoteCashPriceThb: 123456.78, quoteBatteryIncluded: false,
  quoteModuleCount: 6, quoteModuleWp: 550, quoteInverterAcKw: 3, quoteContactRequested: false,
};

describe('existing-pump timing and explicit input defaults', () => {
  it('reallocates the same bill-included pump energy to the entered start time', () => {
    const day = calculateModernEstimate({ ...base, pumpStartHour: 10 });
    const night = calculateModernEstimate({ ...base, pumpStartHour: 22 });
    expect(day.energy!.demandKwh).toBeCloseTo(night.energy!.demandKwh, 7);
    expect(day.energy!.generationKwh).toBeCloseTo(night.energy!.generationKwh, 7);
    expect(day.energy!.futureDemandKwh).toBe(0);
    expect(night.energy!.futureDemandKwh).toBe(0);
    expect(day.energy!.selfConsumedKwh).toBeGreaterThan(night.energy!.selfConsumedKwh);
    expect(day.energy!.gridImportKwh).toBeLessThan(night.energy!.gridImportKwh);
    expect(day.planningAnnualSavingsThb).toBeGreaterThan(night.planningAnnualSavingsThb);
    day.energy!.monthly.forEach((month, index) => expect(month.demandKwh).toBeCloseTo(night.energy!.monthly[index].demandKwh, 7));
    expect(day.annualFinancials![0].baselineBillThb).toBeCloseTo(night.annualFinancials![0].baselineBillThb, 7);
  });

  it('retains 10:00 only as the unchanged fallback when the optional timer is blank', () => {
    const system = { dcKwp: 3.3, inverterAcKw: 3 };
    const monthly = consumptionMonths(base);
    const implicit = energyInput(base, monthly, system);
    const explicit = energyInput({ ...base, pumpStartHour: 10 }, monthly, system);
    expect(implicit).toEqual(explicit);
    expect(implicit.existingLoads).toEqual([{ kind: 'pump', powerKw: 1, units: 1, hoursPerDay: 4, startHour: 10 }]);
    expect(energyInput({ ...base, pumpStartHour: 13.5 }, monthly, system).existingLoads![0]).toMatchObject({ startHour: 13.5 });
  });

  it('preserves the optional numeric pump timer through validation, draft restore and a modern shared link', () => {
    const answers = estimateAnswersSchema.parse({ ...base, pumpStartHour: 23.99 });
    expect(answers.pumpStartHour).toBe(23.99);
    expect(sanitizeEstimateDraftAnswers({ pumpStartHour: 23.99 })).toEqual({ pumpStartHour: 23.99 });
    const payload = permittedEstimateInputs(answers);
    expect(payload.version).toBe(2);
    expect(payload.inputs).toMatchObject({ pumpStartHour: 23.99 });
    const link = new URL(sharedEstimateUrl(answers, 'https://example.test', 'en'));
    const restored = restoreSharedEstimate(link.hash);
    expect(restored.pumpStartHour).toBe(23.99);
    expect(restored.pumpPowerKw).toBe(1);
    expect(restored.pumpHoursPerDay).toBe(4);
    expect(restored.calculationReferenceDate).toBe('2026-10-17');
    const cleared = permittedEstimateInputs({ ...answers, pumpStartHour: undefined });
    expect(cleared.inputs).not.toHaveProperty('pumpStartHour');
  });

  it.each([-0.01, 24, Infinity, Number.NaN])('rejects an out-of-range timer %s in validation and sharing', pumpStartHour => {
    expect(estimateAnswersSchema.safeParse({ ...base, pumpStartHour }).success).toBe(false);
    expect(() => permittedEstimateInputs({ ...base, pumpStartHour })).toThrow();
    expect(sanitizeEstimateDraftAnswers({ pumpStartHour })).not.toHaveProperty('pumpStartHour');
  });

  it('distinguishes an unconfirmed ordinary assumption from explicitly unknown unsupported tariff', () => {
    const assumed = calculateModernEstimate({ ...base, tariffCategory: undefined });
    expect(assumed.warnings!.some(warning => warning.code === 'assumed-category')).toBe(true);
    const unknown = calculateModernEstimate({ ...base, tariffCategory: 'unknown' });
    expect(unknown.modelStatus).toBe('unsupported');
    expect(unknown.selectedSystem).toBeUndefined();
    expect(unknown.planningAnnualSavingsThb).toBe(0);
    expect(unknown.warnings!.some(warning => warning.code === 'assumed-category')).toBe(false);
  });
});
