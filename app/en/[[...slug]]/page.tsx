import { pageDescriptions } from '@/lib/seo/descriptions';
import type { Metadata } from 'next';
import { HomePage } from '@/components/home/home-page';
import { EnglishPage } from '@/components/pages/english-pages';
import { siteConfig } from '@/config/site';

export const dynamic = 'force-dynamic';

const titles: Record<string, string> = {
  '': 'Rooftop solar estimates for homes',
  estimate: 'Rooftop solar estimate',
  'estimate/results': 'Your rooftop solar estimate',
  'how-it-works': 'How SolarMatch works',
  'solar-guide': 'Rooftop solar guide for homeowners',
  'quotation-comparison': 'Compare solar quotations',
  methodology: 'Calculator methodology and sources',
  contact: 'Contact',
  resources: 'Official resources',
  privacy: 'Privacy Notice',
  terms: 'Terms of Use',
  cookies: 'Cookies and browser storage',
};

type EnglishRouteProps = { params: Promise<{ slug?: string[] }> };

export async function generateMetadata({ params }: EnglishRouteProps): Promise<Metadata> {
  const { slug = [] } = await params;
  const key = slug.join('/');
  const path = key ? `/${key}` : '';
  const englishUrl = `${siteConfig.url}/en${path}`;
  const thaiUrl = `${siteConfig.url}${path}`;
  return {
    title: titles[key] ?? 'SolarMatch Thailand',
    description: pageDescriptions[key]?.en ?? pageDescriptions[''].en,
    alternates: { canonical: englishUrl, languages: { 'en-US': englishUrl, 'th-TH': thaiUrl } },
    openGraph: { type: 'website', locale: 'en_US', url: englishUrl, title: titles[key] ?? 'SolarMatch Thailand', description: pageDescriptions[key]?.en ?? pageDescriptions[''].en, images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Solar panels on a tiled residential roof with palm trees in the background' }] },
  };
}

export default async function EnglishRoute({ params }: EnglishRouteProps) {
  const { slug = [] } = await params;
  if (slug.length === 0) return <HomePage locale="en" />;
  return <EnglishPage slug={slug.join('/')} />;
}
