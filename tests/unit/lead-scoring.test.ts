import { describe, expect, it } from 'vitest';
import { calculateLeadAssessment, initialScoringConfiguration, validateScoringConfiguration } from '@/lib/qualification/scoring';
import { estimateAnswersSchema } from '@/lib/validation/estimate';
import type { EstimateAnswers } from '@/lib/calculator/types';

const strong: EstimateAnswers = {
  province: 'bangkok',
  monthlyBillThb: 15000,
  propertyType: 'large-home',
  ownershipStatus: 'owner',
  roofArea: '100-200',
  daytimePattern: 'very-high',
  daytimeLoads: ['air-conditioning', 'pump', 'ev', 'other-high-use'],
  customDaytimeLoad: 'Large residential water heater',
  airConditionerCount: 8,
  roofMaterial: 'concrete-tile',
  shade: 'almost-none',
  installationTimeframe: 'one-three-months',
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
      installationTimeframe: 'researching',
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
      customPropertyType: undefined,
      customRoofMaterial: undefined,
      customDaytimeLoad: undefined,
    });
    expect(invalid.success).toBe(false);
    if (!invalid.success) expect(invalid.error.issues.map((issue) => issue.path[0])).toEqual(expect.arrayContaining(['customLocation', 'customPropertyType', 'customRoofMaterial', 'customDaytimeLoad']));
  });

  it('rejects invalid weight totals before publication', () => {
    const invalid = structuredClone(initialScoringConfiguration);
    invalid.weights.location = 6;
    expect(validateScoringConfiguration(invalid)).toContain('Scoring weights must total exactly 100.');
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
