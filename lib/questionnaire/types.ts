import type { Locale } from '@/config/i18n';
import type { PublicLoadingFact } from '@/lib/loading-facts/types';

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
  schemaVersion: 4 | 5;
  questions: AssessmentQuestion[];
};

export type ContactCollectionMode = 'disabled' | 'validation_interest' | 'named_installer_handoff' | 'shared_solar_company_handoff';

export type PublicContactConfiguration = {
  enabled: boolean;
  mode: ContactCollectionMode;
  contactConfigurationVersionId: string;
  contentVersionId: string;
  privacyVersion: string;
  retentionDays: number | null;
  distributionWindowDays: number | null;
  recipientCategory: string | null;
  adultConfirmation: LocalizedText | null;
  adultConfirmationVersionId: string | null;
  consentVersionId: string | null;
  privacyNoticeVersionId: string | null;
  termsVersionId: string | null;
  cookiePolicyVersionId: string | null;
  question: LocalizedText | null;
  help: LocalizedText | null;
  yesLabel: LocalizedText | null;
  noLabel: LocalizedText | null;
  consent: LocalizedText | null;
  declineTitle: LocalizedText;
  declineBody: LocalizedText;
  declineContinueLabel: LocalizedText;
  skipLabel: LocalizedText;
  failureTitle: LocalizedText;
  failureBody: LocalizedText;
  recipient: ({
    name: LocalizedText;
    privacyUrl: string;
  }) | null;
  permittedContactMethods: Array<'phone' | 'line'>;
  sharedFields: string[];
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
  contact: PublicContactConfiguration;
  loadingFactSetVersionId: string;
  loadingFacts: PublicLoadingFact[];
};
