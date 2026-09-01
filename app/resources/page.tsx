import { ResourcesContent } from '@/components/pages/resources-content';
import { thaiMetadata } from '@/lib/seo/localized-metadata';

export const metadata = thaiMetadata('แหล่งข้อมูล', '/resources');
export const dynamic = 'force-dynamic';

export default function ResourcesPage() {
  return <ResourcesContent locale="th" />;
}
