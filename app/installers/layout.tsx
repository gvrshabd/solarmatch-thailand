import type { Metadata } from 'next';
import '../installers.css';
export const metadata: Metadata = { title: 'SolarMatch for Installers', robots: { index: false, follow: false }, referrer: 'no-referrer' };
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
