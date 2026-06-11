'use client';

import { useEffect, useState } from 'react';
import { citiesForCountry } from '@buyseekk/shared';
import { api, normalizePaginated } from '@/lib/api';
import { PaginatedResult, RequestItem } from '@/lib/types';
import { AutoFilterValues } from '@/components/AutoFilters';
import { RealEstateFilterValues } from '@/components/RealEstateFilters';
import { SellerFiltersPanel } from '@/components/SellerFiltersPanel';
import { Header } from '@/components/Header';
import { RequestCard } from '@/components/RequestCard';
import { SellerSubnav } from '@/components/SellerSubnav';
import { useAuth } from '@/providers/AuthProvider';
import { useT } from '@/lib/i18n';

export default function SellerPage() {
  const { user } = useAuth();
  const t = useT();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [category, setCategory] = useState('');
  const [operation, setOperation] = useState('');
  const [location, setLocation] = useState('');
  const [zone, setZone] = useState('');
  const [estateFilters, setEstateFilters] = useState<RealEstateFilterValues>({
    bedrooms: '',
    minSqm: '',
    maxSqm: '',
  });
  const [autoFilters, setAutoFilters] = useState<AutoFilterValues>({
    carBrand: '',
    carModel: '',
    carColor: '',
    carYearMin: '',
    maxMileage: '',
  });
  const [error, setError] = useState('');

  async function load(pageNum = page) {
    if (!user) return;
    try {
      const params = new URLSearchParams();
      params.set('page', String(pageNum));
      const sellerCategory = user.sellerCategory;
      const cat = sellerCategory || category;
      if (!sellerCategory && category) params.set('category', category);
      if (operation) params.set('operation', operation);
      if (location) params.set('location', location);
      if (zone) params.set('zone', zone);
      if (cat !== 'AUTOS') {
        if (estateFilters.bedrooms) params.set('bedrooms', estateFilters.bedrooms);
        if (estateFilters.minSqm) params.set('minSqm', estateFilters.minSqm);
        if (estateFilters.maxSqm) params.set('maxSqm', estateFilters.maxSqm);
      }
      if (cat !== 'INMOBILIARIA') {
        if (autoFilters.carBrand) params.set('carBrand', autoFilters.carBrand);
        if (autoFilters.carModel) params.set('carModel', autoFilters.carModel);
        if (autoFilters.carColor) params.set('carColor', autoFilters.carColor);
        if (autoFilters.carYearMin) params.set('carYearMin', autoFilters.carYearMin);
        if (autoFilters.maxMileage) params.set('maxMileage', autoFilters.maxMileage);
      }
      const q = params.toString() ? `?${params}` : '';

      const reqsRaw = await api<PaginatedResult<RequestItem> | RequestItem[]>(`/requests${q}`);
      const reqs = normalizePaginated(reqsRaw);
      setRequests(reqs.items);
      setPage(reqs.page);
      setTotalPages(reqs.totalPages);
      setTotal(reqs.total);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    }
  }

  useEffect(() => {
    setPage(1);
  }, [category, operation, location, zone, estateFilters, autoFilters]);

  useEffect(() => {
    if (user?.sellerCategory) setCategory(user.sellerCategory);
  }, [user?.sellerCategory]);

  useEffect(() => {
    if (user) load(page);
  }, [user, page, category, operation, location, zone, estateFilters, autoFilters]);

  if (!user) return null;

  const lockedCategory = user.sellerCategory ?? '';
  const showCategoryFilter = !lockedCategory;
  const effectiveCategory = lockedCategory || category;

  const cities = citiesForCountry(user.country);

  const categoryFilters = [
    { id: '', label: t('seller.all') },
    { id: 'AUTOS', label: t('seller.autos') },
    { id: 'INMOBILIARIA', label: t('seller.realEstate') },
  ];

  const operationFilters = [
    { id: '', label: t('seller.allOperations') },
    { id: 'COMPRA', label: t('request.buy') },
    { id: 'ALQUILER', label: t('request.rent') },
  ];

  const marketLabel = user.country === 'US' ? t('seller.marketUS') : t('seller.marketAR');
  const hasActiveFilters =
    !!(autoFilters.carBrand || autoFilters.carModel || autoFilters.carColor || autoFilters.carYearMin || autoFilters.maxMileage)
    || !!(estateFilters.bedrooms || estateFilters.minSqm || estateFilters.maxSqm)
    || !!zone
    || !!operation;

  const filterPanelProps = {
    user,
    onCategoryChange: showCategoryFilter ? setCategory : undefined,
    operation,
    onOperationChange: setOperation,
    location,
    onLocationChange: setLocation,
    zone,
    onZoneChange: setZone,
    estateFilters,
    onEstateFiltersChange: setEstateFilters,
    autoFilters,
    onAutoFiltersChange: setAutoFilters,
    categoryFilters,
    operationFilters,
    cities,
    showCategoryFilter,
    category: effectiveCategory,
  };

  return (
    <div className="panel-dark">
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

        <SellerSubnav />

        <section className="mt-8">
          <h2 className="text-xl font-bold text-white lg:hidden">{t('seller.requestsTitle')}</h2>

          <div className="seller-browse-layout">
            <aside className="seller-filters-sidebar" aria-label={t('seller.filtersTitle')}>
              <SellerFiltersPanel {...filterPanelProps} />
            </aside>

            <div className="seller-filters-mobile">
              <SellerFiltersPanel {...filterPanelProps} />
            </div>

            <div className="seller-results">
              <div className="seller-results-header">
                <h2 className="text-xl font-bold text-white">{t('seller.requestsTitle')}</h2>
                {total > 0 && (
                  <p className="text-sm text-slate-500">
                    {t('seller.resultsCount', { count: String(total) })}
                  </p>
                )}
              </div>

          <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {requests.map((r) => (
              <RequestCard key={r.id} variant="seller" request={r} locale={user.locale} />
            ))}
          </div>
          {requests.length === 0 && (
            <p className="mt-4 text-slate-500">
              {hasActiveFilters
                ? t('seller.noAutoRequests')
                : location
                  ? t('seller.noRequestsCity')
                  : t('seller.noRequests')}
            </p>
          )}

          {totalPages > 1 && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <p className="text-sm text-slate-500">
                {t('seller.pageInfo', { page: String(page), totalPages: String(totalPages), total: String(total) })}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="btn btn-ghost border disabled:opacity-40"
                >
                  {t('seller.prevPage')}
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
