'use client';

import { useEffect, useState } from 'react';

/**
 * Subscribes to a CSS media query.
 * Returns `null` until mounted on the client so callers can avoid SSR/hydration layout flicker.
 */
export function useMediaQuery(query: string): boolean | null {
  const [matches, setMatches] = useState<boolean | null>(null);

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);

  return matches;
}
