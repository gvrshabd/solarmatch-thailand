import { describe, it, expect } from 'vitest';
import { restoredQuestionPosition } from '../../lib/questionnaire/draft-position';
import { calculatorV3Questionnaire, homeownerDesignV3Questionnaire, initialQuestionnaire, legacyQuestionnaireV1, legacyQuestionnaireV2, legacyQuestionnaireV3, legacyQuestionnaireV4, legacyQuestionnaireV5 } from '../../config/assessment';
import { estimateDraftSchema } from '../../lib/validation/estimate';

describe('homeowner v3 draft migration', () => {
  for (const source of [legacyQuestionnaireV1,legacyQuestionnaireV2,legacyQuestionnaireV3,legacyQuestionnaireV4,legacyQuestionnaireV5,initialQuestionnaire,calculatorV3Questionnaire,homeownerDesignV3Questionnaire]) {
    it(`restores schema ${source.schemaVersion} by stable ID`, () => {
      source.questions.forEach((question,index) => {
        const position = restoredQuestionPosition(source.schemaVersion,index,homeownerDesignV3Questionnaire);
        const expected = homeownerDesignV3Questionnaire.questions.findIndex(q => q.id === question.id);
        expect(position).toBe(Math.max(0,expected));
      });
    });
  }
  it('accepts v11 and strips consent, contact and unknown financial facts', () => {
    const result = estimateDraftSchema.parse({version:11,step:1,answers:{monthlyBillThb:6000,phone:'0800000000',quoteConsentAccepted:true,taxIncome:800000}});
    expect(result.answers).toEqual({monthlyBillThb:6000});
  });
});
