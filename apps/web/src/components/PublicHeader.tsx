'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { resolveNavMode } from '@buyseekk/shared';
import { Locale, setGuestLocale, useLocale, useT } from '@/lib/i18n';
import { useAuth } from '@/providers/AuthProvider';

const LANG_OPTIONS: { value: Locale; label: string }[] = [
  { value: 'ES', label: 'ES' },
  { value: 'EN', label: 'EN' },
];

export type PublicRoute = '/' | '/login' | '/register' | '/marketplace' | '/forgot-password' | '/reset-password' | '/verify-email' | '/help' | '/terms' | '/privacy';

type PublicHeaderProps = {
  activeRoute?: PublicRoute;
};

export function PublicHeader({ activeRoute = '/' }: PublicHeaderProps) {
  const { user, loading } = useAuth();
  const locale = useLocale();
  const t = useT();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [user?.id, activeRoute]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const langSwitcher = !loading && !user && (
    <div className="portal-lang" role="group" aria-label="Language">
      {LANG_OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => setGuestLocale(value)}
          className={locale === value ? 'active' : undefined}
          aria-pressed={locale === value}
        >
          {label}
        </button>
      ))}
    </div>
  );

  const guestDesktopActions = (
    <>
      {langSwitcher}
      {activeRoute !== '/marketplace' && (
        <Link href="/marketplace" className="portal-header-link">
          {t('nav.explore')}
        </Link>
      )}
      {activeRoute !== '/login' && (
        <Link href="/login" className="portal-header-link">
          {t('nav.login')}
        </Link>
      )}
      {activeRoute !== '/register' && (
        <Link href="/register" className="portal-header-cta">
          {t('nav.register')}
        </Link>
      )}
    </>
  );

  const navMode = user ? resolveNavMode({ role: user.role, activeMode: user.activeMode }) : null;

  const userActions = user ? (
    <>
      <Link href={navMode === 'SELLER' ? '/seller' : '/buyer'} className="portal-header-link">
        {navMode === 'SELLER' ? t('nav.sellerPanel') : t('nav.buyerPanel')}
      </Link>
      <Link href="/profile" className="portal-header-cta">
        {t('nav.profile')}
      </Link>
    </>
  ) : null;

  return (
    <header className="portal-header">
      <div className="portal-header-inner">
        <Link href="/" className="portal-logo">
          <span className="portal-logo-text">BuySeek</span>
        </Link>

        <div className="portal-header-actions">
          {!loading && (user ? userActions : guestDesktopActions)}
        </div>

        <button
          type="button"
          className="portal-menu-btn"
          aria-expanded={menuOpen}
          aria-label={t('nav.menu')}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {menuOpen && (
        <>
          <button
            type="button"
            className="portal-menu-backdrop"
            aria-label={t('common.cancel')}
            onClick={() => setMenuOpen(false)}
          />
          <div className="portal-mobile-menu">
            {!loading && user ? (
              <nav className="portal-mobile-nav">
                <Link href="/" className="portal-mobile-link" onClick={() => setMenuOpen(false)}>
                  {t('nav.home')}
                </Link>
                <Link
                  href={navMode === 'SELLER' ? '/seller' : '/buyer'}
                  className="portal-mobile-link"
                  onClick={() => setMenuOpen(false)}
                >
                  {navMode === 'SELLER' ? t('nav.sellerPanel') : t('nav.buyerPanel')}
                </Link>
                <Link href="/chats" className="portal-mobile-link" onClick={() => setMenuOpen(false)}>
                  {t('nav.messages')}
                </Link>
                <Link href="/profile" className="portal-mobile-link" onClick={() => setMenuOpen(false)}>
                  {t('nav.profile')}
                </Link>
              </nav>
            ) : (
              <nav className="portal-mobile-nav">
                <Link
                  href="/"
                  className={`portal-mobile-link${activeRoute === '/' ? ' portal-mobile-link--active' : ''}`}
                  onClick={() => setMenuOpen(false)}
                  aria-current={activeRoute === '/' ? 'page' : undefined}
                >
                  {t('nav.home')}
                </Link>
                {activeRoute !== '/marketplace' ? (
                  <Link href="/marketplace" className="portal-mobile-link" onClick={() => setMenuOpen(false)}>
                    {t('nav.explore')}
                  </Link>
                ) : (
                  <span className="portal-mobile-link portal-mobile-link--active" aria-current="page">
                    {t('nav.explore')}
                  </span>
                )}
                {activeRoute !== '/login' ? (
                  <Link href="/login" className="portal-mobile-link" onClick={() => setMenuOpen(false)}>
                    {t('nav.login')}
                  </Link>
                ) : (
                  <span className="portal-mobile-link portal-mobile-link--active" aria-current="page">
                    {t('nav.login')}
                  </span>
                )}
                {activeRoute !== '/register' ? (
                  <Link
                    href="/register"
                    className="portal-mobile-cta"
                    onClick={() => setMenuOpen(false)}
                  >
                    {t('nav.register')}
                  </Link>
                ) : (
                  <span className="portal-mobile-link portal-mobile-link--active" aria-current="page">
                    {t('nav.register')}
                  </span>
                )}
                {langSwitcher && (
                  <div className="portal-mobile-lang">{langSwitcher}</div>
                )}
              </nav>
            )}
          </div>
        </>
      )}
    </header>
  );
}
