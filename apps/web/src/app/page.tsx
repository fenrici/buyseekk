'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PublicHeader } from '@/components/PublicHeader';
import { PortalLoadingScreen } from '@/components/PortalLoadingScreen';
import { SiteFooter } from '@/components/SiteFooter';
import { SplashScreen } from '@/components/SplashScreen';
import { useGuestOnlyRoute } from '@/hooks/useGuestOnlyRoute';
import { useT } from '@/lib/i18n';
import { isUsLaunch } from '@/lib/launch-country';

const SPLASH_FLAG = 'buyseekk_splash_seen';

export default function HomePage() {
  const t = useT();
  const { loading: authLoading, ready: guestReady } = useGuestOnlyRoute();
  const [showSplash, setShowSplash] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const seen = sessionStorage.getItem(SPLASH_FLAG);
    if (!seen) setShowSplash(true);
    setReady(true);
  }, []);

  function finishSplash() {
    sessionStorage.setItem(SPLASH_FLAG, '1');
    setShowSplash(false);
  }

  if (!ready || authLoading || !guestReady) {
    return <PortalLoadingScreen />;
  }

  if (showSplash) {
    return <SplashScreen onDone={finishSplash} duration={2000} />;
  }

  return (
    <main className="portal">
      <section className="portal-screen" aria-label="Buyseek">
        <div className="portal-bg" aria-hidden="true" />
        <div className="portal-overlay" aria-hidden="true" />
        <div className="portal-glow" aria-hidden="true" />

        <PublicHeader activeRoute="/" />

        <div className="portal-content">
          <h1 className="portal-title portal-animate" style={{ animationDelay: '0.05s' }}>
            {t('home.welcomeTitle')}
          </h1>

          <p className="portal-subtitle portal-animate" style={{ animationDelay: '0.14s' }}>
            {isUsLaunch() ? t('home.welcomeSubtitleUS') : t('home.welcomeSubtitle')}
          </p>

          <div className="portal-ctas portal-animate" style={{ animationDelay: '0.22s' }}>
            <Link href="/login" className="portal-cta portal-cta-primary">
              {t('home.welcomeLogin')}
            </Link>
            <Link href="/register" className="portal-cta portal-cta-secondary">
              {t('home.welcomeRegister')}
            </Link>
          </div>

          <Link
            href="/marketplace"
            className="portal-explore-link portal-animate"
            style={{ animationDelay: '0.3s' }}
          >
            {t('home.welcomeGuest')}
          </Link>

          <p className="portal-chips portal-animate" style={{ animationDelay: '0.36s' }}>
            {isUsLaunch() ? t('home.chipLineUS') : t('home.chipLine')}
          </p>
        </div>
        <SiteFooter />
      </section>
    </main>
  );
}
