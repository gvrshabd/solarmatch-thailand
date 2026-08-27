import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

const routes = ['', '/estimate', '/how-it-works', '/solar-guide', '/methodology', '/about', '/contact', '/resources', '/privacy', '/terms', '/cookies'];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({ url: `${siteConfig.url}${route}`, lastModified: new Date('2026-08-27'), changeFrequency: route === '' ? 'weekly' : 'monthly', priority: route === '' ? 1 : route === '/estimate' ? 0.9 : 0.6 }));
}
