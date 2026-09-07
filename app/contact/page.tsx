import { thaiMetadata } from '@/lib/seo/localized-metadata';
import { ContactContent } from '@/components/pages/contact-content';

export const metadata = thaiMetadata('ติดต่อ', '/contact');
export default function ContactPage() {
  return <ContactContent locale="th" />;
}
