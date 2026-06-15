import type { MetadataRoute } from 'next';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://buyseekk.com').replace(/\/$/, '');

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/buyer/', '/seller/', '/chats/', '/profile', '/notifications'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
