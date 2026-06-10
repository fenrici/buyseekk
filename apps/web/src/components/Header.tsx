'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, clearToken, normalizePaginated } from '@/lib/api';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { clearStoredLocale, useT } from '@/lib/i18n';
import { PaginatedResult, PendingRatingItem } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';
import { isBuyerRole, isSellerRole } from '@/lib/auth';

type HeaderProps = {
  variant?: 'light' | 'dark';
};

export function Header({ variant = 'light' }: HeaderProps) {
  const dark = variant === 'dark';
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const t = useT();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingRatings, setPendingRatings] = useState(0);
  const navLinkCls = `transition ${dark ? 'hover:text-indigo-300' : 'hover:text-[var(--primary)]'}`;

  useEffect(() => {
    setMenuOpen(false);
  }, [user?.id]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!user) {
      setPendingRatings(0);
      return;
    }
    if (pathname === '/ratings') return;
    api<PaginatedResult<PendingRatingItem> | PendingRatingItem[]>('/ratings/pending?limit=1')
      .then((raw) => setPendingRatings(normalizePaginated(raw).total))
      .catch(() => setPendingRatings(0));
  }, [user?.id, pathname]);

  const navLinks = (
    <>
      {!loading && user && isBuyerRole(user.role) && (
        <Link href="/buyer" className={navLinkCls} onClick={() => setMenuOpen(false)}>
          {t('nav.buyerPanel')}
        </Link>
      )}
      {!loading && user && isSellerRole(user.role) && (
        <Link href="/seller" className={navLinkCls} onClick={() => setMenuOpen(false)}>
          {t('nav.sellerPanel')}
        </Link>
      )}
      {!loading && user && (
        <Link href="/chats" className={navLinkCls} onClick={() => setMenuOpen(false)}>
          {t('nav.messages')}
        </Link>
      )}
      {!loading && user && (
        <Link href="/ratings" className={navLinkCls} onClick={() => setMenuOpen(false)}>
          {t('nav.ratings')}
          {pendingRatings > 0 && (
            <span className="ml-1.5 rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {pendingRatings}
            </span>
          )}
        </Link>
      )}
    </>
  );

  return (
    <header
      className={`sticky top-0 z-50 backdrop-blur-md transition-shadow ${
        dark
          ? 'border-b border-white/10 bg-[#060c1d]/85'
          : 'border-b border-transparent bg-white/85'
      }`}
    >
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-4 sm:px-6">
        {dark ? (
          <Link href="/" className="portal-logo">
            <span className="portal-logo-text">BuySeek</span>
          </Link>
        ) : (
          <Link href="/" className="flex items-center gap-2.5 text-xl font-extrabold text-[var(--dark)]">
            <span className="text-[var(--primary)]">⇄</span> BuySeek
          </Link>
        )}

        <nav
          className={`hidden gap-7 text-sm font-medium md:flex ${
            dark ? 'text-slate-300' : 'text-[var(--text-muted)]'
          }`}
        >
          {navLinks}
        </nav>

        <div className="flex items-center gap-2">
          {!loading && user ? (
            <>
              <span className={`hidden text-sm sm:inline ${dark ? 'text-slate-400' : 'text-[var(--text-muted)]'}`}>
                {user.name}
              </span>
              {user.role === 'BOTH' && (
                <div className="hidden gap-1 sm:flex">
                  <Link href="/buyer" className="btn btn-ghost px-2 py-1 text-xs">{t('nav.buyer')}</Link>
                  <Link href="/seller" className="btn btn-ghost px-2 py-1 text-xs">{t('nav.seller')}</Link>
                </div>
              )}
              <button
                type="button"
                onClick={() => { clearToken(); clearStoredLocale(); window.location.href = '/'; }}
                className="btn btn-ghost hidden px-3 py-2 text-sm sm:inline-flex"
              >
                {t('nav.logout')}
              </button>
            </>
          ) : (
            <>
              <LanguageSwitcher />
              <Link href="/login" className="btn btn-ghost hidden px-3 py-2 text-sm sm:inline-flex">{t('nav.login')}</Link>
              <Link href="/register" className="btn btn-primary hidden px-3 py-2 text-sm sm:inline-flex">{t('nav.register')}</Link>
            </>
          )}

          <button
            type="button"
            className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border md:hidden ${
              dark ? 'border-white/15 bg-white/5 text-white' : 'border-slate-200'
            }`}
            aria-expanded={menuOpen}
            aria-label={t('nav.menu')}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span className="text-lg leading-none">{menuOpen ? '✕' : '☰'}</span>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div
          className={`px-4 py-4 md:hidden ${
            dark ? 'border-t border-white/10 bg-[#060c1d]/95' : 'border-t bg-white'
          }`}
        >
          <nav
            className={`flex flex-col gap-3 text-sm font-semibold ${
              dark ? 'text-slate-200' : 'text-[var(--text)]'
            }`}
          >
            {navLinks}
            {!loading && user && user.role === 'BOTH' && (
              <div className="flex gap-2 border-t pt-3">
                <Link href="/buyer" className="btn btn-ghost flex-1 text-xs" onClick={() => setMenuOpen(false)}>
                  {t('nav.buyer')}
                </Link>
                <Link href="/seller" className="btn btn-ghost flex-1 text-xs" onClick={() => setMenuOpen(false)}>
                  {t('nav.seller')}
                </Link>
              </div>
            )}
            {!loading && user ? (
              <button
                type="button"
                className={`mt-1 rounded-lg border px-3 py-2 text-left text-sm font-semibold ${
                  dark ? 'border-white/15 text-slate-300' : 'border-slate-200 text-slate-700'
                }`}
                onClick={() => { clearToken(); clearStoredLocale(); window.location.href = '/'; }}
              >
                {t('nav.logout')}
              </button>
            ) : (
              <div className="flex flex-col gap-2 border-t pt-3">
                <LanguageSwitcher />
                <Link href="/login" className="btn btn-ghost w-full" onClick={() => setMenuOpen(false)}>
                  {t('nav.login')}
                </Link>
                <Link href="/register" className="btn btn-primary w-full" onClick={() => setMenuOpen(false)}>
                  {t('nav.register')}
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
