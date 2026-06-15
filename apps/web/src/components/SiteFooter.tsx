'use client';

import Link from 'next/link';
import { useT } from '@/lib/i18n';

export function SiteFooter() {
  const t = useT();

  return (
    <footer className="site-footer">
      <nav className="site-footer__nav" aria-label={t('footer.aria')}>
        <Link href="/terms">{t('profile.terms')}</Link>
        <Link href="/privacy">{t('profile.privacy')}</Link>
        <Link href="/cookies">{t('profile.cookies')}</Link>
        <Link href="/help">{t('help.title')}</Link>
      </nav>
      <p className="site-footer__copy">© {new Date().getFullYear()} Buyseekk</p>
    </footer>
  );
}
