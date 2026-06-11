'use client';

import { useEffect, useState } from 'react';
import { api, normalizePaginated } from '@/lib/api';
import { OfferItem, PaginatedResult } from '@/lib/types';
import { Header } from '@/components/Header';
import { PaginationControls } from '@/components/PaginationControls';
import { SellerSentOfferCard } from '@/components/SellerSentOfferCard';
import { SellerSubnav } from '@/components/SellerSubnav';
import { useAuth } from '@/providers/AuthProvider';
import { useT } from '@/lib/i18n';

export default function SellerOffersPage() {
  const { user } = useAuth();
  const t = useT();
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, page: 1 });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    setError('');
    api<PaginatedResult<OfferItem> | OfferItem[]>(`/offers/sent?page=${page}`)
      .then((raw) => {
        const data = normalizePaginated(raw);
        setOffers(data.items);
        setMeta({ total: data.total, totalPages: data.totalPages, page: data.page });
      })
      .catch((e) => setError(e instanceof Error ? e.message : t('common.error')));
  }, [user, page, t]);

  if (!user) return null;

  return (
    <div className="panel-dark">
      <Header variant="dark" />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-3xl font-bold text-white">{t('seller.title')}</h1>
        <p className="mt-1 text-slate-500">
          {t('seller.hello')}, <strong className="text-slate-200">{user.name}</strong>
        </p>

        <SellerSubnav />

        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

        <section className="mt-8">
          <h2 className="text-xl font-bold text-white">{t('seller.sentTitle')}</h2>
          <p className="mt-1 text-sm text-slate-500">{t('seller.sentSubtitle')}</p>

          {meta.total > 0 && (
            <p className="mt-3 text-sm text-slate-400">
              {t('seller.sentCount', { total: String(meta.total) })}
            </p>
          )}

          <div className="mt-6 space-y-6">
            {offers.length === 0 && !error && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
                <p className="text-slate-400">{t('seller.noSent')}</p>
                <p className="mt-2 text-sm text-slate-500">{t('seller.noSentHint')}</p>
              </div>
            )}

            {offers.map((o) => (
              <SellerSentOfferCard key={o.id} offer={o} />
            ))}

            <PaginationControls
              page={meta.page}
              totalPages={meta.totalPages}
              total={meta.total}
              onPageChange={setPage}
              itemLabel={t('seller.sentTitle').toLowerCase()}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
