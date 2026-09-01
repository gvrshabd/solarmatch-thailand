import { PublishedLegalDocument } from '@/components/content/published-legal-document';
import { thaiMetadata } from '@/lib/seo/localized-metadata';

export const metadata = thaiMetadata('ข้อกำหนดการใช้งาน', '/terms');
export default function TermsPage() {
  return <PublishedLegalDocument type="terms" />;
}
