'use client';

import { useEffect } from 'react';

/** Sincroniza --app-vh con el visual viewport (teclado mobile). */
export function useVisualViewportHeight(enabled = true) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const root = document.documentElement;

    function apply() {
      const vv = window.visualViewport;
      const height = vv?.height ?? window.innerHeight;
      root.style.setProperty('--app-vh', `${height}px`);
      if (vv && vv.offsetTop > 0) {
        window.scrollTo(0, 0);
      }
    }

    apply();
    window.visualViewport?.addEventListener('resize', apply);
    window.visualViewport?.addEventListener('scroll', apply);
    window.addEventListener('resize', apply);

    return () => {
      window.visualViewport?.removeEventListener('resize', apply);
      window.visualViewport?.removeEventListener('scroll', apply);
      window.removeEventListener('resize', apply);
      root.style.removeProperty('--app-vh');
    };
  }, [enabled]);
}
