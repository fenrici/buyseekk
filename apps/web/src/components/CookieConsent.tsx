'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useT } from '@/lib/i18n';
import { getCookieConsent, setCookieConsent } from '@/lib/cookie-consent';

export function CookieConsent() {
  const t = useT();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!getCookieConsent()) {
      setVisible(true);
    }
  }, []);

  function acceptAnalytics() {
    setCookieConsent('accepted');
    setVisible(false);
  }

  function acceptEssentialOnly() {
    setCookieConsent('essential');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="cookie-consent"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-consent-title"
    >
      <div className="cookie-consent__inner">
        <p id="cookie-consent-title" className="cookie-consent__text">
          {t('cookies.banner')}{' '}
          <Link href="/cookies" className="cookie-consent__link">
            {t('cookies.learnMore')}
          </Link>
        </p>
        <div className="cookie-consent__actions">
          <button type="button" className="cookie-consent__btn cookie-consent__btn--ghost" onClick={acceptEssentialOnly}>
            {t('cookies.essentialOnly')}
          </button>
          <button type="button" className="cookie-consent__btn" onClick={acceptAnalytics}>
            {t('cookies.accept')}
          </button>
        </div>
      </div>
    </div>
  );
}
