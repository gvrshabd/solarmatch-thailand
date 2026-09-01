import { PublishedLegalDocument } from '@/components/content/published-legal-document';
import { thaiMetadata } from '@/lib/seo/localized-metadata';

export const metadata = thaiMetadata('ประกาศความเป็นส่วนตัว', '/privacy');
export default function PrivacyPage() {
  return <PublishedLegalDocument type="privacy" />;
}
