'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, clearToken } from '@/lib/api';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { clearStoredLocale, useT } from '@/lib/i18n';
import { PaginatedResult, PendingRatingItem } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';
import { isBuyerRole, isSellerRole } from '@/lib/auth';

export function Header() {
  const { user, loading } = useAuth();
  const t = useT();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingRatings, setPendingRatings] = useState(0);

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
    api<PaginatedResult<PendingRatingItem>>('/ratings/pending?limit=1')
      .then((res) => setPendingRatings(res.total))
      .catch(() => setPendingRatings(0));
  }, [user?.id]);

  const navLinks = (
    <>
      {!loading && user && isBuyerRole(user.role) && (
        <Link href="/buyer" className="transition hover:text-[var(--primary)]" onClick={() => setMenuOpen(false)}>
          {t('nav.buyerPanel')}
        </Link>
      )}
      {!loading && user && isSellerRole(user.role) && (
        <Link href="/seller" className="transition hover:text-[var(--primary)]" onClick={() => setMenuOpen(false)}>
          {t('nav.sellerPanel')}
        </Link>
      )}
      {!loading && user && (
        <Link href="/chats" className="transition hover:text-[var(--primary)]" onClick={() => setMenuOpen(false)}>
          {t('nav.messages')}
        </Link>
      )}
      {!loading && user && (
        <Link href="/ratings" className="transition hover:text-[var(--primary)]" onClick={() => setMenuOpen(false)}>
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
    <header className="sticky top-0 z-50 border-b border-transparent bg-white/85 backdrop-blur-md transition-shadow">
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 text-xl font-extrabold text-[var(--dark)]">
          <span className="text-[var(--primary)]">⇄</span> BuySeek
        </Link>

        <nav className="hidden gap-7 text-sm font-medium text-[var(--text-muted)] md:flex">
          {navLinks}
        </nav>

        <div className="flex items-center gap-2">
          {!loading && user ? (
            <>
              <span className="hidden text-sm text-[var(--text-muted)] sm:inline">{user.name}</span>
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
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 md:hidden"
            aria-expanded={menuOpen}
            aria-label={t('nav.menu')}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span className="text-lg leading-none">{menuOpen ? '✕' : '☰'}</span>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t bg-white px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-3 text-sm font-semibold text-[var(--text)]">
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
                className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-left text-sm font-semibold text-slate-700"
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
