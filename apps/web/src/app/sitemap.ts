import type { MetadataRoute } from 'next';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://buyseekk.com').replace(/\/$/, '');
const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');

type PublicRequestItem = { id: string; updatedAt?: string };

async function fetchPublicRequestUrls(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];
  const limit = 100;
  let page = 1;
  let totalPages = 1;

  try {
    while (page <= totalPages && page <= 5) {
      const res = await fetch(`${API_URL}/api/public/requests?page=${page}&limit=${limit}`, {
        next: { revalidate: 3600 },
      });
      if (!res.ok) break;

      const data = (await res.json()) as {
        items?: PublicRequestItem[];
        totalPages?: number;
      };
      const items = data.items ?? [];
      totalPages = data.totalPages ?? 1;

      for (const item of items) {
        entries.push({
          url: `${SITE_URL}/marketplace/${item.id}`,
          lastModified: item.updatedAt ? new Date(item.updatedAt) : new Date(),
          changeFrequency: 'weekly',
          priority: 0.7,
        });
      }

      page += 1;
      if (items.length === 0) break;
    }
  } catch {
    /* sitemap still serves static routes if API is unreachable at build time */
  }

  return entries;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = ['', '/marketplace', '/login', '/register', '/terms', '/privacy', '/cookies', '/help'];
  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: path === '' || path === '/marketplace' ? 'daily' : 'monthly',
    priority: path === '' ? 1 : path === '/marketplace' ? 0.9 : 0.5,
  }));

  const requestEntries = await fetchPublicRequestUrls();
  return [...staticEntries, ...requestEntries];
}
