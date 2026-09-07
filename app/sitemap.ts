import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

const routes = ['', '/estimate', '/how-it-works', '/solar-guide', '/methodology', '/about', '/contact', '/resources', '/privacy', '/terms', '/cookies'];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.flatMap((route) => [
    { url: `${siteConfig.url}${route}`, lastModified: new Date('2026-08-28'), changeFrequency: route === '' ? 'weekly' as const : 'monthly' as const, priority: route === '' ? 1 : route === '/estimate' ? 0.9 : 0.6, alternates: { languages: { th: `${siteConfig.url}${route}`, en: `${siteConfig.url}/en${route}` } } },
    { url: `${siteConfig.url}/en${route}`, lastModified: new Date('2026-08-28'), changeFrequency: route === '' ? 'weekly' as const : 'monthly' as const, priority: route === '' ? 1 : route === '/estimate' ? 0.9 : 0.6, alternates: { languages: { th: `${siteConfig.url}${route}`, en: `${siteConfig.url}/en${route}` } } },
  ]);
}
