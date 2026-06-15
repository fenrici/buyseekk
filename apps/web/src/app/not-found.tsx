'use client';

import Link from 'next/link';
import { useT } from '@/lib/i18n';

export default function NotFound() {
  const t = useT();

  return (
    <main className="error-page">
      <div className="error-page__card">
        <p className="error-page__code">404</p>
        <h1 className="error-page__title">{t('errors.notFoundTitle')}</h1>
        <p className="error-page__body">{t('errors.notFoundBody')}</p>
        <div className="error-page__actions">
          <Link href="/" className="portal-cta portal-cta-primary">
            {t('errors.goHome')}
          </Link>
          <Link href="/marketplace" className="portal-cta portal-cta-secondary">
            {t('errors.browseMarketplace')}
          </Link>
        </div>
      </div>
    </main>
  );
}
