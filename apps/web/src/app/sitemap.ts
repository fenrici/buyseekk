import type { MetadataRoute } from 'next';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://buyseekk.com').replace(/\/$/, '');

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', '/marketplace', '/login', '/register', '/terms', '/privacy', '/cookies', '/help'];
  return routes.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: path === '' || path === '/marketplace' ? 'daily' : 'monthly',
    priority: path === '' ? 1 : path === '/marketplace' ? 0.9 : 0.5,
  }));
}
