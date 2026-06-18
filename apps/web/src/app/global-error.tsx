'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getStoredLocale, guessLocale, translate, type Locale } from '@/lib/i18n';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [locale, setLocale] = useState<Locale>('EN');

  useEffect(() => {
    setLocale(getStoredLocale() ?? guessLocale());
    console.error(error);
  }, [error]);

  const t = (key: string) => translate(locale, key);

  return (
    <html lang={locale === 'EN' ? 'en' : 'es'}>
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#060c1d', color: '#f8fafc' }}>
        <main
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
          }}
        >
          <div style={{ maxWidth: '28rem', textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>{t('errors.genericTitle')}</h1>
            <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>{t('errors.genericBody')}</p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={reset}
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: '999px',
                  border: 'none',
                  background: '#3b82f6',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {t('errors.tryAgain')}
              </button>
              <Link
                href="/"
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: '999px',
                  border: '1px solid #334155',
                  color: '#f8fafc',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                {t('errors.goHome')}
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
