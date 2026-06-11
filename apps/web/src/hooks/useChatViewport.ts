'use client';

import { useEffect, useState } from 'react';

const LOCK_CLASS = 'chat-viewport-lock';
const KEYBOARD_CLASS = 'chat-keyboard-open';
const KEYBOARD_THRESHOLD_PX = 150;

export function useChatViewport(enabled = true) {
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const root = document.documentElement;
    let baselineHeight = window.innerHeight;

    function apply() {
      const vv = window.visualViewport;
      const height = vv?.height ?? window.innerHeight;
      const top = vv?.offsetTop ?? 0;

      root.style.setProperty('--app-vh', `${height}px`);
      root.style.setProperty('--app-vt', `${top}px`);

      const open = baselineHeight - height > KEYBOARD_THRESHOLD_PX;
      setKeyboardOpen(open);
      root.classList.toggle(KEYBOARD_CLASS, open);
    }

    function onOrientationChange() {
      baselineHeight = window.innerHeight;
      apply();
    }

    root.classList.add(LOCK_CLASS);
    apply();

    const vv = window.visualViewport;
    vv?.addEventListener('resize', apply);
    vv?.addEventListener('scroll', apply);
    window.addEventListener('resize', apply);
    window.addEventListener('orientationchange', onOrientationChange);

    return () => {
      vv?.removeEventListener('resize', apply);
      vv?.removeEventListener('scroll', apply);
      window.removeEventListener('resize', apply);
      window.removeEventListener('orientationchange', onOrientationChange);
      root.classList.remove(LOCK_CLASS);
      root.classList.remove(KEYBOARD_CLASS);
      root.style.removeProperty('--app-vh');
      root.style.removeProperty('--app-vt');
    };
  }, [enabled]);

  return { keyboardOpen };
}
