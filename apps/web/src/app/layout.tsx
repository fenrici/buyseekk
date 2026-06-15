import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { LocaleHtml } from '@/components/LocaleHtml';
import { AppProviders } from '@/providers/AppProviders';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Buyseek — Inverted marketplace for cars & real estate',
  description:
    'Post what you need. Get offers from sellers. Cars and real estate across the United States.',
  openGraph: {
    title: 'Buyseek',
    description: 'Buyers post requests. Sellers send offers. Built for the US market.',
    type: 'website',
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
        </AppProviders>
      </body>
    </html>
  );
}
