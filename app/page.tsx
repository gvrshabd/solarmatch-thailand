import { HomePage } from '@/components/home/home-page';
import { thaiMetadata } from '@/lib/seo/localized-metadata';

export const metadata = thaiMetadata('ประเมินโซลาร์สำหรับบ้าน');

export default function Home() {
  return <HomePage />;
}
