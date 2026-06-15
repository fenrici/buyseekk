'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useT } from '@/lib/i18n';

const CONSENT_KEY = 'buyseekk_cookie_consent';

export function CookieConsent() {
  const t = useT();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem(CONSENT_KEY)) {
      setVisible(true);
    }
  }, []);

  function accept() {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="cookie-consent" role="dialog" aria-labelledby="cookie-consent-title">
      <div className="cookie-consent__inner">
        <p id="cookie-consent-title" className="cookie-consent__text">
          {t('cookies.banner')}{' '}
          <Link href="/cookies" className="cookie-consent__link">
            {t('cookies.learnMore')}
          </Link>
        </p>
        <button type="button" className="cookie-consent__btn" onClick={accept}>
          {t('cookies.accept')}
        </button>
      </div>
    </div>
  );
}
