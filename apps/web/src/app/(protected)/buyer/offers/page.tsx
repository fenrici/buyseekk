'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, normalizePaginated } from '@/lib/api';
import { highlightToOfferItem } from '@/lib/offer-highlight';
import { OfferHighlight, OfferItem, PaginatedResult } from '@/lib/types';
import { Header } from '@/components/Header';
import { PanelListLoading } from '@/components/PanelListLoading';
import { BuyerRequestOffersSummary } from '@/components/BuyerRequestOffersSummary';
import { OfferHighlightsSummary } from '@/components/OfferHighlightsSummary';
import { OfferReceivedCard } from '@/components/OfferReceivedCard';
import { OfferReceivedCompactCard } from '@/components/OfferReceivedCompactCard';
import { PaginationControls } from '@/components/PaginationControls';
import { useAuth } from '@/providers/AuthProvider';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useT } from '@/lib/i18n';

type ReceivedStatusFilter = 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA';

const DESKTOP_MIN = '(min-width: 1024px)';

function requestGroupKey(offer: OfferItem) {
  return offer.request?.id || `title:${offer.requestTitle}`;
}

function groupOffersByRequest(offers: OfferItem[]) {
  const groups: { key: string; offers: OfferItem[] }[] = [];
  const index = new Map<string, number>();
  for (const offer of offers) {
    const key = requestGroupKey(offer);
    const existing = index.get(key);
    if (existing == null) {
      index.set(key, groups.length);
      groups.push({ key, offers: [offer] });
    } else {
      groups[existing].offers.push(offer);
    }
  }
  return groups;
}

export default function BuyerOffersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const t = useT();
  const desktopMq = useMediaQuery(DESKTOP_MIN);
  const viewportReady = desktopMq !== null;
  const isDesktop = desktopMq === true;
  const [statusFilter, setStatusFilter] = useState<ReceivedStatusFilter>('PENDIENTE');
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [offerHighlights, setOfferHighlights] = useState<OfferHighlight[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, page: 1 });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
    setSelectedOfferId(null);
  }, [statusFilter]);

  useEffect(() => {
    if (isDesktop) setSelectedOfferId(null);
  }, [isDesktop]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setError('');
    setLoading(true);
    const loadHighlights = statusFilter === 'PENDIENTE';
    Promise.all([
      api<PaginatedResult<OfferItem> | OfferItem[]>(
        `/offers/received?page=${page}&status=${statusFilter}`,
      ),
      loadHighlights
        ? api<{ highlights: OfferHighlight[] }>('/offers/received/highlights')
        : Promise.resolve({ highlights: [] as OfferHighlight[] }),
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
  }, [user, page, statusFilter, t]);

  async function refresh() {
    const loadHighlights = statusFilter === 'PENDIENTE';
    const [raw, highlightsRes] = await Promise.all([
      api<PaginatedResult<OfferItem> | OfferItem[]>(
        `/offers/received?page=${page}&status=${statusFilter}`,
      ),
      loadHighlights
        ? api<{ highlights: OfferHighlight[] }>('/offers/received/highlights')
        : Promise.resolve({ highlights: [] as OfferHighlight[] }),
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
      setSelectedOfferId(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    }
  }

  async function reject(id: string) {
    try {
      await api(`/offers/${id}/reject`, { method: 'PATCH' });
      setSelectedOfferId(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    }
  }

  async function complete(id: string) {
    try {
      const res = await api<{ chatId?: string }>(`/offers/${id}/complete`, { method: 'PATCH' });
      if (res.chatId) {
        router.push(`/ratings`);
        return;
      }
      setSelectedOfferId(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    }
  }

  async function endNegotiation(id: string) {
    try {
      await api(`/offers/${id}/end-negotiation`, { method: 'PATCH' });
      setSelectedOfferId(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    }
  }

  async function removeFromListing(id: string) {
    try {
      await api(`/offers/${id}`, { method: 'DELETE' });
      setOffers((prev) => prev.filter((o) => o.id !== id));
      setMeta((m) => ({ ...m, total: Math.max(0, m.total - 1) }));
      setSelectedOfferId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    }
  }

  const highlightIds = useMemo(
    () => new Set(offerHighlights.map((h) => h.offerId)),
    [offerHighlights],
  );
  const listOffers = statusFilter === 'PENDIENTE' ? offers.filter((o) => !highlightIds.has(o.id)) : offers;
  const requestGroups = useMemo(() => groupOffersByRequest(listOffers), [listOffers]);

  const selectedOffer = useMemo(() => {
    if (isDesktop || !selectedOfferId) return null;
    const fromList = offers.find((o) => o.id === selectedOfferId);
    if (fromList) return fromList;
    const highlight = offerHighlights.find((h) => h.offerId === selectedOfferId);
    return highlight ? highlightToOfferItem(highlight) : null;
  }, [isDesktop, selectedOfferId, offers, offerHighlights]);

  const decisionHandlers = {
    onAccept: accept,
    onReject: reject,
    onComplete: statusFilter === 'ACEPTADA' ? complete : undefined,
    onEndNegotiation: statusFilter === 'ACEPTADA' ? endNegotiation : undefined,
    onDelete: statusFilter === 'ACEPTADA' ? removeFromListing : undefined,
  };

  if (!user) return null;

  const statusFilters: { id: ReceivedStatusFilter; label: string }[] = [
    { id: 'PENDIENTE', label: t('buyer.receivedFilterPending') },
    { id: 'ACEPTADA', label: t('buyer.receivedFilterAccepted') },
    { id: 'RECHAZADA', label: t('buyer.receivedFilterRejected') },
  ];
  const emptyCopy =
    statusFilter === 'ACEPTADA'
      ? { title: t('buyer.noReceivedAccepted'), hint: t('buyer.noReceivedAcceptedHint') }
      : statusFilter === 'RECHAZADA'
        ? { title: t('buyer.noReceivedRejected'), hint: t('buyer.noReceivedRejectedHint') }
        : { title: t('buyer.noOffers'), hint: null };

  const showListChrome = !viewportReady || isDesktop || !selectedOffer;
  const listPending = loading || !viewportReady;

  return (
    <div className="panel-dark">
      <Header variant="dark" />
      <main className="buyer-offers-page mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-bold text-white">{t('buyer.receivedTitle')}</h1>
        <p className="mt-1 text-slate-500">{t('buyer.receivedSubtitle')}</p>

        {showListChrome && (
          <div className="panel-tabs mt-6" role="tablist" aria-label={t('buyer.receivedTitle')}>
            {statusFilters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                role="tab"
                className={`panel-tab ${statusFilter === filter.id ? 'active' : ''}`}
                onClick={() => setStatusFilter(filter.id)}
                aria-selected={statusFilter === filter.id}
              >
                {filter.label}
              </button>
            ))}
          </div>
        )}

        {showListChrome && meta.total > 0 && (
          <p className="mt-3 text-sm text-slate-400">
            {t('buyer.receivedCount', { total: String(meta.total) })}
          </p>
        )}

        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

        <div className="mt-8 space-y-6">
          <PanelListLoading loading={listPending} />

          {!listPending && !isDesktop && selectedOffer && (
            <OfferReceivedCard
              offer={selectedOffer}
              {...decisionHandlers}
              onBack={() => setSelectedOfferId(null)}
              backLabel={t('buyer.backToOffers')}
            />
          )}

          {!listPending && (isDesktop || !selectedOffer) && (
            <>
              {offers.length === 0 && !error && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
                  <p className="text-slate-400">{emptyCopy.title}</p>
                  {emptyCopy.hint && <p className="mt-2 text-sm text-slate-500">{emptyCopy.hint}</p>}
                </div>
              )}

              {isDesktop ? (
                <div className="buyer-offers-desktop-list">
                  {statusFilter === 'PENDIENTE' &&
                    offerHighlights.map((h) => {
                      const badgeClass =
                        h.label === 'lowest_price'
                          ? 'offer-highlight-badge--price'
                          : h.label === 'closest_match'
                            ? 'offer-highlight-badge--closest'
                            : 'offer-highlight-badge--recommended';
                      const badgeLabel =
                        h.label === 'recommended'
                          ? t('highlights.badgeRecommended')
                          : h.label === 'lowest_price'
                            ? t('highlights.badgeLowest')
                            : t('highlights.badgeClosest');
                      return (
                        <OfferReceivedCard
                          key={`highlight-${h.label}-${h.offerId}`}
                          offer={highlightToOfferItem(h)}
                          {...decisionHandlers}
                          header={
                            <span className={`offer-highlight-badge ${badgeClass}`}>{badgeLabel}</span>
                          }
                        />
                      );
                    })}

                  {listOffers.length > 0 && offerHighlights.length > 0 && statusFilter === 'PENDIENTE' && (
                    <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                      {t('highlights.allOffers')}
                    </h2>
                  )}

                  {listOffers.map((o) => (
                    <OfferReceivedCard key={o.id} offer={o} {...decisionHandlers} />
                  ))}
                </div>
              ) : (
                <>
                  {statusFilter === 'PENDIENTE' && offerHighlights.length > 0 && (
                    <OfferHighlightsSummary
                      highlights={offerHighlights}
                      onViewOffer={setSelectedOfferId}
                    />
                  )}

                  {listOffers.length > 0 && offerHighlights.length > 0 && statusFilter === 'PENDIENTE' && (
                    <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                      {t('highlights.allOffers')}
                    </h2>
                  )}

                  <div className="buyer-offers-groups">
                    {requestGroups.map((group) => (
                      <section key={group.key} className="buyer-offers-group">
                        <BuyerRequestOffersSummary offer={group.offers[0]} />
                        <div className="buyer-offers-group__list">
                          {group.offers.map((o) => (
                            <OfferReceivedCompactCard
                              key={o.id}
                              offer={o}
                              onViewOffer={setSelectedOfferId}
                            />
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                </>
              )}

              <PaginationControls
                page={meta.page}
                totalPages={meta.totalPages}
                total={meta.total}
                onPageChange={(next) => {
                  setSelectedOfferId(null);
                  setPage(next);
                }}
                itemLabel={t('buyer.tabOffers').toLowerCase()}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
