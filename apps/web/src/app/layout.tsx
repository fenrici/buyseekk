import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { LocaleHtml } from '@/components/LocaleHtml';
import { CookieConsent } from '@/components/CookieConsent';
import { AppProviders } from '@/providers/AppProviders';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://buyseekk.com').replace(/\/$/, '');

export const metadata: Metadata = {
  title: 'Buyseekk — Inverted marketplace for cars & real estate',
  description:
    'Post what you need. Get offers from sellers. Cars and real estate across the United States.',
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: 'Buyseekk',
    description: 'Buyers post requests. Sellers send offers. Built for the US market.',
    type: 'website',
    siteName: 'Buyseekk',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Buyseekk',
    description: 'Buyers post requests. Sellers send offers. Built for the US market.',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as const,
  interactiveWidget: 'resizes-content' as const,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <AppProviders>
          <LocaleHtml>{children}</LocaleHtml>
          <CookieConsent />
        </AppProviders>
        <Analytics />
      </body>
    </html>
  );
}
