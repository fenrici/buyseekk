'use client';

import { useEffect, useRef } from 'react';
import { Header } from '@/components/Header';
import { OnboardingGuide } from '@/components/OnboardingGuide';
import { PanelListLoading } from '@/components/PanelListLoading';
import { RequestCard } from '@/components/RequestCard';
import { SellerExploreFilters } from '@/components/seller/SellerExploreFilters';
import { useSellerExplore } from '@/hooks/useSellerExplore';
import { countActiveSellerFilters } from '@buyseekk/shared';
import { useT } from '@/lib/i18n';
import { effectiveCountry } from '@/lib/launch-country';
import { scrollPanelToTop } from '@/lib/scroll';

export default function SellerPage() {
  const t = useT();
  const explore = useSellerExplore();
  const { user, lockedCategory, filters, requests, page, setPage, totalPages, total, loading, error, activeCount } = explore;
  const resultsTopRef = useRef<HTMLDivElement>(null);

  const changePage = (next: number) => {
    scrollPanelToTop();
    resultsTopRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
    setPage(next);
  };

  useEffect(() => {
    if (!loading) scrollPanelToTop();
  }, [page, loading]);

  if (!user) return null;

  const marketLabel =
    effectiveCountry(user.country) === 'US' ? t('seller.marketUS') : t('seller.marketAR');
  const hasActiveFilters = activeCount > 0 || countActiveSellerFilters(filters, lockedCategory) > 0;

  return (
    <div className="panel-dark">
      <OnboardingGuide mode="SELLER" />
      <Header variant="dark" />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-bold text-white">{t('seller.title')}</h1>
        <p className="mt-1 text-slate-500">
          {t('seller.hello')}, <strong className="text-slate-200">{user.name}</strong> — {t('seller.subtitle')}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <p className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700">
            {t('seller.market')}: {marketLabel}
          </p>
          {user.sellerType && user.sellerCategory && (
            <>
              <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-slate-200">
                {user.sellerType === 'BUSINESS' ? t('seller.profileBusiness') : t('seller.profilePersonal')}
              </span>
              <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-slate-200">
                {user.sellerCategory === 'AUTOS' ? t('seller.profileAutos') : t('seller.profileRealEstate')}
              </span>
            </>
          )}
        </div>

        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

        <section className="panel-fade-in mt-8">
          <h2 className="text-xl font-bold text-white lg:hidden">{t('seller.requestsTitle')}</h2>

          <div className="seller-browse-layout">
            <SellerExploreFilters explore={explore} />

            <div className="seller-results">
            <div ref={resultsTopRef} className="seller-results-header scroll-mt-24">
              <h2 className="hidden text-xl font-bold text-white lg:block">{t('seller.requestsTitle')}</h2>
              {total > 0 && (
                <p className="text-sm text-slate-500">
                  {t('seller.resultsCount', { count: String(total) })}
                </p>
              )}
            </div>

            <PanelListLoading loading={loading} />
            {!loading && (
              <>
                <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {requests.map((r) => (
                    <RequestCard key={r.id} variant="seller" request={r} locale={user.locale} />
                  ))}
                </div>
                {!error && requests.length === 0 && (
                  <p className="mt-4 text-slate-500">
                    {hasActiveFilters
                      ? t('seller.noAutoRequests')
                      : filters.location
                        ? t('seller.noRequestsCity')
                        : t('seller.noRequests')}
                  </p>
                )}
              </>
            )}

            {!loading && totalPages > 1 && (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                <p className="text-sm text-slate-500">
                  {t('seller.pageInfo', { page: String(page), totalPages: String(totalPages), total: String(total) })}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => changePage(Math.max(1, page - 1))}
                    className="btn btn-ghost border disabled:opacity-40"
                  >
                    {t('seller.prevPage')}
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => changePage(Math.min(totalPages, page + 1))}
                    className="btn btn-ghost border disabled:opacity-40"
                  >
                    {t('seller.nextPage')}
                  </button>
                </div>
              </div>
            )}
          </div>
          </div>
        </section>
      </main>
    </div>
  );
}
