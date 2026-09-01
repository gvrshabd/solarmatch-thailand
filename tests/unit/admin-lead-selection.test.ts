import { describe, expect, it } from 'vitest';
import { isLegacyExportCompatible, resolveAdministratorReviewSelection, type LeadSelectionRecord } from '@/lib/admin/lead-selection';

function lead(overrides: Partial<LeadSelectionRecord> = {}): LeadSelectionRecord {
  return {
    contact_collection_mode: 'shared_solar_company_handoff',
    contact_configuration_version_id: 'contact-configuration-consent-v2',
    solar_match_followup_authorized: 0,
    third_party_disclosure_authorized: 1,
    is_test_submission: 0,
    distribution_allowed: 1,
    suppressed: 0,
    hard_eligible: 1,
    quality_score: 4,
    selection_override: null,
    ...overrides,
  };
}

describe('administrator lead review selection', () => {
  it('selects strong shared-mode leads for review without treating selection as a legacy export', () => {
    expect(resolveAdministratorReviewSelection(lead(), 4)).toMatchObject({ automatic: true, selected: true });
    expect(isLegacyExportCompatible(lead(), 'solar_match_validation_followup', '')).toBe(false);
  });

  it('honors manual selection and deselection independently of delivery compatibility', () => {
    expect(resolveAdministratorReviewSelection(lead({ hard_eligible: 0, quality_score: 2, selection_override: 'selected' }), 4).selected).toBe(true);
    expect(resolveAdministratorReviewSelection(lead({ selection_override: 'deselected' }), 4).selected).toBe(false);
  });

  it('keeps legacy export checks strict', () => {
    const validation = lead({ contact_collection_mode: 'validation_interest', solar_match_followup_authorized: 1, third_party_disclosure_authorized: 0 });
    expect(isLegacyExportCompatible(validation, 'solar_match_validation_followup', '')).toBe(true);
    expect(isLegacyExportCompatible({ ...validation, suppressed: 1 }, 'solar_match_validation_followup', '')).toBe(false);
  });
});
