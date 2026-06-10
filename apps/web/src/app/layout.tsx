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
  title: 'BuySeek — Inverted Marketplace',
  description: 'Post what you need. Get real offers for cars and real estate.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen antialiased`}>
        <AppProviders>
          <LocaleHtml>{children}</LocaleHtml>
        </AppProviders>
      </body>
    </html>
  );
}
