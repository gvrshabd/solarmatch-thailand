import { calculatorV3Questionnaire, homeownerDesignV3Questionnaire, initialQuestionnaire, legacyQuestionnaireV1, legacyQuestionnaireV2, legacyQuestionnaireV3, legacyQuestionnaireV4, legacyQuestionnaireV5 } from '@/config/assessment';
import type { QuestionnaireDocument } from './types';

const bySchema: Record<number, QuestionnaireDocument> = {
  4: legacyQuestionnaireV1, 5: legacyQuestionnaireV2, 6: legacyQuestionnaireV3,
  7: legacyQuestionnaireV4, 8: legacyQuestionnaireV5, 9: initialQuestionnaire,
  10: calculatorV3Questionnaire, 11: homeownerDesignV3Questionnaire,
};
/** Position is translated by stable question identity, never reused as a new index. */
export function restoredQuestionPosition(version: number, step: number, target: QuestionnaireDocument): number {
  const id = bySchema[version]?.questions[step]?.id;
  if (!id) return 0;
  return Math.max(0, target.questions.findIndex(question => question.id === id));
}
