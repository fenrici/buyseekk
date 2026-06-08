import type { Metadata } from 'next';
import { LocaleHtml } from '@/components/LocaleHtml';
import { AppProviders } from '@/providers/AppProviders';
import './globals.css';

export const metadata: Metadata = {
  title: 'BuySeek — Inverted Marketplace',
  description: 'Post what you need. Get real offers for cars and real estate.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <AppProviders>
          <LocaleHtml>{children}</LocaleHtml>
        </AppProviders>
      </body>
    </html>
  );
}
