import type { PublicAssessmentConfig } from '@/lib/questionnaire/types';

/** UI hint only. The submission endpoint always rechecks the current release. */
export function canRequestContact(configuration: PublicAssessmentConfig | null | undefined) {
  return Boolean(configuration?.contact.enabled && configuration.contact.mode !== 'disabled'
    && configuration.liveLeadSubmissions && configuration.assessmentToken);
}

export function sameAssessmentVersion(current: PublicAssessmentConfig, next: PublicAssessmentConfig) {
  return current.questionnaireVersionId === next.questionnaireVersionId
    && current.ruleVersionId === next.ruleVersionId
    && current.questionnaire.schemaVersion === next.questionnaire.schemaVersion;
}

