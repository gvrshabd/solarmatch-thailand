import type { Metadata, Viewport } from 'next';
import { InstallerAppRegistration } from '@/components/installers/app-registration';
import './entry.css';
import './next-step.css';

export const metadata: Metadata = {
  title: { absolute: 'SolarMatch Installers' },
  description: 'จัดการคำขอ สำรวจหน้างาน และติดตามใบเสนอราคาสำหรับทีมติดตั้งโซลาร์',
  manifest: '/installers/installer-app.webmanifest',
  appleWebApp: { capable: true, title: 'SolarMatch Installers', statusBarStyle: 'default' },
  icons: { icon: '/installers/app-icons/192.png', apple: '/installers/app-icons/180.png' },
  referrer: 'no-referrer',
};

export const viewport: Viewport = {
  width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#142D26',
};

export default function InstallerAppLayout({ children }: { children: React.ReactNode }) {
  return <><InstallerAppRegistration />{children}</>;
}
