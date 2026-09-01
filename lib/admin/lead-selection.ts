export type LegacyExportScope = 'solar_match_validation_followup' | 'named_installer_handoff';

export type LeadSelectionRecord = {
  contact_collection_mode: 'validation_interest' | 'named_installer_handoff' | 'shared_solar_company_handoff';
  contact_configuration_version_id: string;
  solar_match_followup_authorized: number;
  third_party_disclosure_authorized: number;
  is_test_submission: number;
  distribution_allowed: number;
  suppressed: number;
  hard_eligible: number;
  quality_score: number;
  selection_override: string | null;
};

export function isLegacyExportCompatible(lead: LeadSelectionRecord, exportScope: LegacyExportScope, recipientKey: string) {
  if (lead.is_test_submission || !lead.distribution_allowed || lead.suppressed) return false;
  if (exportScope === 'solar_match_validation_followup') {
    return lead.contact_collection_mode === 'validation_interest'
      && Boolean(lead.solar_match_followup_authorized)
      && !lead.third_party_disclosure_authorized;
  }
  return lead.contact_collection_mode === 'named_installer_handoff'
    && Boolean(lead.third_party_disclosure_authorized)
    && Boolean(recipientKey)
    && lead.contact_configuration_version_id === recipientKey;
}

export function resolveAdministratorReviewSelection(lead: LeadSelectionRecord, automaticSelectionThreshold: number) {
  const automatic = !lead.is_test_submission
    && !lead.suppressed
    && Boolean(lead.hard_eligible)
    && lead.quality_score >= automaticSelectionThreshold;
  const selected = lead.selection_override === 'selected'
    || (lead.selection_override !== 'deselected' && automatic);
  const reason = lead.selection_override === 'selected'
    ? 'Manually selected for administrator review'
    : lead.selection_override === 'deselected'
      ? 'Manually deselected from administrator review'
      : automatic
        ? `Automatic review selection: sellable and ${automaticSelectionThreshold}/5 or above`
        : 'Not automatically selected for review';
  return { automatic, selected, reason };
}
