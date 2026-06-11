'use client';

import { useEffect } from 'react';

const LOCK_CLASS = 'chat-viewport-lock';

/**
 * Sincroniza --app-vh / --app-vt con visualViewport (teclado iOS/Android)
 * y bloquea scroll del documento mientras el chat está abierto.
 */
export function useVisualViewportHeight(enabled = true) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const root = document.documentElement;

    function apply() {
      const vv = window.visualViewport;
      const height = vv?.height ?? window.innerHeight;
      const top = vv?.offsetTop ?? 0;
      root.style.setProperty('--app-vh', `${height}px`);
      root.style.setProperty('--app-vt', `${top}px`);
    }

    root.classList.add(LOCK_CLASS);
    apply();

    const vv = window.visualViewport;
    vv?.addEventListener('resize', apply);
    vv?.addEventListener('scroll', apply);
    window.addEventListener('resize', apply);
    window.addEventListener('orientationchange', apply);

    return () => {
      vv?.removeEventListener('resize', apply);
      vv?.removeEventListener('scroll', apply);
      window.removeEventListener('resize', apply);
      window.removeEventListener('orientationchange', apply);
      root.classList.remove(LOCK_CLASS);
      root.style.removeProperty('--app-vh');
      root.style.removeProperty('--app-vt');
    };
  }, [enabled]);
}
