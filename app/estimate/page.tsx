import type { Metadata } from 'next';
import { EstimateShell } from '@/components/estimate/estimate-shell';

export const metadata: Metadata = { title: 'ประเมิน Solar Rooftop' };

export default function EstimatePage() { return <EstimateShell />; }
