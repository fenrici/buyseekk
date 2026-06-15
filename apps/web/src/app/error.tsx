'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useT } from '@/lib/i18n';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      import('@sentry/nextjs').then((Sentry) => {
        Sentry.captureException(error);
      });
    }
  }, [error]);

  return (
    <main className="error-page">
      <div className="error-page__card">
        <p className="error-page__code">!</p>
        <h1 className="error-page__title">{t('errors.genericTitle')}</h1>
        <p className="error-page__body">{t('errors.genericBody')}</p>
        <div className="error-page__actions">
          <button type="button" onClick={reset} className="portal-cta portal-cta-primary">
            {t('errors.tryAgain')}
          </button>
          <Link href="/" className="portal-cta portal-cta-secondary">
            {t('errors.goHome')}
          </Link>
        </div>
      </div>
    </main>
  );
}
