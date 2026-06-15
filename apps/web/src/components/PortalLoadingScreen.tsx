'use client';

import { useT } from '@/lib/i18n';

type Props = {
  label?: string;
};

/** Pantalla de carga con el fondo del portal y logo Buyseekk centrado. */
export function PortalLoadingScreen({ label }: Props) {
  const t = useT();
  const statusLabel = label ?? t('common.loading');

  return (
    <main className="portal">
      <section
        className="portal-screen portal-loading-screen"
        aria-label="Buyseekk"
        aria-busy="true"
      >
        <div className="portal-bg" aria-hidden="true" />
        <div className="portal-overlay" aria-hidden="true" />
        <div className="portal-glow" aria-hidden="true" />
        <div className="portal-loading-center">
          <span className="portal-logo-text portal-loading-brand">Buyseekk</span>
          <div className="portal-spinner" role="status" aria-label={statusLabel} />
        </div>
      </section>
    </main>
  );
}
