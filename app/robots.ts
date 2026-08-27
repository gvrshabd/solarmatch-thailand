import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: 'Claude-User', allow: '/' },
      { userAgent: 'ClaudeBot', disallow: '/' },
      { userAgent: 'Claude-SearchBot', disallow: '/' },
      { userAgent: '*', disallow: '/' },
    ],
  };
}
