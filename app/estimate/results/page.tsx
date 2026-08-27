import type { Metadata } from 'next';
import { ResultsShell } from '@/components/results/results-shell';

export const metadata: Metadata = { title: 'ผลประเมิน Solar Rooftop' };
export default function ResultsPage() { return <ResultsShell />; }
