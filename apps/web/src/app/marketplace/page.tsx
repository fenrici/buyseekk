'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { PaginatedResult, PublicRequestItem } from '@/lib/types';
import { PublicHeader } from '@/components/PublicHeader';
import { RequestMeta } from '@/components/RequestMeta';
import { PaginationControls } from '@/components/PaginationControls';
import { RequestStatusBadge } from '@/components/RequestStatusBadge';
import { timeAgo, useLocale, useT } from '@/lib/i18n';

export default function ExplorePage() {
  const t = useT();
  const locale = useLocale();
  const [items, setItems] = useState<PublicRequestItem[]>([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, page: 1 });
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');
  const [country, setCountry] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setPage(1);
  }, [category, country]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ page: String(page) });
    if (category) params.set('category', category);
    if (country) params.set('country', country);
    api<PaginatedResult<PublicRequestItem>>(`/public/requests?${params}`)
      .then((data) => {
        if (cancelled) return;
        setItems(data.items);
        setMeta({ total: data.total, totalPages: data.totalPages, page: data.page });
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : t('common.error'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, category, country]);

  const categoryFilters = [
    { id: '', label: t('explore.all') },
    { id: 'AUTOS', label: t('seller.autos') },
    { id: 'INMOBILIARIA', label: t('seller.realEstate') },
  ];

  const countryFilters = [
    { id: '', label: t('explore.allCountries') },
    { id: 'AR', label: t('auth.countryAR') },
    { id: 'US', label: t('auth.countryUS') },
  ];

  return (
    <div className="panel-dark">
      <PublicHeader activeRoute="/marketplace" />

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-12 lg:pt-16">
        {/* Mobile hero — intacto */}
        <div className="explore-hero-mobile">
          <div className="max-w-2xl">
            <h1
              className="portal-animate text-2xl font-bold tracking-tight text-white"
              style={{ animationDelay: '0.05s' }}
            >
              {t('explore.titleMobile')}
            </h1>
            <p
              className="portal-animate mt-1.5 text-sm text-slate-500"
              style={{ animationDelay: '0.12s' }}
            >
              {t('explore.subtitleMobile')}
            </p>
          </div>

          <div className="explore-cta-bar portal-animate" style={{ animationDelay: '0.18s' }}>
            <div className="explore-cta-actions">
              <Link href="/register" className="explore-cta-primary">
                {t('explore.ctaOfferShort')}
              </Link>
              <Link href="/register" className="explore-cta-secondary">
                {t('explore.ctaPostShort')}
              </Link>
            </div>
          </div>
        </div>

        {/* Desktop hero */}
        <div className="explore-hero-desktop portal-animate" style={{ animationDelay: '0.05s' }}>
          <div className="explore-hero-copy">
            <h1 className="explore-hero-title">{t('explore.title')}</h1>
            <p className="explore-hero-subtitle">{t('explore.subtitle')}</p>
            <div className="explore-hero-actions">
              <Link href="/register" className="explore-cta-desktop explore-cta-desktop--primary">
                {t('explore.ctaOfferShort')}
              </Link>
              <Link href="/register" className="explore-cta-desktop explore-cta-desktop--secondary">
                {t('explore.ctaPostDesktop')}
              </Link>
            </div>
          </div>
        </div>

        <div className="explore-filters portal-animate explore-filters--mobile" style={{ animationDelay: '0.24s' }}>
          <div className="explore-pills" role="group" aria-label={t('explore.all')}>
            {categoryFilters.map((c) => (
              <button
                key={c.id || 'all'}
                onClick={() => setCategory(c.id)}
                className={`explore-pill ${category === c.id ? 'active' : ''}`}
                aria-pressed={category === c.id}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="explore-country-wrap">
            <select
              className="explore-country-select"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              aria-label={t('auth.country')}
            >
              {countryFilters.map((c) => (
                <option key={c.id || 'all-countries'} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          className="explore-filters explore-filters--desktop portal-animate"
          style={{ animationDelay: '0.24s' }}
        >
          <div className="explore-filters-row">
            <div className="explore-pills" role="group" aria-label={t('explore.all')}>
              {categoryFilters.map((c) => (
                <button
                  key={c.id || 'all-d'}
                  onClick={() => setCategory(c.id)}
                  className={`explore-pill ${category === c.id ? 'active' : ''}`}
                  aria-pressed={category === c.id}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="explore-filters-divider" aria-hidden="true" />
            <div className="explore-pills" role="group" aria-label={t('explore.allCountries')}>
              {countryFilters.map((c) => (
                <button
                  key={c.id || 'all-countries-d'}
                  onClick={() => setCountry(c.id)}
                  className={`explore-pill ${country === c.id ? 'active' : ''}`}
                  aria-pressed={country === c.id}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && <p className="mt-6 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

        {!loading && !error && items.length === 0 && (
          <p className="empty-state mt-6">{t('explore.empty')}</p>
        )}

        <div className="mt-5 grid gap-4 sm:mt-8 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((r, i) => (
            <article
              key={r.id}
              className="explore-card"
              style={{ animationDelay: `${Math.min(i, 8) * 0.06}s` }}
            >
              <div className="flex h-full flex-col p-4 lg:p-5">
                {r.status === 'NEGOCIANDO' && (
                  <div className="mb-2">
                    <RequestStatusBadge status="NEGOCIANDO" />
                  </div>
                )}
                <RequestMeta request={r} locale={locale} size="sm" />
                <p className="mt-2 text-xs text-slate-400">
                  {r.location}
                  {r.zone ? ` · ${r.zone}` : ''}
                  {' · '}
                  {timeAgo(locale, r.lastActivityAt ?? r.createdAt)}
                </p>
                <div className="mt-auto pt-3 lg:pt-4">
                  <div className="flex items-center justify-between gap-3 border-t pt-3 lg:pt-4">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="avatar text-xs">{r.buyerInitials}</div>
                      <p className="truncate text-sm font-semibold">{t('explore.buyer')}</p>
                    </div>
                    <span className="explore-offers-chip">
                      {r.offersCount} {t('explore.offers')}
                    </span>
                  </div>
                  <Link href="/register" className="explore-card-cta">
                    {t('explore.ctaOfferShort')}
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-8">
          <PaginationControls
            page={meta.page}
            totalPages={meta.totalPages}
            total={meta.total}
            onPageChange={setPage}
            itemLabel={t('buyer.tabMine').toLowerCase()}
          />
        </div>
      </main>
    </div>
  );
}
