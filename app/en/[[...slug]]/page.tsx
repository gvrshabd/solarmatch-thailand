import type { Metadata } from 'next';
import { EnglishPage } from '@/components/pages/english-pages';
import { siteConfig } from '@/config/site';

const titles: Record<string, string> = {
  '': 'Rooftop solar estimates for homes',
  estimate: 'Rooftop solar estimate',
  'estimate/results': 'Your rooftop solar estimate',
  'how-it-works': 'How SolarMatch works',
  'solar-guide': 'Rooftop solar guide for homeowners',
  methodology: 'Methodology and prototype assumptions',
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
    description: 'Understand a possible rooftop solar system size and savings range for a home in Thailand before speaking with an installer.',
    alternates: { canonical: englishUrl, languages: { 'en-US': englishUrl, 'th-TH': thaiUrl } },
    openGraph: { locale: 'en_US', url: englishUrl, title: titles[key] ?? 'SolarMatch Thailand', description: 'Start with your electricity bill and daytime usage to understand a possible rooftop solar range.' },
  };
}

export default async function EnglishRoute({ params }: EnglishRouteProps) {
  const { slug = [] } = await params;
  return <EnglishPage slug={slug.join('/')} />;
}
