import { describe, expect, it } from 'vitest';
import { calculateLeadAssessment, initialScoringConfiguration, legacyScoringConfigurationV1, validateScoringConfiguration } from '@/lib/qualification/scoring';
import { initialQuestionnaire, legacyQuestionnaireV1, legacyQuestionnaireV2, legacyQuestionnaireV3 } from '@/config/assessment';
import { estimateAnswersSchema } from '@/lib/validation/estimate';
import type { EstimateAnswers } from '@/lib/calculator/types';

const strong: EstimateAnswers = {
  province: 'bangkok',
  district: 'sathon',
  monthlyBillThb: 15000,
  activelyPlanningSolar: true,
  planningTimeframe: 'within-3-months',
  projectType: 'new-rooftop',
  propertyType: 'large-home',
  ownershipStatus: 'owner',
  roofArea: '100-200',
  daytimePattern: 'very-high',
  daytimeLoads: ['air-conditioning', 'pump', 'ev', 'other-high-use'],
  customDaytimeLoad: 'Large residential water heater',
  airConditionerCount: 8,
  roofMaterial: 'concrete-tile',
  shade: 'almost-none',
  quoteContactRequested: false,
};

describe('residential lead qualification and scoring', () => {
  it('scores the strong eight-AC household at approximately 5/5', () => {
    const assessment = calculateLeadAssessment(strong);
    expect(assessment.qualityScore).toBe(5);
    expect(assessment.hardEligible).toBe(true);
    expect(assessment.rawPoints).toBeGreaterThanOrEqual(80);
  });

  it('keeps a renter non-sellable even when the raw quality score is high', () => {
    const assessment = calculateLeadAssessment({ ...strong, ownershipStatus: 'renter' });
    expect(assessment.hardEligible).toBe(false);
    expect(assessment.eligibilityReasons.find((reason) => reason.key === 'owner')?.passed).toBe(false);
  });

  it('enforces the four-AC hard minimum independently of quality', () => {
    expect(calculateLeadAssessment({ ...strong, airConditionerCount: 2 }).hardEligible).toBe(false);
    expect(calculateLeadAssessment({ ...strong, airConditionerCount: 4 }).hardEligible).toBe(true);
  });

  it('scores two ACs, heavy shade, light use and limited roof area at 2/5 or lower', () => {
    const assessment = calculateLeadAssessment({
      ...strong,
      monthlyBillThb: 1800,
      propertyType: 'townhouse',
      roofArea: 'under-30',
      daytimePattern: 'low',
      daytimeLoads: ['air-conditioning'],
      airConditionerCount: 2,
      shade: 'a-lot',
    });
    expect(assessment.qualityScore).toBeLessThanOrEqual(2);
    expect(assessment.hardEligible).toBe(false);
  });

  it('requires all conditional residential details', () => {
    const invalid = estimateAnswersSchema.safeParse({
      ...strong,
      province: 'other',
      propertyType: 'other-residential',
      roofMaterial: 'other',
      daytimeLoads: ['air-conditioning', 'other-high-use'],
      customLocation: undefined,
      customProvince: undefined,
      district: 'mueang',
      customPropertyType: undefined,
      customRoofMaterial: undefined,
      customDaytimeLoad: undefined,
    });
    expect(invalid.success).toBe(false);
    if (!invalid.success) expect(invalid.error.issues.map((issue) => issue.path[0])).toEqual(expect.arrayContaining(['customProvince', 'customPropertyType', 'customRoofMaterial', 'customDaytimeLoad']));
  });

  it('rejects invalid weight totals before publication', () => {
    const invalid = structuredClone(initialScoringConfiguration);
    invalid.weights.location = 6;
    expect(validateScoringConfiguration(invalid)).toContain('Scoring weights must total exactly 100.');
  });

  it('publishes the ten-question schema-v7 flow while preserving historic versions', () => {
    expect(initialQuestionnaire).toMatchObject({ id: 'residential-questionnaire-v4', schemaVersion: 7 });
    expect(initialQuestionnaire.questions).toHaveLength(10);
    expect(initialQuestionnaire.questions[2]?.id).toBe('activelyPlanningSolar');
    expect(initialQuestionnaire.questions.at(-1)?.id).toBe('quoteContactRequested');
    expect(initialQuestionnaire.questions.some((question) => question.id === 'installationTimeframe')).toBe(false);
    expect(initialQuestionnaire.questions.some((question) => question.id === 'roofArea')).toBe(false);
    expect(legacyQuestionnaireV3.questions).toHaveLength(11);
    expect(legacyQuestionnaireV2.questions).toHaveLength(9);
    expect(legacyQuestionnaireV1.questions).toHaveLength(10);
    expect(legacyQuestionnaireV1.questions.at(-1)?.id).toBe('installationTimeframe');
  });

  it('keeps exact v4 weights at 100 and preserves the historic timeframe-weighted rules', () => {
    expect(Object.values(initialScoringConfiguration.weights).reduce((sum, value) => sum + value, 0)).toBe(100);
    expect(initialScoringConfiguration.weights).toEqual({ ownership: 10, activePlanning: 10, airConditioners: 16, monthlyBill: 15, daytimeUse: 12, daytimeLoads: 5, roofArea: 10, shade: 10, roofMaterial: 4, propertyType: 4, location: 4 });
    expect(legacyScoringConfigurationV1.weights.timeframe).toBe(5);
    expect(Object.values(legacyScoringConfigurationV1.weights).reduce((sum, value) => sum + value, 0)).toBe(100);
  });

  it('rejects overlapping score bands and unsafe automatic-selection thresholds', () => {
    const invalid = structuredClone(initialScoringConfiguration);
    invalid.highQualityThreshold = 5;
    invalid.automaticSelectionThreshold = 4;
    invalid.bands[1].min = 20;
    const errors = validateScoringConfiguration(invalid);
    expect(errors).toContain('Automatic selection cannot be below the high-quality threshold.');
    expect(errors).toContain('Score bands must cover every point from 0 through 100 exactly once without gaps or overlaps.');
  });
});
