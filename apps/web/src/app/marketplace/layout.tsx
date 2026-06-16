import type { Metadata } from 'next';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://buyseekk.com').replace(/\/$/, '');

export const metadata: Metadata = {
  title: 'Buyseek — Inverted marketplace for cars & real estate',
  description:
    'Post what you need. Get offers from sellers. Cars and real estate across the United States.',
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: 'Buyseek',
    description: 'Buyers post requests. Sellers send offers. Built for the US market.',
    type: 'website',
    siteName: 'Buyseek',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Buyseek',
    description: 'Buyers post requests. Sellers send offers. Built for the US market.',
  },
};

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
