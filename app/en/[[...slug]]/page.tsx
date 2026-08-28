import type { Metadata } from 'next';
import { HomePage } from '@/components/home/home-page';
import { EnglishPage } from '@/components/pages/english-pages';
import { siteConfig } from '@/config/site';

const titles: Record<string, string> = {
  '': 'Rooftop solar estimates for homes',
  estimate: 'Rooftop solar estimate',
  'estimate/results': 'Your rooftop solar estimate',
  'how-it-works': 'How SolarMatch works',
  'solar-guide': 'Rooftop solar guide for homeowners',
  methodology: 'Calculator methodology and sources',
  about: 'About SolarMatch',
  contact: 'Contact',
  resources: 'Official resources',
  privacy: 'Draft privacy notice',
  terms: 'Draft terms of use',
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
    description: 'Understand a practical rooftop solar starting size and planning savings figure for a home in Thailand before speaking with an installer.',
    alternates: { canonical: englishUrl, languages: { 'en-US': englishUrl, 'th-TH': thaiUrl } },
    openGraph: { type: 'website', locale: 'en_US', url: englishUrl, title: titles[key] ?? 'SolarMatch Thailand', description: 'Start with your electricity bill, province, property, and daytime use to understand a practical rooftop solar planning figure.', images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Solar panels on a tiled residential roof with palm trees in the background' }] },
  };
}

export default async function EnglishRoute({ params }: EnglishRouteProps) {
  const { slug = [] } = await params;
  if (slug.length === 0) return <HomePage locale="en" />;
  return <EnglishPage slug={slug.join('/')} />;
}
