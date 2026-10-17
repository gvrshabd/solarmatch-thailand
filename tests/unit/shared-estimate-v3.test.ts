import { describe, expect, it } from 'vitest';
import { calculateEstimate } from '@/lib/calculator';
import type { EstimateAnswers } from '@/lib/calculator/types';
import { designV2Example } from '@/config/design-v2-example';
import {
  permittedEstimateInputs, restoreSharedEstimate, sharedEstimateUrl,
  sharedEstimateMaximumEncodedLength, sharedEstimateModelVersion, sharedEstimateReferenceDate,
} from '@/lib/design-v2/share-estimate';

const base: EstimateAnswers = {
  ...designV2Example, estimateModelVersion: 'energy-v3', calculationReferenceDate: '2026-10-17',
  roofArea: '100-200', exactRoofAreaSqm: 100, electricityPhase: 'three',
  consumptionInput: 'kwh', monthlyConsumptionKwh: 1_000, billingPeriodDays: 30,
  billDate: '2026-09-30', tariffCategory: 'ordinary-1.2', utility: 'MEA',
  monthlyRecords: [{ month: 1, kwh: 900, periodDays: 31, billDate: '2026-01-31' },
    { month: 7, kwh: 1_100, periodDays: 31 }],
  weekendDaytimePattern: 'moderate', daylightAcUnits: 2, daylightAcHours: 4, acPowerKw: 1.2,
  existingEvMonthlyKwh: 150, evHomeChargingFraction: 0.8, evDaytimeFraction: 0.3,
  pumpPowerKw: 0.5, pumpHoursPerDay: 2,
  plannedLoadChanges: [{ kind: 'ev', startDate: '2027-06-01', monthlyKwh: 200,
    homeChargingFraction: 0.9, daytimeFraction: 0.5 },
  { kind: 'air-conditioning', startDate: '2028-01-01', powerKw: 1, units: 1, hoursPerDay: 3, startHour: 10 }],
  panelTiltDegrees: 15, panelAzimuthDegrees: 180,
  quoteModuleCount: 10, quoteModuleWp: 550, quoteInverterAcKw: 5,
  quoteSystemKw: 5.5, quoteCashPriceThb: 150_000, quoteBatteryIncluded: false,
  quoteIncludesUtilityApplication: true, budgetThb: 200_000, discountRatePct: 4,
};
const fragment = (payload: unknown) => '#sm-estimate=' + encodeURIComponent(JSON.stringify(payload));

describe('strict frozen shared estimates v2', () => {
  it('round-trips modern inputs with literal model, assumptions and reference date', () => {
    const payload = permittedEstimateInputs(base);
    expect(payload).toMatchObject({ version: 2, modelVersion: sharedEstimateModelVersion,
      assumptionsVersion: sharedEstimateModelVersion, calculationReferenceDate: sharedEstimateReferenceDate });
    const url = new URL(sharedEstimateUrl(base, 'https://example.test', 'th'));
    expect(url.search).toBe('');
    const restored = restoreSharedEstimate(url.hash);
    expect(restored).toMatchObject(base);
    expect(restored.quoteContactRequested).toBe(false);
    expect(restored.quoteConsentAccepted).toBeUndefined();
    const before = calculateEstimate(base), after = calculateEstimate(restored);
    expect(after.modelVersion).toBe('residential-hourly-2026-10-17-v3');
    expect(after.calculationReferenceDate).toBe('2026-10-17');
    expect(after.calculatedAt).toBe('2026-10-17T00:00:00Z');
    expect(after.planningMonthlySavingsThb).toBe(before.planningMonthlySavingsThb);
    expect(after.planningInstalledCostThb).toBe(before.planningInstalledCostThb);
    expect(after.planningTwentyFiveYearNetBenefitThb).toBe(before.planningTwentyFiveYearNetBenefitThb);
    expect(after.energy).toEqual(before.energy);
    expect(after.lifetimeCostSeries).toEqual(before.lifetimeCostSeries);
  });

  it('uses v2 for new answers without model metadata and rejects unsupported explicit metadata', () => {
    const newAnswers = { ...base };
    delete newAnswers.estimateModelVersion;
    expect(permittedEstimateInputs(newAnswers).version).toBe(2);
    delete newAnswers.calculationReferenceDate;
    expect(() => permittedEstimateInputs(newAnswers)).toThrow('missing_shared_reference_date');
    expect(() => permittedEstimateInputs({ ...base, calculationReferenceDate: '2027-01-01' })).toThrow('unsupported_shared_reference_date');
    expect(() => permittedEstimateInputs({ ...base, estimateModelVersion: 'unknown' } as unknown as EstimateAnswers)).toThrow('unsupported_shared_model');
  });

  it('preserves a distinct explicit reference day within the verified period without moving it to a default', () => {
    const payload = permittedEstimateInputs({ ...base, calculationReferenceDate: '2026-10-18' });
    expect(payload).toHaveProperty('calculationReferenceDate', '2026-10-18');
    expect(restoreSharedEstimate(fragment(payload)).calculationReferenceDate).toBe('2026-10-18');
    for (const date of ['2026-05-01', '2026-12-31']) {
      const boundary = permittedEstimateInputs({ ...base, calculationReferenceDate: date });
      expect(restoreSharedEstimate(fragment(boundary)).calculationReferenceDate).toBe(date);
    }
    for (const date of ['2026-04-30', '2027-01-01', '2026-06-31']) {
      expect(() => permittedEstimateInputs({ ...base, calculationReferenceDate: date })).toThrow('unsupported_shared_reference_date');
    }
  });

  it('shares meter-only consumption without inventing a supplied bill amount', () => {
    const payload = permittedEstimateInputs({ ...base, monthlyBillThb: 0 });
    const restored = restoreSharedEstimate(fragment(payload));
    expect(restored.monthlyBillThb).toBe(0);
    expect(restored.consumptionInput).toBe('kwh');
    expect(restored.monthlyConsumptionKwh).toBe(base.monthlyConsumptionKwh);
    expect(() => restoreSharedEstimate(fragment({ ...payload, inputs: { ...payload.inputs, consumptionInput: 'bill' } }))).toThrow();
  });

  it('omits all contact, consent, free text, exact location, tokens, tax and finance fields at every generated level', () => {
    const source = { ...base,
      quoteContactRequested: true, quoteConsentAccepted: true,
      customLocation: 'PRIVATE LOCATION', customProvince: 'PRIVATE PROVINCE', postcode: '10120',
      customPropertyType: 'PRIVATE PROPERTY', customDaytimeLoad: 'PRIVATE EQUIPMENT', customRoofMaterial: 'PRIVATE ROOF',
      phone: '0812345678', email: 'PRIVATE@example.test', fullName: 'PRIVATE NAME', contactName: 'PRIVATE CONTACT',
      address: 'PRIVATE ADDRESS', latitude: 13.7, longitude: 100.5,
      location: { address: 'PRIVATE LOCATION', latitude: 13.7, longitude: 100.5, province: 'bangkok',
        source: 'manual-map' as const, confirmed: true },
      token: 'PRIVATE TOKEN', assessmentToken: 'PRIVATE ASSESSMENT', assessmentTokenExpiresAt: '2030-01-01',
      taxIncomeBaht: 800_000, netTaxableIncomeBeforeSolarBaht: 800_000,
      taxFacts: { personalTaxpayer: true }, qualifyingSpendBaht: 200_000,
      finance: { annualRatePercent: 5 }, depositBaht: 20_000, actualMonthlyPaymentBaht: 4_000,
      monthlyRecords: [{ month: 1, kwh: 900, periodDays: 31, taxIncomeBaht: 800_000, note: 'PRIVATE MONTH' }],
      plannedLoadChanges: [{ kind: 'ev' as const, startDate: '2027-06-01', monthlyKwh: 200,
        token: 'PRIVATE LOAD', address: 'PRIVATE ADDRESS' }],
    };
    const payload = permittedEstimateInputs(source);
    const encoded = JSON.stringify(payload);
    for (const forbidden of ['PRIVATE', '0812345678', 'customLocation', 'customProvince', 'postcode',
      'customPropertyType', 'customDaytimeLoad', 'customRoofMaterial', 'quoteContactRequested', 'quoteConsentAccepted',
      'phone', 'email', 'fullName', 'contactName', 'address', 'latitude', 'longitude', 'location', 'token',
      'assessmentToken', 'assessmentTokenExpiresAt', 'taxIncomeBaht', 'netTaxableIncomeBeforeSolarBaht',
      'taxFacts', 'qualifyingSpendBaht', 'finance', 'depositBaht', 'actualMonthlyPaymentBaht', 'note']) {
      expect(encoded).not.toContain(forbidden);
    }
    expect(payload.inputs).toMatchObject({ budgetThb: 200_000, quoteCashPriceThb: 150_000,
      daylightAcUnits: 2, monthlyRecords: [{ month: 1, kwh: 900, periodDays: 31 }] });
    const restored = restoreSharedEstimate(fragment(payload));
    expect(restored.quoteContactRequested).toBe(false);
    expect(restored.quoteConsentAccepted).toBeUndefined();
    expect(restored.location).toBeUndefined();
  });

  it('shares only configured coarse districts, omitting an arbitrary district string', () => {
    const payload = permittedEstimateInputs({ ...base, district: 'PRIVATE ADDRESS' });
    expect(payload.inputs.district).toBeUndefined();
    expect(restoreSharedEstimate(fragment(payload)).district).toBe('not-shared');
    expect(() => restoreSharedEstimate(fragment({ ...payload, inputs: { ...payload.inputs, district: 'unconfigured' } }))).toThrow('invalid_shared_district');
  });

  it('rejects unknown payload, model, assumptions and reference versions instead of recalculating silently', () => {
    const payload = permittedEstimateInputs(base);
    for (const patch of [{ version: 3 }, { modelVersion: 'new-model' },
      { assumptionsVersion: 'new-assumptions' }, { calculationReferenceDate: '2027-01-01' },
      { modelVersion: undefined }, { assumptionsVersion: undefined }, { calculationReferenceDate: undefined }]) {
      expect(() => restoreSharedEstimate(fragment({ ...payload, ...patch }))).toThrow();
    }
  });

  it('strictly rejects externally supplied unknown/private fields including nested fields', () => {
    const payload = permittedEstimateInputs(base);
    for (const mutated of [
      { ...payload, token: 'private' },
      { ...payload, inputs: { ...payload.inputs, quoteConsentAccepted: true } },
      { ...payload, inputs: { ...payload.inputs, netTaxableIncomeBeforeSolarBaht: 800_000 } },
      { ...payload, inputs: { ...payload.inputs, location: { latitude: 13.7 } } },
      { ...payload, inputs: { ...payload.inputs, monthlyRecords: [{ month: 1, kwh: 2, periodDays: 30, address: 'private' }] } },
      { ...payload, inputs: { ...payload.inputs, plannedLoadChanges: [{ kind: 'ev', startDate: '2027-06-01', note: 'private' }] } },
    ]) expect(() => restoreSharedEstimate(fragment(mutated))).toThrow();
  });

  it('bounds and validates all record arrays, dates, fractions, hours and module counts', () => {
    const payload = permittedEstimateInputs(base);
    for (const patch of [
      { monthlyRecords: Array.from({ length: 13 }, (_, index) => ({ month: index % 12 + 1, kwh: 100, periodDays: 30 })) },
      { monthlyRecords: [{ month: 1, kwh: 100, periodDays: 30 }, { month: 1, kwh: 200, periodDays: 30 }] },
      { monthlyRecords: [{ month: 13, kwh: 100, periodDays: 30 }] },
      { monthlyRecords: [{ month: 1, kwh: 100, periodDays: 0 }] },
      { plannedLoadChanges: Array.from({ length: 7 }, () => ({ kind: 'ev', startDate: '2027-06-01' })) },
      { billDate: '2026-02-30' }, { plannedLoadChanges: [{ kind: 'ev', startDate: 'tomorrow' }] },
      { evDaytimeFraction: 1.1 }, { daylightAcHours: 25 }, { panelTiltDegrees: 91 },
      { quoteModuleCount: 1.5 }, { quoteModuleWp: -550 },
    ]) expect(() => restoreSharedEstimate(fragment({ ...payload, inputs: { ...payload.inputs, ...patch } }))).toThrow();
  });

  it('keeps a full twelve-month and six-load payload within the 12,000-character cap', () => {
    const source = { ...base,
      monthlyRecords: Array.from({ length: 12 }, (_, index) => ({ month: index + 1, kwh: 1200.25, periodDays: 30 })),
      plannedLoadChanges: Array.from({ length: 6 }, () => ({ kind: 'ev' as const, startDate: '2027-06-01',
        monthlyKwh: 200, homeChargingFraction: 1, daytimeFraction: 0.5 })),
    };
    const hash = new URL(sharedEstimateUrl(source, 'https://example.test', 'en')).hash;
    expect(hash.slice('#sm-estimate='.length).length).toBeLessThanOrEqual(sharedEstimateMaximumEncodedLength);
    expect(restoreSharedEstimate(hash).monthlyRecords).toHaveLength(12);
    expect(restoreSharedEstimate(hash).plannedLoadChanges).toHaveLength(6);
  });

  it('rejects bad encoding, malformed JSON and oversized fragments', () => {
    for (const malformed of ['', '#sm-estimate=%xx', '#sm-estimate=%7B', '#sm-estimate=null',
      '#sm-estimate=' + 'a'.repeat(sharedEstimateMaximumEncodedLength + 1)]) {
      expect(() => restoreSharedEstimate(malformed)).toThrow();
    }
  });
});

describe('historic strict v1 sharing', () => {
  it('restores a historic v1 payload with explicit frozen legacy model and original figures', () => {
    const payload = permittedEstimateInputs({ ...designV2Example, estimateModelVersion: 'legacy-v5' });
    expect(payload.version).toBe(1);
    expect(payload).not.toHaveProperty('modelVersion');
    expect(payload).not.toHaveProperty('calculationReferenceDate');
    const restored = restoreSharedEstimate(fragment(payload));
    expect(restored.estimateModelVersion).toBe('legacy-v5');
    expect(restored.calculationReferenceDate).toBe('2026-10-17');
    const result = calculateEstimate(restored);
    expect(result.planningMonthlySavingsThb).toBe(1665);
    expect(result.planningInstalledCostThb).toBe(165000);
    expect(result.planningSystemKw).toBe(4.5);
    expect(calculateEstimate({ ...restored, monthlyBillThb: 2000 }).planningTwentyFiveYearNetBenefitThb).toBe(-9000);
  });

  it('keeps v1 field allowlist and strict rejection without modern reinterpretation', () => {
    const payload = permittedEstimateInputs({ ...base, estimateModelVersion: 'legacy-v5' });
    expect(payload.version).toBe(1);
    for (const modernField of ['consumptionInput', 'monthlyConsumptionKwh', 'billDate', 'monthlyRecords',
      'plannedLoadChanges', 'budgetThb', 'quoteModuleCount', 'quoteCashPriceThb', 'solarOnlyIllustration']) {
      expect(payload.inputs).not.toHaveProperty(modernField);
    }
    expect(() => restoreSharedEstimate(fragment({ ...payload, inputs: { ...payload.inputs, budgetThb: 1000 } }))).toThrow();
    expect(() => restoreSharedEstimate(fragment({ ...payload, calculationReferenceDate: '2026-10-17' }))).toThrow();
    const padded = '#sm-estimate=' + encodeURIComponent(JSON.stringify(payload) + ' '.repeat(5000));
    expect(() => restoreSharedEstimate(padded)).toThrow();
  });
});
