'use client';

import Link from 'next/link';
import { PublicHeader } from '@/components/PublicHeader';
import { useT } from '@/lib/i18n';

export default function HomePage() {
  const t = useT();

  return (
    <main className="portal">
      <section className="portal-screen" aria-label="BuySeek">
        <div className="portal-bg" aria-hidden="true" />
        <div className="portal-overlay" aria-hidden="true" />
        <div className="portal-glow" aria-hidden="true" />

        <PublicHeader activeRoute="/" />

        <div className="portal-content">
          <h1 className="portal-title portal-animate" style={{ animationDelay: '0.1s' }}>
            {t('home.title1')}
            <br />
            {t('home.title2')}
          </h1>

          <p className="portal-subtitle portal-animate" style={{ animationDelay: '0.18s' }}>
            {t('home.subtitle')}
          </p>

          <div className="portal-ctas portal-animate" style={{ animationDelay: '0.26s' }}>
            <Link href="/login?role=buyer" className="portal-cta portal-cta-primary">
              {t('home.ctaBuyer')}
            </Link>
            <Link href="/login?role=seller" className="portal-cta portal-cta-secondary">
              {t('home.ctaSeller')}
            </Link>
          </div>

          <p className="portal-chips portal-animate" style={{ animationDelay: '0.34s' }}>
            {t('home.chipLine')}
          </p>
        </div>
      </section>
    </main>
  );
}
