import { ResultsShell } from '@/components/results/results-shell';
import { thaiMetadata } from '@/lib/seo/localized-metadata';

export const metadata = thaiMetadata('ผลประเมิน Solar Rooftop', '/estimate/results');
export default function ResultsPage() { return <ResultsShell />; }
