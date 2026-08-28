import { MethodologyContent } from '@/components/pages/methodology-content';
import { thaiMetadata } from '@/lib/seo/localized-metadata';

export const metadata = thaiMetadata('วิธีคำนวณและสมมติฐาน', '/methodology');

export default function MethodologyPage() {
  return <MethodologyContent locale="th" />;
}
