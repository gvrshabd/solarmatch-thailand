import { PublishedLegalDocument } from '@/components/content/published-legal-document';
import { thaiMetadata } from '@/lib/seo/localized-metadata';

export const metadata = thaiMetadata('คุกกี้และการจัดเก็บในเบราว์เซอร์', '/cookies');
export default function CookiesPage() {
  return <PublishedLegalDocument type="cookies" />;
}
