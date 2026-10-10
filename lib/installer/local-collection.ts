import { contactContent } from '@/config/contact-content';
import { contactLaunchReviewCopy,legalReviewContentVersion } from '@/config/legal-review';
import { publicContactConfiguration } from '@/lib/server/contact-mode';
import type { ReleaseRow } from '@/lib/server/releases';
import { assertPlatformRequest } from './platform';
import { getPlatformSettings } from './settings';

/** Request-scoped synthetic override; never changes the published release or public flags. */
export async function localTestContact(request:Request|undefined, release:ReleaseRow, database:D1Database) {
  if (!request) return null;
  try { if (assertPlatformRequest(request).mode!=='local-test') return null; } catch { return null; }
  const settings=await getPlatformSettings(database);
  if (!settings.collectionEnabled) return null;
  return {...publicContactConfiguration(release),...contactContent.contactModes.shared_solar_company_handoff,
    enabled:true,preview:false,mode:'shared_solar_company_handoff' as const,
    publicCollectionEnabled:false,restrictedSiteCollectionEnabled:false,operationalDistributionEnabled:true,
    permittedContactMethods:['phone'] as ('phone'|'line')[],sharedFields:['legalFirstName','legalLastName','phone','assessmentAnswers'],
    consent:contactLaunchReviewCopy.consent,adultConfirmation:contactLaunchReviewCopy.adultConfirmation,
    consentVersionId:`local-test:${legalReviewContentVersion}`,adultConfirmationVersionId:`local-test:${legalReviewContentVersion}`,
    distributionWindowDays:settings.distributionWindowDays,retentionDays:settings.retentionDays,
    recipientCategory:'solar_service_recipients',recipient:null,
  };
}
