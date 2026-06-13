'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { resolveNavMode } from '@buyseekk/shared';
import { api, normalizePaginated } from '@/lib/api';
import { Avatar } from '@/components/Avatar';
import { EmailVerificationBanner } from '@/components/EmailVerificationBanner';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useT } from '@/lib/i18n';
import { OfferItem, PaginatedResult, PendingRatingItem } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';
import { useNotifications } from '@/providers/NotificationsProvider';

type HeaderProps = {
  variant?: 'light' | 'dark';
};

export function Header({ variant = 'light' }: HeaderProps) {
  const dark = variant === 'dark';
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const { unreadCount } = useNotifications();
  const t = useT();
  const [pendingRatings, setPendingRatings] = useState(0);
  const [pendingOffers, setPendingOffers] = useState(0);
  const navLinkCls = `transition ${dark ? 'hover:text-indigo-300' : 'hover:text-[var(--primary)]'}`;

  // Navegación según el modo activo (sin mezclar comprador/vendedor).
  const navMode = user ? resolveNavMode({ role: user.role, activeMode: user.activeMode }) : null;

  useEffect(() => {
    if (!user) {
      setPendingRatings(0);
      setPendingOffers(0);
      return;
    }
    if (pathname !== '/ratings') {
      api<PaginatedResult<PendingRatingItem> | PendingRatingItem[]>('/ratings/pending?limit=1')
        .then((raw) => setPendingRatings(normalizePaginated(raw).total))
        .catch(() => setPendingRatings(0));
    }
    if (navMode === 'BUYER') {
      api<PaginatedResult<OfferItem> | OfferItem[]>('/offers/received?limit=1')
        .then((raw) => setPendingOffers(normalizePaginated(raw).total))
        .catch(() => setPendingOffers(0));
    } else {
      setPendingOffers(0);
    }
  }, [user?.id, navMode, pathname]);

  const badge = (count: number) =>
    count > 0 ? (
      <span className="ml-1.5 rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-white">
        {count}
      </span>
    ) : null;

  const navLinks = !loading && user && (
    <>
      {navMode === 'BUYER' ? (
        <>
          <Link href="/buyer" className={navLinkCls}>
            {t('nav.buyerPanel')}
          </Link>
          <Link href="/buyer/offers" className={navLinkCls}>
            {t('buyer.tabOffers')}
            {badge(pendingOffers)}
          </Link>
        </>
      ) : (
        <>
          <Link href="/seller" className={navLinkCls}>
            {t('nav.sellerPanel')}
          </Link>
          <Link href="/seller/offers" className={navLinkCls}>
            {t('nav.sentOffers')}
          </Link>
        </>
      )}
      <Link href="/chats" className={navLinkCls}>
        {t('nav.messages')}
      </Link>
      <Link href="/ratings" className={navLinkCls}>
        {t('nav.ratings')}
        {badge(pendingRatings)}
      </Link>
    </>
  );

  return (
    <div className="app-header-shell sticky top-0 z-50 max-md:hidden">
      <header
        className={`app-header backdrop-blur-md transition-shadow ${
          dark
            ? 'border-b border-white/10 bg-[#060c1d]/85'
            : 'border-b border-transparent bg-white/85'
        }`}
      >
      <div
        className={`app-header__inner mx-auto flex h-[72px] max-w-6xl items-center justify-between px-4 sm:px-6 ${
          user ? 'max-md:justify-center max-md:relative' : ''
        }`}
      >
        {dark ? (
          <Link
            href="/"
            className={`portal-logo ${user ? 'max-md:absolute max-md:left-1/2 max-md:-translate-x-1/2' : ''}`}
          >
            <span className="portal-logo-text">BuySeek</span>
          </Link>
        ) : (
          <Link
            href="/"
            className={`flex items-center gap-2.5 text-xl font-extrabold text-[var(--dark)] ${
              user ? 'max-md:absolute max-md:left-1/2 max-md:-translate-x-1/2' : ''
            }`}
          >
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

        <div className={`app-header__actions flex items-center gap-2 ${user ? 'max-md:hidden' : ''}`}>
          {!loading && user ? (
            <>
              <Link
              href="/profile"
              className={`flex items-center gap-2 rounded-full px-1 py-0.5 text-sm font-medium transition ${
                dark ? 'text-slate-200 hover:text-indigo-300' : 'text-[var(--text)] hover:text-[var(--primary)]'
              }`}
              title={t('nav.profile')}
            >
              <span className="header-profile__avatar">
                <Avatar name={user.name} url={user.avatarUrl} size={32} />
                {unreadCount > 0 && (
                  <span className="header-profile__badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
              </span>
              <span>{user.name}</span>
            </Link>
            </>
          ) : (
            <>
              <LanguageSwitcher />
              <Link href="/login" className="btn btn-ghost hidden px-3 py-2 text-sm sm:inline-flex">{t('nav.login')}</Link>
              <Link href="/register" className="btn btn-primary hidden px-3 py-2 text-sm sm:inline-flex">{t('nav.register')}</Link>
            </>
          )}
        </div>
      </div>
      </header>
      <EmailVerificationBanner placement="desktop" />
    </div>
  );
}
