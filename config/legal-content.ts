import legalReviewCopy from './legal-review-copy.json';
import type { LocalizedText } from '@/lib/questionnaire/types';

export type LegalSection = { id: string; title: LocalizedText; paragraphs: LocalizedText[]; bullets?: LocalizedText[] };
export type LegalDocumentDraft = { type: 'privacy' | 'terms' | 'cookies'; title: LocalizedText; lastUpdatedLabel: LocalizedText; effectiveDate: string | null; pendingLegalReview: boolean; sections: LegalSection[] };
export type OperatorProfile = {
  legalBusinessNameEn: string; legalBusinessNameTh: string; legalEntityType: string; registrationOrTaxNumber: string;
  registeredAddressEn: string; registeredAddressTh: string; publicBusinessPhone: string; publicBusinessEmail: string;
  privacyContactEmail: string; privacyRightsRequestUrl: string; leadRetentionDays: number | null; leadDistributionWindowDays: number | null;
  privacyNoticeEffectiveDate: string | null; termsEffectiveDate: string | null; cookiePolicyEffectiveDate: string | null;
  dataHostingAndProcessorDetails: string; operatorRepresentativeName: string; operatorRepresentativeTitle: string;
};

export const emptyOperatorProfile: OperatorProfile = {
  legalBusinessNameEn: '', legalBusinessNameTh: '', legalEntityType: '', registrationOrTaxNumber: '', registeredAddressEn: '', registeredAddressTh: '',
  publicBusinessPhone: '', publicBusinessEmail: '', privacyContactEmail: '', privacyRightsRequestUrl: '', leadRetentionDays: null,
  leadDistributionWindowDays: null, privacyNoticeEffectiveDate: null, termsEffectiveDate: null, cookiePolicyEffectiveDate: null,
  dataHostingAndProcessorDetails: 'Cloudflare services are used for website delivery, security, database storage and private file storage. Processing locations may include locations outside Thailand.',
  operatorRepresentativeName: '', operatorRepresentativeTitle: '',
};

/** New review copy; existing stored legal and consent records are never rewritten. */
export const legalLaunchDocuments: Record<'privacy' | 'terms' | 'cookies', LegalDocumentDraft> = Object.fromEntries(
  Object.entries(legalReviewCopy.documents).map(([type, document]) => [type, {
    type: document.type,
    title: document.title,
    lastUpdatedLabel: document.lastUpdatedLabel,
    effectiveDate: document.effectiveDate,
    pendingLegalReview: document.pendingLegalReview,
    sections: document.sections,
  }]),
) as Record<'privacy' | 'terms' | 'cookies', LegalDocumentDraft>;

export const legalLaunchDraft = { schemaVersion: 4, contentVersion: legalReviewCopy.contentVersion, operator: emptyOperatorProfile, documents: legalLaunchDocuments, pendingLegalReview: true };

export function operatorProfileComplete(profile: OperatorProfile) {
  return Boolean(profile.legalBusinessNameEn && profile.legalBusinessNameTh && profile.legalEntityType && profile.registrationOrTaxNumber &&
    profile.registeredAddressEn && profile.registeredAddressTh && profile.publicBusinessPhone && profile.publicBusinessEmail &&
    profile.privacyContactEmail && profile.privacyRightsRequestUrl && profile.leadRetentionDays && profile.leadDistributionWindowDays &&
    profile.privacyNoticeEffectiveDate && profile.termsEffectiveDate && profile.cookiePolicyEffectiveDate &&
    profile.dataHostingAndProcessorDetails && profile.operatorRepresentativeName && profile.operatorRepresentativeTitle);
}

export function interpolateLegalDocuments(documents: Record<'privacy' | 'terms' | 'cookies', LegalDocumentDraft>, profile: OperatorProfile) {
  const values: Record<string, string> = {
    '[LEGAL COMPANY NAME EN]': profile.legalBusinessNameEn, '[LEGAL COMPANY NAME TH]': profile.legalBusinessNameTh,
    '[LEGAL BUSINESS NAME EN]': profile.legalBusinessNameEn, '[LEGAL BUSINESS NAME TH]': profile.legalBusinessNameTh,
    '[LEGAL ENTITY TYPE]': profile.legalEntityType, '[COMPANY REGISTRATION / TAX NUMBER]': profile.registrationOrTaxNumber,
    '[BUSINESS REGISTRATION OR TAX NUMBER]': profile.registrationOrTaxNumber, '[REGISTERED ADDRESS EN]': profile.registeredAddressEn,
    '[REGISTERED ADDRESS TH]': profile.registeredAddressTh, '[REGISTERED BUSINESS ADDRESS EN]': profile.registeredAddressEn,
    '[REGISTERED BUSINESS ADDRESS TH]': profile.registeredAddressTh, '[PUBLIC BUSINESS PHONE]': profile.publicBusinessPhone,
    '[PUBLIC BUSINESS EMAIL]': profile.publicBusinessEmail, '[PRIVACY CONTACT EMAIL]': profile.privacyContactEmail,
    '[PRIVACY RIGHTS REQUEST URL]': profile.privacyRightsRequestUrl, '[LEAD RETENTION DAYS]': String(profile.leadRetentionDays ?? ''),
    '[LEAD DISTRIBUTION WINDOW DAYS]': String(profile.leadDistributionWindowDays ?? ''), '[DATA HOSTING AND PROCESSOR DETAILS]': profile.dataHostingAndProcessorDetails,
  };
  const replace = (source: string) => Object.entries(values).reduce((result, [token, value]) => value ? result.replaceAll(token, value) : result, source);
  const next = structuredClone(documents);
  (Object.keys(next) as Array<keyof typeof next>).forEach((type) => {
    next[type].effectiveDate = type === 'privacy' ? profile.privacyNoticeEffectiveDate : type === 'terms' ? profile.termsEffectiveDate : profile.cookiePolicyEffectiveDate;
    next[type].sections.forEach((value) => value.paragraphs.forEach((paragraph) => { paragraph.en = replace(paragraph.en); paragraph.th = replace(paragraph.th); }));
  });
  return next;
}
