import { EstimateShell } from '@/components/estimate/estimate-shell';
import { thaiMetadata } from '@/lib/seo/localized-metadata';

export const metadata = thaiMetadata('ประเมิน Solar Rooftop', '/estimate');

export default function EstimatePage() { return <EstimateShell />; }
