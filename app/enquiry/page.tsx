import type { Metadata } from 'next';
import { SharedEnquiry } from '@/components/installers/shared-enquiry';
import '../installers.css';
export const metadata: Metadata = { title: 'SolarMatch enquiry', robots: { index: false, follow: false, nocache: true }, referrer: 'no-referrer' };
export default function Page() { return <SharedEnquiry />; }
