import { SolarGuideContent } from '@/components/pages/solar-guide-content';
import { thaiMetadata } from '@/lib/seo/localized-metadata';

export const metadata = thaiMetadata('คู่มือ Solar Rooftop สำหรับบ้าน', '/solar-guide');
export default function SolarGuidePage() {
  return <SolarGuideContent locale="th" />;
}
