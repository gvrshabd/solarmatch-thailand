import { calculatorV3Questionnaire, homeownerDesignV3Questionnaire } from '@/config/assessment';
import type { EstimateAnswers } from '@/lib/calculator/types';
import type { PublicAssessmentConfig, QuestionnaireDocument } from './types';
import { questionnaireDocumentSchema } from './validation';
import {CONTACT_CONSUMPTION_VERSION} from '@/lib/qualification/consumption-snapshot';

export const actualBillContactInputSupport: NonNullable<PublicAssessmentConfig['contactInputSupport']> = {
  policyVersion: 'actual-bill-v1', bill: true, kwh: false,
  kwhUnavailableReason: 'versioned-storage-and-scoring-unavailable',
};
export const normalizedContactInputSupport: NonNullable<PublicAssessmentConfig['contactInputSupport']> = {
  policyVersion: CONTACT_CONSUMPTION_VERSION, bill: true, kwh: true,
};

/** Modern contact retains v4 weights/gates and versions its input preprocessing separately. */
export function assessmentReleaseContract(questionnaire: QuestionnaireDocument, questionnaireId: string, ruleId: string) {
  if (questionnaire.id !== questionnaireId) throw new Error('assessment_questionnaire_version_mismatch');
  const modern = questionnaire.schemaVersion === 10 || questionnaire.schemaVersion === 11;
  const modernId = questionnaire.schemaVersion === 10 ? calculatorV3Questionnaire.id : homeownerDesignV3Questionnaire.id;
  if (modern || [calculatorV3Questionnaire.id, homeownerDesignV3Questionnaire.id].includes(questionnaireId)) {
    if (!modern || questionnaireId !== modernId || ruleId !== 'residential-rules-v4'
      || !questionnaireDocumentSchema.safeParse(questionnaire).success) throw new Error('assessment_release_contract_incompatible');
  } else if (questionnaire.schemaVersion > 9 || questionnaire.schemaVersion < 4) {
    throw new Error('assessment_release_contract_incompatible');
  }
  return {
    calculatorModelVersion: modern ? 'energy-v3' as const : 'legacy-v5' as const,
    contactInputSupport: { ...(modern ? normalizedContactInputSupport : actualBillContactInputSupport) },
  };
}

/** Do not let an omitted client model flag bypass required modern roof facts. */
export function submissionMatchesAssessmentContract(answers: EstimateAnswers, questionnaire: QuestionnaireDocument) {
  return questionnaire.schemaVersion < 10 || (answers.estimateModelVersion === 'energy-v3'
    && (answers.roofArea !== undefined || answers.exactRoofAreaSqm !== undefined));
}
