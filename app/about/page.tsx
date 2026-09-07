import { AboutContent } from '@/components/pages/about-content';
import { thaiMetadata } from '@/lib/seo/localized-metadata';

export const metadata = thaiMetadata('เกี่ยวกับ SolarMatch', '/about');
export default function AboutPage() {
  return <AboutContent locale="th" />;
}
