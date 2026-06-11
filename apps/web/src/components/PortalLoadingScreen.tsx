'use client';

/** Pantalla de carga con el fondo del portal y logo BuySeek centrado. */
export function PortalLoadingScreen() {
  return (
    <main className="portal">
      <section
        className="portal-screen portal-loading-screen"
        aria-label="BuySeek"
        aria-busy="true"
      >
        <div className="portal-bg" aria-hidden="true" />
        <div className="portal-overlay" aria-hidden="true" />
        <div className="portal-glow" aria-hidden="true" />
        <div className="portal-loading-center">
          <span className="portal-logo-text portal-loading-brand">BuySeek</span>
          <div className="portal-spinner" role="status" aria-label="Cargando" />
        </div>
      </section>
    </main>
  );
}
