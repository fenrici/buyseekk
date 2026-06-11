'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, normalizePaginated } from '@/lib/api';
import { OfferHighlight, OfferItem, PaginatedResult } from '@/lib/types';
import { Header } from '@/components/Header';
import { PanelListLoading } from '@/components/PanelListLoading';
import { OfferHighlightsSummary } from '@/components/OfferHighlightsSummary';
import { OfferReceivedCard } from '@/components/OfferReceivedCard';
import { PaginationControls } from '@/components/PaginationControls';
import { useAuth } from '@/providers/AuthProvider';
import { useT } from '@/lib/i18n';

export default function BuyerOffersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const t = useT();
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [offerHighlights, setOfferHighlights] = useState<OfferHighlight[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, page: 1 });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setError('');
    setLoading(true);
    Promise.all([
      api<PaginatedResult<OfferItem> | OfferItem[]>(`/offers/received?page=${page}`),
      api<{ highlights: OfferHighlight[] }>('/offers/received/highlights'),
    ])
      .then(([raw, highlightsRes]) => {
        if (cancelled) return;
        const data = normalizePaginated(raw);
        setOffers(data.items);
        setMeta({ total: data.total, totalPages: data.totalPages, page: data.page });
        setOfferHighlights(highlightsRes.highlights ?? []);
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
  }, [user, page, t]);

  async function refresh() {
    const [raw, highlightsRes] = await Promise.all([
      api<PaginatedResult<OfferItem> | OfferItem[]>(`/offers/received?page=${page}`),
      api<{ highlights: OfferHighlight[] }>('/offers/received/highlights'),
    ]);
    const data = normalizePaginated(raw);
    setOffers(data.items);
    setMeta({ total: data.total, totalPages: data.totalPages, page: data.page });
    setOfferHighlights(highlightsRes.highlights ?? []);
  }

  async function accept(id: string) {
    try {
      const res = await api<{ chatId?: string }>(`/offers/${id}/accept`, { method: 'PATCH' });
      if (res.chatId) {
        router.push(`/chats/${res.chatId}`);
        return;
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    }
  }

  async function reject(id: string) {
    try {
      await api(`/offers/${id}/reject`, { method: 'PATCH' });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    }
  }

  if (!user) return null;

  const highlightIds = new Set(offerHighlights.map((h) => h.offerId));
  const otherOffers = offers.filter((o) => !highlightIds.has(o.id));

  return (
    <div className="panel-dark">
      <Header variant="dark" />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-3xl font-bold text-white">{t('buyer.receivedTitle')}</h1>
        <p className="mt-1 text-slate-500">{t('buyer.receivedSubtitle')}</p>

        {meta.total > 0 && (
          <p className="mt-3 text-sm text-slate-400">
            {t('buyer.receivedCount', { total: String(meta.total) })}
          </p>
        )}

        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

        <div className="mt-8 space-y-6">
          <PanelListLoading loading={loading} />
          {!loading && (
            <>
              {offerHighlights.length > 0 && (
                <OfferHighlightsSummary
                  highlights={offerHighlights}
                  onAccept={accept}
                  onReject={reject}
                />
              )}

              {otherOffers.length > 0 && offerHighlights.length > 0 && (
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                  {t('highlights.allOffers')}
                </h2>
              )}

              {offers.length === 0 && !error && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
                  <p className="text-slate-400">{t('buyer.noOffers')}</p>
                </div>
              )}

              {otherOffers.map((o) => (
                <OfferReceivedCard
                  key={o.id}
                  offer={o}
                  onAccept={accept}
                  onReject={reject}
                />
              ))}

              <PaginationControls
                page={meta.page}
                totalPages={meta.totalPages}
                total={meta.total}
                onPageChange={setPage}
                itemLabel={t('buyer.tabOffers').toLowerCase()}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
