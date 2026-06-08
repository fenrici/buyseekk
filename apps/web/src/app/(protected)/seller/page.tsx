'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { citiesForCountry } from '@buyseekk/shared';
import { api, formatMoney } from '@/lib/api';
import { OfferItem, PaginatedResult, RequestItem } from '@/lib/types';
import { AutoFilters, AutoFilterValues } from '@/components/AutoFilters';
import { RealEstateFilters, RealEstateFilterValues } from '@/components/RealEstateFilters';
import { ZoneChips } from '@/components/ZoneChips';
import { Header } from '@/components/Header';
import { CompareBlock } from '@/components/CompareBlock';
import { RequestCard } from '@/components/RequestCard';
import { useAuth } from '@/providers/AuthProvider';
import { offerStatusLabel, useT } from '@/lib/i18n';

export default function SellerPage() {
  const { user } = useAuth();
  const t = useT();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sentOffers, setSentOffers] = useState<OfferItem[]>([]);
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
    maxMileage: '',
  });
  const [error, setError] = useState('');

  async function load(pageNum = page) {
    if (!user) return;
    try {
      const params = new URLSearchParams();
      params.set('page', String(pageNum));
      if (category) params.set('category', category);
      if (operation) params.set('operation', operation);
      if (location) params.set('location', location);
      if (zone) params.set('zone', zone);
      if (category !== 'AUTOS') {
        if (estateFilters.bedrooms) params.set('bedrooms', estateFilters.bedrooms);
        if (estateFilters.minSqm) params.set('minSqm', estateFilters.minSqm);
        if (estateFilters.maxSqm) params.set('maxSqm', estateFilters.maxSqm);
      }
      if (category !== 'INMOBILIARIA') {
        if (autoFilters.carBrand) params.set('carBrand', autoFilters.carBrand);
        if (autoFilters.carModel) params.set('carModel', autoFilters.carModel);
        if (autoFilters.carColor) params.set('carColor', autoFilters.carColor);
        if (autoFilters.maxMileage) params.set('maxMileage', autoFilters.maxMileage);
      }
      const q = params.toString() ? `?${params}` : '';

      const [reqs, offers] = await Promise.all([
        api<PaginatedResult<RequestItem>>(`/requests${q}`),
        api<PaginatedResult<OfferItem>>('/offers/sent'),
      ]);
      setRequests(reqs.items);
      setPage(reqs.page);
      setTotalPages(reqs.totalPages);
      setTotal(reqs.total);
      setSentOffers(offers.items);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    }
  }

  useEffect(() => {
    setPage(1);
  }, [category, operation, location, zone, estateFilters, autoFilters]);

  useEffect(() => {
    if (user) load(page);
  }, [user, page, category, operation, location, zone, estateFilters, autoFilters]);

  if (!user) return null;

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
    !!(autoFilters.carBrand || autoFilters.carModel || autoFilters.carColor || autoFilters.maxMileage)
    || !!(estateFilters.bedrooms || estateFilters.minSqm || estateFilters.maxSqm)
    || !!zone
    || !!operation;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-bold">{t('seller.title')}</h1>
        <p className="mt-1 text-slate-500">
          {t('seller.hello')}, <strong>{user.name}</strong> — {t('seller.subtitle')}
        </p>
        <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700">
          {t('seller.market')}: {marketLabel}
        </p>

        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

        <section className="mt-10">
          <h2 className="text-xl font-bold">{t('seller.requestsTitle')}</h2>

          <div className="mt-4 flex flex-wrap gap-2">
            {categoryFilters.map((c) => (
              <button
                key={c.id || 'all'}
                onClick={() => setCategory(c.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${category === c.id ? 'bg-indigo-600 text-white' : 'border bg-white'}`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-500">{t('seller.filterOperation')}:</span>
            {operationFilters.map((op) => (
              <button
                key={op.id || 'all-ops'}
                onClick={() => setOperation(op.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${operation === op.id ? 'bg-violet-600 text-white' : 'border bg-white'}`}
              >
                {op.label}
              </button>
            ))}
          </div>

          <div className="mt-4">
            <span className="text-sm font-semibold text-slate-500">{t('seller.filterCity')}:</span>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setLocation('');
                  setZone('');
                }}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${location === '' ? 'bg-emerald-600 text-white' : 'border bg-white'}`}
              >
                {t('seller.allCities')}
              </button>
              {cities.map((city) => (
                <button
                  key={city}
                  onClick={() => {
                    setLocation(city);
                    setZone('');
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${location === city ? 'bg-emerald-600 text-white' : 'border bg-white'}`}
                >
                  {city}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <span className="text-sm font-semibold text-slate-500">{t('request.zone')}:</span>
            <ZoneChips
              country={user.country}
              city={location}
              value={zone}
              onChange={setZone}
            />
          </div>

          <RealEstateFilters
            visible={category === '' || category === 'INMOBILIARIA'}
            values={estateFilters}
            onChange={setEstateFilters}
          />

          <AutoFilters
            visible={category === '' || category === 'AUTOS'}
            values={autoFilters}
            onChange={setAutoFilters}
          />

          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
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
        </section>

        <section className="mt-14 border-t pt-10">
          <h2 className="text-xl font-bold">{t('seller.sentTitle')}</h2>
          <div className="mt-6 space-y-6">
            {sentOffers.length === 0 && <p className="text-slate-500">{t('seller.noSent')}</p>}
            {sentOffers.map((o) => (
              <article key={o.id} className="rounded-xl border bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold">{o.requestTitle}</h3>
                    <p className="text-sm text-slate-500">{t('seller.offeredPrice')}: {formatMoney(o.price, o.currency)}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                    o.status === 'ACEPTADA' ? 'bg-emerald-100 text-emerald-700' :
                    o.status === 'RECHAZADA' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>{offerStatusLabel(user.locale, o.status)}</span>
                </div>
                <CompareBlock offer={o} perspective="seller" />
                {o.status === 'ACEPTADA' && o.chatId && (
                  <Link
                    href={`/chats/${o.chatId}`}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    💬 {t('seller.openChat')}
                  </Link>
                )}
              </article>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
