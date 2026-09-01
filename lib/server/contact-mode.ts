import { contactContent, type ContactContent } from '@/config/contact-content';
import type { ContactCollectionMode, LocalizedText, PublicContactConfiguration } from '@/lib/questionnaire/types';

export type ContactConfigurationRow = {
  contact_configuration_version_id: string | null;
  contact_collection_mode: ContactCollectionMode | null;
  contact_collection_enabled: number | null;
  restricted_site_collection_enabled?: number | null;
  public_collection_enabled?: number | null;
  retention_days: number | null;
  distribution_window_days?: number | null;
  recipient_category?: string | null;
  receiving_company_en: string | null;
  receiving_company_th: string | null;
  receiving_company_privacy_url: string | null;
  permitted_contact_methods_json: string | null;
  shared_fields_json: string | null;
  adult_confirmation_version_id?: string | null;
  consent_version_id?: string | null;
  privacy_notice_version_id?: string | null;
  terms_version_id?: string | null;
  cookie_policy_version_id?: string | null;
  readiness_state?: 'incomplete' | 'ready' | 'active' | null;
  active_partner_count?: number | null;
  legal_complete: number;
  content_version_id: string;
  legal_document_version_id: string;
  content_json: string;
};

export type ContactReadiness = {
  active: boolean;
  mode: ContactCollectionMode;
  issues: string[];
};

function isLocalizedText(value: unknown): value is LocalizedText {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.en === 'string' && candidate.en.length > 0 && typeof candidate.th === 'string' && candidate.th.length > 0;
}

function resolvedContent(value: string): ContactContent {
  try {
    const parsed = JSON.parse(value) as Partial<ContactContent>;
    const modes = parsed.contactModes;
    if (!modes) return contactContent;
    const validation = modes.validation_interest;
    const named = modes.named_installer_handoff;
    const common = modes.common;
    const modeKeys = ['question', 'help', 'yesLabel', 'noLabel', 'consent'] as const;
    const shared = modes.shared_solar_company_handoff;
    const commonKeys = ['declineTitle', 'declineBody', 'declineContinueLabel', 'skipLabel', 'failureTitle', 'failureBody', 'adultConfirmation'] as const;
    if (!modeKeys.every((key) => isLocalizedText(validation?.[key])) || !modeKeys.every((key) => isLocalizedText(named?.[key])) || !modeKeys.every((key) => isLocalizedText(shared?.[key])) || !commonKeys.every((key) => isLocalizedText(common?.[key]))) return contactContent;
    return { ...contactContent, ...parsed, contactModes: modes } as ContactContent;
  } catch { return contactContent; }
}

function interpolate(value: LocalizedText, recipient: LocalizedText): LocalizedText {
  return {
    en: value.en.replaceAll('{{recipient}}', recipient.en),
    th: value.th.replaceAll('{{recipient}}', recipient.th),
  };
}

function parseStringArray(value: string | null, fallback: string[]) {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string') ? parsed : fallback;
  } catch { return fallback; }
}

export function assessContactReadiness(row: ContactConfigurationRow): ContactReadiness {
  const mode = row.contact_collection_mode ?? 'disabled';
  const issues: string[] = [];
  if (mode === 'disabled') return { active: false, mode, issues };
  if (!row.contact_collection_enabled) issues.push('contact configuration is not explicitly enabled');
  if (!row.public_collection_enabled) issues.push('public collection is not explicitly enabled');
  if (!row.legal_complete) issues.push('legal operator and privacy information is incomplete');
  if (!row.retention_days) issues.push('retention period is missing');
  if (!row.adult_confirmation_version_id) issues.push('adult confirmation version is missing');
  if (!row.consent_version_id) issues.push('consent version is missing');
  if (mode === 'validation_interest') {
    if (row.receiving_company_en || row.receiving_company_th || row.receiving_company_privacy_url) issues.push('validation mode cannot name an installer recipient');
  }
  if (mode === 'named_installer_handoff') {
    if (!row.receiving_company_en || !row.receiving_company_th) issues.push('installer legal name is incomplete');
    if (!row.receiving_company_privacy_url) issues.push('installer privacy notice is missing');
  }
  if (mode === 'shared_solar_company_handoff') {
    if (!row.distribution_window_days) issues.push('distribution period is missing');
    if (row.recipient_category !== 'participating_residential_solar_companies') issues.push('recipient category must be participating residential solar companies');
    if (!row.privacy_notice_version_id || !row.terms_version_id || !row.cookie_policy_version_id) issues.push('published legal-document versions are incomplete');
    if (!row.active_partner_count) issues.push('no active contracted solar company is available');
  }
  return { active: issues.length === 0, mode, issues };
}

export function publicContactConfiguration(row: ContactConfigurationRow): PublicContactConfiguration {
  const readiness = assessContactReadiness(row);
  const copy = resolvedContent(row.content_json).contactModes;
  const methods = parseStringArray(row.permitted_contact_methods_json, ['phone', 'line']).filter((value): value is 'phone' | 'line' => value === 'phone' || value === 'line');
  const sharedFields = parseStringArray(row.shared_fields_json, ['legalFirstName', 'legalLastName', 'phone', 'preferredContactMethod', 'lineId', 'assessmentAnswers']);
  const disabled: PublicContactConfiguration = {
    enabled: false,
    preview: false,
    restrictedSiteCollectionEnabled: Boolean(row.restricted_site_collection_enabled),
    publicCollectionEnabled: Boolean(row.public_collection_enabled),
    operationalDistributionEnabled: false,
    mode: readiness.mode,
    contactConfigurationVersionId: row.contact_configuration_version_id ?? 'contact-configuration-v1',
    contentVersionId: row.content_version_id,
    privacyVersion: row.legal_document_version_id,
    retentionDays: row.retention_days,
    distributionWindowDays: row.distribution_window_days ?? null,
    recipientCategory: row.recipient_category ?? null,
    adultConfirmationVersionId: row.adult_confirmation_version_id ?? null,
    consentVersionId: row.consent_version_id ?? null,
    privacyNoticeVersionId: row.privacy_notice_version_id ?? null,
    termsVersionId: row.terms_version_id ?? null,
    cookiePolicyVersionId: row.cookie_policy_version_id ?? null,
    question: null, help: null, yesLabel: null, noLabel: null, consent: null, recipient: null,
    ...copy.common,
    permittedContactMethods: methods,
    sharedFields,
  };
  if (!readiness.active) return disabled;
  if (readiness.mode === 'validation_interest') return { ...disabled, enabled: true, ...copy.validation_interest };
  if (readiness.mode === 'shared_solar_company_handoff') return { ...disabled, enabled: true, operationalDistributionEnabled: true, ...copy.shared_solar_company_handoff };
  const recipient = { en: row.receiving_company_en!, th: row.receiving_company_th! };
  return {
    ...disabled,
    enabled: true,
    operationalDistributionEnabled: true,
    question: interpolate(copy.named_installer_handoff.question, recipient),
    help: interpolate(copy.named_installer_handoff.help, recipient),
    yesLabel: copy.named_installer_handoff.yesLabel,
    noLabel: copy.named_installer_handoff.noLabel,
    consent: interpolate(copy.named_installer_handoff.consent, recipient),
    recipient: { name: recipient, privacyUrl: row.receiving_company_privacy_url! },
  };
}

/**
 * Builds the operational owner-only experience without broadening collection
 * to anonymous visitors. The request must already have passed the separate
 * whole-site Access assertion check before this function is used.
 */
export function restrictedOperationalContactConfiguration(row: ContactConfigurationRow): PublicContactConfiguration {
  const baseline = publicContactConfiguration(row);
  const copy = resolvedContent(row.content_json).contactModes;
  if (!row.restricted_site_collection_enabled || !row.contact_collection_enabled || row.contact_collection_mode === 'disabled') {
    return baseline;
  }
  return {
    ...baseline,
    enabled: true,
    preview: false,
    restrictedSiteCollectionEnabled: true,
    operationalDistributionEnabled: true,
    mode: 'shared_solar_company_handoff',
    retentionDays: row.retention_days,
    distributionWindowDays: row.distribution_window_days ?? null,
    recipientCategory: 'participating_residential_solar_companies',
    adultConfirmationVersionId: row.adult_confirmation_version_id ?? 'restricted-operational-adult-v1',
    consentVersionId: row.consent_version_id ?? 'restricted-operational-consent-v2',
    privacyNoticeVersionId: row.privacy_notice_version_id ?? row.legal_document_version_id,
    termsVersionId: row.terms_version_id ?? null,
    cookiePolicyVersionId: row.cookie_policy_version_id ?? null,
    question: copy.shared_solar_company_handoff.question,
    help: copy.shared_solar_company_handoff.help,
    yesLabel: copy.shared_solar_company_handoff.yesLabel,
    noLabel: copy.shared_solar_company_handoff.noLabel,
    consent: copy.shared_solar_company_handoff.consent,
    recipient: null,
  };
}

export function consentSnapshot(configuration: PublicContactConfiguration) {
  if (!configuration.enabled || configuration.mode === 'disabled' || !configuration.consent) throw new Error('Contact collection is unavailable.');
  return {
    contactMode: configuration.mode,
    consentScope: configuration.mode === 'validation_interest' ? 'solar_match_validation_followup' : configuration.mode === 'shared_solar_company_handoff' ? 'shared_residential_solar_referral' : 'named_installer_site_assessment',
    solarMatchFollowupAuthorized: configuration.mode === 'validation_interest',
    thirdPartyDisclosureAuthorized: configuration.mode !== 'validation_interest',
    recipient: configuration.recipient,
    recipientCategory: configuration.recipientCategory,
    consentText: configuration.consent,
    adultConfirmationText: configuration.adultConfirmation,
  } as const;
}
