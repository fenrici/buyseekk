'use client';

import { PublicHeader, type PublicRoute } from '@/components/PublicHeader';
import { SiteFooter } from '@/components/SiteFooter';

type Props = {
  activeRoute: PublicRoute;
  children: React.ReactNode;
};

/** Shell compartido para ayuda, términos, privacidad y cookies. */
export function PublicContentShell({ activeRoute, children }: Props) {
  return (
    <main className="public-content-page">
      <section className="public-content-page__screen">
        <div className="portal-bg" aria-hidden="true" />
        <div className="portal-overlay" aria-hidden="true" />
        <div className="portal-glow portal-glow--subtle" aria-hidden="true" />
        <PublicHeader activeRoute={activeRoute} />
        <div className="public-content-page__body">{children}</div>
        <SiteFooter />
      </section>
    </main>
  );
}
