import { describe, expect, it } from 'vitest';
import { calculateModernEstimate } from '@/lib/calculator/residential-estimator';
import type { EstimateAnswers } from '@/lib/calculator/types';

const base: EstimateAnswers = {
  estimateModelVersion: 'energy-v3', calculationReferenceDate: '2026-10-17',
  province: 'bangkok', district: 'sathon', monthlyBillThb: 6000,
  billDate: '2026-10-01', tariffCategory: 'ordinary-1.2', utility: 'MEA',
  activelyPlanningSolar: true, planningTimeframe: 'within-3-months', projectType: 'new-rooftop',
  propertyType: 'detached-home', ownershipStatus: 'owner', roofArea: '100-200', exactRoofAreaSqm: 100,
  electricityPhase: 'single', daytimePattern: 'high', weekendDaytimePattern: 'high',
  daytimeLoads: ['air-conditioning'], airConditionerCount: 4, roofMaterial: 'concrete-tile', shade: 'almost-none',
  panelTiltDegrees: 15, panelAzimuthDegrees: 180, quoteContactRequested: false,
};
const quote: EstimateAnswers = {
  ...base, quoteSystemKw: 3.3, quoteCashPriceThb: 123456.78, quoteBatteryIncluded: false,
  quoteModuleCount: 6, quoteModuleWp: 550, quoteInverterAcKw: 3,
};

describe('v3 direct-engine invalid-input boundaries', () => {
  it.each<Partial<EstimateAnswers>>([
    { exactRoofAreaSqm: Number.NaN }, { exactRoofAreaSqm: Infinity }, { exactRoofAreaSqm: -1 }, { exactRoofAreaSqm: 0 },
    { billingPeriodDays: Number.NaN }, { billingPeriodDays: Infinity }, { billingPeriodDays: -1 }, { billingPeriodDays: 0 },
    { quoteCashPriceThb: Number.NaN }, { quoteCashPriceThb: Infinity }, { quoteCashPriceThb: -1 },
    { monthlyBillThb: Number.NaN }, { monthlyBillThb: -1 },
  ])('rejects malformed physical or monetary values instead of producing a recommendation: %j', change => {
    expect(() => calculateModernEstimate({ ...quote, ...change })).toThrow(RangeError);
  });

  it('validates non-finite future energy even when its start is beyond all 25 modeled years', () => {
    expect(() => calculateModernEstimate({ ...quote, plannedLoadChanges: [{
      kind: 'ev', startDate: '2099-01-01', monthlyKwh: Number.NaN,
      homeChargingFraction: 1, daytimeFraction: 1,
    }] })).toThrow(RangeError);
  });

  it.each(['2027-02-30', '2027-04-31', '2027-13-01', 'not-a-date', '2027-7-1'])(
    'rejects impossible or non-ISO future date %s before Date normalization', startDate => {
      expect(() => calculateModernEstimate({ ...quote, plannedLoadChanges: [{
        kind: 'ev', startDate, monthlyKwh: 100, homeChargingFraction: 1, daytimeFraction: 1,
      }] })).toThrow(RangeError);
    },
  );

  it.each<Partial<EstimateAnswers>>([
    { monthlyRecords: [{ month: 1, kwh: Number.NaN, periodDays: 31 }] },
    { monthlyRecords: [{ month: 1, kwh: 100, periodDays: Number.NaN }] },
    { monthlyRecords: [{ month: 1, kwh: 100, periodDays: 0 }] },
    { monthlyRecords: [{ month: 13, kwh: 100, periodDays: 31 }] },
  ])('rejects invalid nested monthly records: %j', change => {
    expect(() => calculateModernEstimate({ ...quote, ...change })).toThrow(RangeError);
  });

  it('withholds finance for kWh mode with its actual consumption missing', () => {
    const result = calculateModernEstimate({ ...base, consumptionInput: 'kwh', monthlyConsumptionKwh: undefined });
    expect(result.modelStatus).toBe('unsupported');
    expect(result.selectedSystem).toBeUndefined();
    expect(result.planningInstalledCostThb).toBe(0);
    expect(result.planningAnnualSavingsThb).toBe(0);
    expect(result.planningPaybackYears).toBeNull();
    expect(result.warnings!.map(warning => warning.code)).toContain('residential-boundary');
  });
});

describe('v3 contradictory schedules and incomplete quotations', () => {
  it('discloses scaled AC schedules while preserving every month and year of baseline bill demand', () => {
    const ordinary = calculateModernEstimate(quote);
    const contradictory = calculateModernEstimate({ ...quote, daylightAcUnits: 4, daylightAcHours: 9, acPowerKw: 20 });
    expect(ordinary.warnings!.some(warning => warning.code === 'existing-schedules-scaled')).toBe(false);
    expect(contradictory.warnings!.some(warning => warning.code === 'existing-schedules-scaled')).toBe(true);
    expect(contradictory.energy!.demandKwh).toBeCloseTo(ordinary.energy!.demandKwh, 7);
    expect(contradictory.energy!.futureDemandKwh).toBe(0);
    expect(contradictory.estimatedMonthlyConsumptionKwh).toBeCloseTo(ordinary.estimatedMonthlyConsumptionKwh, 7);
    contradictory.energy!.monthly.forEach((month, index) => {
      expect(month.demandKwh).toBeCloseTo(ordinary.energy!.monthly[index].demandKwh, 7);
      expect(month.demandKwh).toBeCloseTo(month.selfConsumedKwh + month.gridImportKwh, 7);
    });
    expect(contradictory.annualFinancials).toHaveLength(25);
    contradictory.annualFinancials!.forEach((year, index) => {
      expect(year.baselineBillThb).toBeCloseTo(ordinary.annualFinancials![index].baselineBillThb, 7);
    });
  });

  it('requires known battery scope rather than treating an unknown quote as solar-only', () => {
    const result = calculateModernEstimate({ ...quote, quoteBatteryIncluded: undefined });
    expect(result.modelStatus).toBe('unsupported');
    expect(result.warnings!.map(warning => warning.code)).toContain('quote-scope-unknown');
    expect(result.selectedSystem).toBeUndefined();
    expect(result.planningInstalledCostThb).toBe(0);
    expect(result.planningAnnualSavingsThb).toBe(0);
  });

  it('keeps an explicitly solar-only quote conditional when equipment specifications are incomplete', () => {
    const result = calculateModernEstimate({ ...quote, quoteModuleCount: undefined, quoteModuleWp: undefined, quoteInverterAcKw: undefined });
    expect(result.modelStatus).toBe('conditional');
    expect(result.warnings!.map(warning => warning.code)).toContain('quote-specs-missing');
    expect(result.selectedSystem!.id).toBe('user-quotation');
    expect(result.selectedSystem!.conditional).toBe(true);
    expect(result.planningInstalledCostThb).toBe(123456.78);
  });
});
