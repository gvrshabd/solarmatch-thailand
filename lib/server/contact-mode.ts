import { contactContent, type ContactContent } from '@/config/contact-content';
import type { ContactCollectionMode, LocalizedText, PublicContactConfiguration } from '@/lib/questionnaire/types';

export type ContactConfigurationRow = {
  contact_configuration_version_id: string | null;
  contact_collection_mode: ContactCollectionMode | null;
  contact_collection_enabled: number | null;
  retention_days: number | null;
  receiving_company_en: string | null;
  receiving_company_th: string | null;
  receiving_company_privacy_url: string | null;
  permitted_contact_methods_json: string | null;
  shared_fields_json: string | null;
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
    const commonKeys = ['declineTitle', 'declineBody', 'declineContinueLabel', 'skipLabel', 'failureTitle', 'failureBody'] as const;
    if (!modeKeys.every((key) => isLocalizedText(validation?.[key])) || !modeKeys.every((key) => isLocalizedText(named?.[key])) || !commonKeys.every((key) => isLocalizedText(common?.[key]))) return contactContent;
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
  if (!row.legal_complete) issues.push('legal operator and privacy information is incomplete');
  if (!row.retention_days) issues.push('retention period is missing');
  if (mode === 'validation_interest') {
    if (row.receiving_company_en || row.receiving_company_th || row.receiving_company_privacy_url) issues.push('validation mode cannot name an installer recipient');
  }
  if (mode === 'named_installer_handoff') {
    if (!row.receiving_company_en || !row.receiving_company_th) issues.push('installer legal name is incomplete');
    if (!row.receiving_company_privacy_url) issues.push('installer privacy notice is missing');
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
    mode: readiness.mode,
    contactConfigurationVersionId: row.contact_configuration_version_id ?? 'contact-configuration-v1',
    contentVersionId: row.content_version_id,
    privacyVersion: row.legal_document_version_id,
    retentionDays: row.retention_days,
    question: null, help: null, yesLabel: null, noLabel: null, consent: null, recipient: null,
    ...copy.common,
    permittedContactMethods: methods,
    sharedFields,
  };
  if (!readiness.active) return disabled;
  if (readiness.mode === 'validation_interest') return { ...disabled, enabled: true, ...copy.validation_interest };
  const recipient = { en: row.receiving_company_en!, th: row.receiving_company_th! };
  return {
    ...disabled,
    enabled: true,
    question: interpolate(copy.named_installer_handoff.question, recipient),
    help: interpolate(copy.named_installer_handoff.help, recipient),
    yesLabel: copy.named_installer_handoff.yesLabel,
    noLabel: copy.named_installer_handoff.noLabel,
    consent: interpolate(copy.named_installer_handoff.consent, recipient),
    recipient: { name: recipient, privacyUrl: row.receiving_company_privacy_url! },
  };
}

export function consentSnapshot(configuration: PublicContactConfiguration) {
  if (!configuration.enabled || configuration.mode === 'disabled' || !configuration.consent) throw new Error('Contact collection is unavailable.');
  return {
    contactMode: configuration.mode,
    consentScope: configuration.mode === 'validation_interest' ? 'solar_match_validation_followup' : 'named_installer_site_assessment',
    solarMatchFollowupAuthorized: configuration.mode === 'validation_interest',
    thirdPartyDisclosureAuthorized: configuration.mode === 'named_installer_handoff',
    recipient: configuration.recipient,
    consentText: configuration.consent,
  } as const;
}
