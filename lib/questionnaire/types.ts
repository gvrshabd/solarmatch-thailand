import type { Locale } from '@/config/i18n';

export type LocalizedText = Record<Locale, string>;

export type AssessmentOption = {
  value: string;
  label: LocalizedText;
  description?: LocalizedText;
  exclusive?: boolean;
};

export type ConditionalField = {
  id: 'customLocation' | 'customPropertyType' | 'customDaytimeLoad' | 'airConditionerCount' | 'customRoofMaterial';
  whenOption: string;
  kind: 'text' | 'ac-count';
  label: LocalizedText;
  placeholder?: LocalizedText;
  help?: LocalizedText;
  required: boolean;
  minLength?: number;
  maxLength?: number;
};

export type AssessmentQuestion = {
  id:
    | 'province'
    | 'monthlyBillThb'
    | 'propertyType'
    | 'ownershipStatus'
    | 'roofArea'
    | 'daytimePattern'
    | 'daytimeLoads'
    | 'roofMaterial'
    | 'shade'
    | 'installationTimeframe';
  type: 'province' | 'bill' | 'choice' | 'multichoice';
  title: LocalizedText;
  help: LocalizedText;
  required: boolean;
  options?: AssessmentOption[];
  conditionalFields?: ConditionalField[];
  relevance: {
    calculation: boolean;
    qualification: boolean;
    scoring: boolean;
  };
};

export type QuestionnaireDocument = {
  id: string;
  schemaVersion: 4;
  questions: AssessmentQuestion[];
};

export type PublicAssessmentConfig = {
  releaseId: string;
  questionnaireVersionId: string;
  ruleVersionId: string;
  questionnaire: QuestionnaireDocument;
  assessmentToken: string | null;
  assessmentTokenExpiresAt: string | null;
  liveLeadSubmissions: boolean;
  receivingCompany: LocalizedText | null;
};
