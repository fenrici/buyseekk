'use client';

import { useEffect, useState } from 'react';

type Props = {
  onDone: () => void;
  duration?: number;
};

/** Visual del splash de Buyseek: fondo + logo + marca. Reutilizable para transiciones. */
export function SplashVisual({ leaving = false }: { leaving?: boolean }) {
  return (
    <div className={`splash-screen${leaving ? ' splash-screen--leaving' : ''}`} aria-hidden={leaving}>
      <div className="portal-bg" aria-hidden="true" />
      <div className="portal-overlay" aria-hidden="true" />
      <div className="portal-glow" aria-hidden="true" />
      <div className="splash-center">
        <span className="splash-logo" aria-hidden="true">
          ⇄
        </span>
        <span className="portal-logo-text portal-loading-brand splash-brand">Buyseek</span>
      </div>
    </div>
  );
}

/** Splash inicial estilo app nativa: logo + marca Buyseek, con fade-out suave. */
export function SplashScreen({ onDone, duration = 1500 }: Props) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const fadeAt = window.setTimeout(() => setLeaving(true), duration);
    const doneAt = window.setTimeout(onDone, duration + 450);
    return () => {
      window.clearTimeout(fadeAt);
      window.clearTimeout(doneAt);
    };
  }, [duration, onDone]);

  return <SplashVisual leaving={leaving} />;
}
