'use client';

import { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { COOKIE_CONSENT_EVENT, hasAnalyticsConsent } from '@/lib/cookie-consent';

export function ConditionalAnalytics() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(hasAnalyticsConsent());
    const onConsent = () => setEnabled(hasAnalyticsConsent());
    window.addEventListener(COOKIE_CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, onConsent);
  }, []);

  if (!enabled) return null;
  return <Analytics />;
}
