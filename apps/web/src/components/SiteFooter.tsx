'use client';

import Link from 'next/link';
import { useT } from '@/lib/i18n';

type Props = {
  /** Footer compacto estilo app para landing y pantallas con poco espacio. */
  compact?: boolean;
};

export function SiteFooter({ compact = false }: Props) {
  const t = useT();

  if (compact) {
    return (
      <footer className="site-footer site-footer--compact">
        <nav className="site-footer__nav site-footer__nav--inline" aria-label={t('footer.aria')}>
          <Link href="/terms">{t('footer.termsShort')}</Link>
          <span className="site-footer__sep" aria-hidden>
            ·
          </span>
          <Link href="/privacy">{t('footer.privacyShort')}</Link>
          <span className="site-footer__sep" aria-hidden>
            ·
          </span>
          <Link href="/cookies">{t('footer.cookiesShort')}</Link>
          <span className="site-footer__sep" aria-hidden>
            ·
          </span>
          <Link href="/help">{t('footer.helpShort')}</Link>
        </nav>
        <p className="site-footer__copy site-footer__copy--compact">
          © {new Date().getFullYear()} Buyseek
        </p>
      </footer>
    );
  }

  return (
    <footer className="site-footer">
      <nav className="site-footer__nav" aria-label={t('footer.aria')}>
        <Link href="/terms">{t('profile.terms')}</Link>
        <Link href="/privacy">{t('profile.privacy')}</Link>
        <Link href="/cookies">{t('profile.cookies')}</Link>
        <Link href="/help">{t('help.title')}</Link>
      </nav>
      <p className="site-footer__copy">© {new Date().getFullYear()} Buyseek</p>
    </footer>
  );
}
