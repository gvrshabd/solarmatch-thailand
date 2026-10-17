import { afterEach, describe, expect, it, vi } from 'vitest';
import { calculatorV3Questionnaire, initialQuestionnaire, legacyQuestionnaireV1, legacyQuestionnaireV2, legacyQuestionnaireV3, legacyQuestionnaireV4, legacyQuestionnaireV5 } from '@/config/assessment';
import { questionnaireDocumentSchema } from '@/lib/questionnaire/validation';
import { estimateAnswersSchema, estimateDraftSchema, sanitizeEstimateDraftAnswers } from '@/lib/validation/estimate';

const runtime = vi.hoisted(() => ({
  INSTALLER_PLATFORM_MODE: 'sandbox', INSTALLER_BASE_URL: 'https://solarmatch-installer-staging.deluxejahseh.workers.dev',
  STAGING_ACCESS_AUD: 'staging-audience', ACCESS_AUD: 'admin-audience', ACCESS_TEAM_DOMAIN: 'https://access.example.test', ADMIN_EMAILS: 'reviewer@example.test',
}));
const databaseCall = vi.hoisted(() => vi.fn(() => { throw new Error('Preview must not access the database'); }));
vi.mock('@/lib/server/runtime', () => ({ getRuntimeEnv: () => runtime, requireDatabase: databaseCall }));
import { calculatorV3StagingPreviewConfiguration, getPublicAssessmentConfig } from '@/lib/server/releases';
afterEach(() => vi.useRealTimers());

const base = {
  province: 'bangkok', district: 'sathon', monthlyBillThb: 6000, activelyPlanningSolar: true,
  planningTimeframe: 'within-3-months', projectType: 'new-rooftop', propertyType: 'detached-home', ownershipStatus: 'owner',
  daytimePattern: 'high', daytimeLoads: ['air-conditioning'], airConditionerCount: 4,
  roofMaterial: 'concrete-tile', shade: 'almost-none', quoteContactRequested: false,
};

describe('calculator v3 schema and historic compatibility', () => {
  it('retains all published historic documents and validates separate twelve-question schema 10', () => {
    expect(initialQuestionnaire).toMatchObject({ id: 'residential-questionnaire-v6', schemaVersion: 9 });
    expect(initialQuestionnaire.questions).toHaveLength(11);
    expect([legacyQuestionnaireV1, legacyQuestionnaireV2, legacyQuestionnaireV3].map(document => [document.id, document.schemaVersion])).toEqual([
      ['residential-questionnaire-v1', 4], ['residential-questionnaire-v2', 5], ['residential-questionnaire-v3', 6],
    ]);
    // The existing generic validator rejects the old province conditional's
    // external "other" option; this change does not rewrite those documents.
    for (const document of [legacyQuestionnaireV4, legacyQuestionnaireV5, initialQuestionnaire, calculatorV3Questionnaire]) {
      const parsed = questionnaireDocumentSchema.safeParse(document);
      expect(parsed.success, `${document.id}: ${parsed.success ? '' : parsed.error.message}`).toBe(true);
    }
    expect(calculatorV3Questionnaire).toMatchObject({ id: 'residential-questionnaire-v7', schemaVersion: 10 });
    expect(calculatorV3Questionnaire.questions.map(question => question.id)).toEqual(['projectType', 'province', 'monthlyBillThb', 'daytimePattern', 'roofArea', 'shade', 'propertyType', 'ownershipStatus', 'activelyPlanningSolar', 'daytimeLoads', 'roofMaterial', 'quoteContactRequested']);
    expect(calculatorV3Questionnaire.questions.find(question => question.id === 'roofArea')!.options!.some(option => option.value === 'unsure')).toBe(true);
    expect(questionnaireDocumentSchema.safeParse({ ...calculatorV3Questionnaire, schemaVersion: 9 }).success).toBe(false);
    expect(questionnaireDocumentSchema.safeParse({ ...calculatorV3Questionnaire, questions: [...calculatorV3Questionnaire.questions].reverse() }).success).toBe(false);
  });

  it('preserves modern precision and reproducibility fields while stripping unknown income and nested tax data', () => {
    const input = { ...base, estimateModelVersion: 'energy-v3', roofArea: 'unsure', calculationReferenceDate: '2026-10-17', billDate: '2026-08-01',
      consumptionInput: 'kwh', monthlyConsumptionKwh: 800, billingPeriodDays: 30, tariffCategory: 'ordinary-1.2', utility: 'MEA',
      monthlyRecords: [{ month: 1, kwh: 900, periodDays: 31, income: 100000 }], weekendDaytimePattern: 'low',
      daylightAcUnits: 2, daylightAcHours: 3, acPowerKw: 0.8, existingEvMonthlyKwh: 200, evHomeChargingFraction: 0.5, evDaytimeFraction: 0.2,
      pumpPowerKw: 0.5, pumpHoursPerDay: 2, plannedLoadChanges: [{ kind: 'ev', startDate: '2027-07-01', monthlyKwh: 300, homeChargingFraction: 1, daytimeFraction: 0, taxIncome: 123 }],
      panelTiltDegrees: 0, panelAzimuthDegrees: 90, quoteModuleCount: 6, quoteModuleWp: 550, quoteInverterAcKw: 3,
      budgetThb: 150000, discountRatePct: 5, income: 500000, netTaxableIncomeBeforeSolarBaht: 500000 };
    const parsed = estimateAnswersSchema.parse(input);
    expect(parsed).toMatchObject({ estimateModelVersion: 'energy-v3', calculationReferenceDate: '2026-10-17', monthlyConsumptionKwh: 800, quoteInverterAcKw: 3, budgetThb: 150000, discountRatePct: 5 });
    expect(parsed.plannedLoadChanges![0]).toMatchObject({ kind: 'ev', startDate: '2027-07-01', monthlyKwh: 300 });
    expect(JSON.stringify(parsed)).not.toMatch(/income|taxIncome|netTaxableIncome/i);
  });

  it('keeps legacy roof-area omission valid but asks modern assessments for a roof answer', () => {
    expect(estimateAnswersSchema.safeParse(base).success).toBe(true);
    expect(estimateAnswersSchema.safeParse({ ...base, estimateModelVersion: 'legacy-v5' }).success).toBe(true);
    expect(estimateAnswersSchema.safeParse({ ...base, estimateModelVersion: 'energy-v3' }).success).toBe(false);
    expect(estimateAnswersSchema.safeParse({ ...base, estimateModelVersion: 'energy-v3', roofArea: 'unsure' }).success).toBe(true);
  });

  it('accepts authoritative meter kWh without inventing a supplied bill, while bill mode requires one', () => {
    const withoutBill = Object.fromEntries(Object.entries(base).filter(([key]) => key !== 'monthlyBillThb'));
    const parsed = estimateAnswersSchema.parse({ ...withoutBill, consumptionInput: 'kwh', monthlyConsumptionKwh: 600 });
    expect(parsed.consumptionInput).toBe('kwh');
    expect(parsed.monthlyConsumptionKwh).toBe(600);
    expect(parsed.monthlyBillThb).toBe(0); // compatibility sentinel, not a bill estimate
    expect(estimateAnswersSchema.safeParse(withoutBill).success).toBe(false);
    expect(estimateAnswersSchema.safeParse({ ...withoutBill, consumptionInput: 'bill' }).success).toBe(false);
    expect(estimateAnswersSchema.safeParse({ ...withoutBill, consumptionInput: 'kwh', monthlyConsumptionKwh: 0 }).success).toBe(false);
    expect(sanitizeEstimateDraftAnswers({ consumptionInput: 'kwh', monthlyConsumptionKwh: 600 })).toEqual({ consumptionInput: 'kwh', monthlyConsumptionKwh: 600 });
  });

  it.each([
    { billDate: '2026-02-30' }, { monthlyConsumptionKwh: Infinity }, { billingPeriodDays: 0 },
    { evDaytimeFraction: 1.1 }, { daylightAcHours: 25 }, { daylightAcUnits: 5, daylightAcHours: 2 },
    { consumptionInput: 'kwh' }, { pumpPowerKw: 1 },
    { monthlyRecords: [{ month: 1, kwh: 50, periodDays: 30 }, { month: 1, kwh: 60, periodDays: 30 }] },
    { plannedLoadChanges: [{ kind: 'ev', startDate: '2027-01-01' }] },
    { plannedLoadChanges: [{ kind: 'pump', startDate: '2027-01-01', powerKw: 1 }] },
  ])('rejects invalid quantities or incomplete schedules %j', change => {
    expect(estimateAnswersSchema.safeParse({ ...base, ...change }).success).toBe(false);
  });

  it('whitelists valid partial draft fields and drops unknown or individually invalid values', () => {
    const raw = { version: 10, answers: { estimateModelVersion: 'energy-v3', billDate: '2026-10-17', monthlyBillThb: 6000,
      monthlyConsumptionKwh: NaN, evDaytimeFraction: 2, roofArea: 'unsure', income: 500000,
      plannedLoadChanges: [{ kind: 'ev', startDate: '2027-01-01', monthlyKwh: 100, taxIncome: 500000 }] }, step: 3 };
    const draft = estimateDraftSchema.parse(raw);
    expect(draft.answers).toEqual({ estimateModelVersion: 'energy-v3', billDate: '2026-10-17', monthlyBillThb: 6000, roofArea: 'unsure',
      plannedLoadChanges: [{ kind: 'ev', startDate: '2027-01-01', monthlyKwh: 100 }] });
    expect(sanitizeEstimateDraftAnswers(null)).toEqual({});
    expect(sanitizeEstimateDraftAnswers({ arbitrary: 'do not preserve', quoteCashPriceThb: 123456.78 })).toEqual({ quoteCashPriceThb: 123456.78 });
  });
});

describe('read-only protected staging questionnaire preview', () => {
  it('returns bill-first v8 with no database initialization, tokens, live contact or operational sharing', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-16T17:00:00Z'));
    const request = new Request(`${runtime.INSTALLER_BASE_URL}/api/assessment/config`);
    const config = await getPublicAssessmentConfig({ restrictedAccess: true, request });
    expect(config).toMatchObject({ questionnaireVersionId: 'residential-questionnaire-v8', calculatorModelVersion: 'energy-v3', calculationReferenceDate: '2026-10-17',
      contactReviewAvailable: true,
      assessmentToken: null, assessmentTokenExpiresAt: null, liveLeadSubmissions: false, restrictedSiteCollectionEnabled: false, publicCollectionEnabled: false,
      contact: { enabled: false, preview: true, mode: 'disabled', operationalDistributionEnabled: false, sharedFields: [], permittedContactMethods: [] } });
    expect(databaseCall).not.toHaveBeenCalled();
  });

  it('uses the current Thai date for each new staging preview without changing source versions', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-12-31T17:00:00Z'));
    const request = new Request(`${runtime.INSTALLER_BASE_URL}/api/assessment/config`);
    const config = await calculatorV3StagingPreviewConfiguration({ restrictedAccess: true, request }, runtime);
    expect(config).toMatchObject({ calculationReferenceDate: '2027-01-01', questionnaireVersionId: 'residential-questionnaire-v8', assessmentToken: null });
    expect(databaseCall).not.toHaveBeenCalled();
  });

  it('requires the exact staging sandbox, origin and verified restricted access', async () => {
    const request = new Request(`${runtime.INSTALLER_BASE_URL}/api/assessment/config`);
    expect(await calculatorV3StagingPreviewConfiguration({ request }, runtime)).toBeNull();
    expect(await calculatorV3StagingPreviewConfiguration({ restrictedAccess: true, request }, { ...runtime, INSTALLER_PLATFORM_MODE: 'production' })).toBeNull();
    expect(await calculatorV3StagingPreviewConfiguration({ restrictedAccess: true, request: new Request('https://example.test/api/assessment/config') }, runtime)).toBeNull();
    expect(await calculatorV3StagingPreviewConfiguration({ restrictedAccess: true, request }, { ...runtime, STAGING_ACCESS_AUD: '' })).toBeNull();
    expect(await calculatorV3StagingPreviewConfiguration({ restrictedAccess: true, request }, { ...runtime, ADMIN_EMAILS: '' })).toBeNull();
    expect(databaseCall).not.toHaveBeenCalled();
  });
});
