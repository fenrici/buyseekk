'use client';

import { useEffect } from 'react';
import { dateLocale, useLocale } from '@/lib/i18n';

export function LocaleHtml({ children }: { children: React.ReactNode }) {
  const locale = useLocale();

  useEffect(() => {
    document.documentElement.lang = locale === 'EN' ? 'en' : 'es';
  }, [locale]);

  return <>{children}</>;
}

export { dateLocale };
