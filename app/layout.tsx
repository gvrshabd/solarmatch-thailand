import type { Metadata } from 'next';
import { Anuphan, Manrope, Noto_Sans_Thai } from 'next/font/google';
import { SiteFooter } from '@/components/site/site-footer';
import { SiteHeader } from '@/components/site/site-header';
import { siteConfig } from '@/config/site';
import './globals.css';

const anuphan = Anuphan({
  variable: '--font-anuphan',
  subsets: ['latin', 'thai'],
  weight: ['500', '600', '700'],
});

const notoSansThai = Noto_Sans_Thai({
  variable: '--font-noto-thai',
  subsets: ['latin', 'thai'],
  weight: ['400', '500', '600'],
});

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: 'SolarMatch Thailand — ประเมินโซลาร์สำหรับบ้าน',
    template: '%s | SolarMatch Thailand',
  },
  description:
    'ประเมินขนาดระบบโซลาร์และช่วงเงินที่อาจประหยัดได้เบื้องต้น ก่อนตัดสินใจคุยกับผู้ติดตั้ง',
  robots: { index: false, follow: false },
  openGraph: {
    type: 'website',
    locale: 'th_TH',
    title: 'SolarMatch Thailand',
    description: 'เริ่มเข้าใจ Solar Rooftop จากค่าไฟและรูปแบบการใช้ไฟของบ้านคุณ',
    images: [{ url: '/og.png', width: 1200, height: 630 }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body
        className={`${anuphan.variable} ${notoSansThai.variable} ${manrope.variable} antialiased`}
      >
        <a className="skip-link" href="#main-content">ข้ามไปยังเนื้อหาหลัก</a>
        <SiteHeader />
        <div id="main-content">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
