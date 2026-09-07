import type { Metadata } from 'next';
import { siteConfig } from '@/config/site';

export function thaiMetadata(title: string, path = ''): Metadata {
  const thaiUrl = `${siteConfig.url}${path}`;
  const englishUrl = `${siteConfig.url}/en${path}`;

  return {
    title,
    alternates: {
      canonical: thaiUrl,
      languages: { 'th-TH': thaiUrl, 'en-US': englishUrl },
    },
    openGraph: {
      type: 'website',
      locale: 'th_TH',
      url: thaiUrl,
      title,
      images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Solar panels on a tiled residential roof with palm trees in the background' }],
    },
  };
}
