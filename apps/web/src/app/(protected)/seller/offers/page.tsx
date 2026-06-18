'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, normalizePaginated } from '@/lib/api';
import { OfferItem, PaginatedResult, RequestItem } from '@/lib/types';
import { Header } from '@/components/Header';
import { PanelListLoading } from '@/components/PanelListLoading';
import { PaginationControls } from '@/components/PaginationControls';
import { SellerSentOfferCard } from '@/components/SellerSentOfferCard';
import { SellerSavedRequestCard } from '@/components/SellerSavedRequestCard';
import { useAuth } from '@/providers/AuthProvider';
import { useT } from '@/lib/i18n';
import { scrollPanelToTop } from '@/lib/scroll';

type Tab = 'sent' | 'saved';
type SentStatusFilter = 'all' | 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA';

const SENT_STATUS_FILTERS = ['PENDIENTE', 'ACEPTADA', 'RECHAZADA'] as const;

function parseSentStatusFilter(value: string | null): SentStatusFilter {
  if (value && SENT_STATUS_FILTERS.includes(value as (typeof SENT_STATUS_FILTERS)[number])) {
    return value as SentStatusFilter;
  }
  return 'all';
}

function SentOffersTab() {
  const { user } = useAuth();
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = parseSentStatusFilter(searchParams.get('status'));
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, page: 1 });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const listTopRef = useRef<HTMLDivElement>(null);

  const scrollOffersToTop = () => {
    scrollPanelToTop();
    listTopRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
  };

  const setStatusFilter = (next: SentStatusFilter) => {
    scrollOffersToTop();
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'all') params.delete('status');
    else params.set('status', next);
    const query = params.toString();
    router.replace(query ? `/seller/offers?${query}` : '/seller/offers', { scroll: false });
    setPage(1);
  };

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    setError('');
    setLoading(true);
    const statusQuery = statusFilter === 'all' ? '' : `&status=${statusFilter}`;
    api<PaginatedResult<OfferItem> | OfferItem[]>(`/offers/sent?page=${page}${statusQuery}`)
      .then((raw) => {
        if (cancelled) return;
        const data = normalizePaginated(raw);
        setOffers(data.items);
        setMeta({ total: data.total, totalPages: data.totalPages, page: data.page });
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : t('common.error'));
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          scrollOffersToTop();
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, page, statusFilter, t]);

  const emptyCopy =
    statusFilter === 'PENDIENTE'
      ? { title: t('seller.noSentPending'), hint: t('seller.noSentPendingHint') }
      : statusFilter === 'ACEPTADA'
        ? { title: t('seller.noSentAccepted'), hint: t('seller.noSentAcceptedHint') }
        : statusFilter === 'RECHAZADA'
          ? { title: t('seller.noSentRejected'), hint: t('seller.noSentRejectedHint') }
          : { title: t('seller.noSent'), hint: t('seller.noSentHint') };

  const statusFilters: { id: SentStatusFilter; label: string }[] = [
    { id: 'all', label: t('seller.sentFilterAll') },
    { id: 'PENDIENTE', label: t('seller.sentFilterPending') },
    { id: 'ACEPTADA', label: t('seller.sentFilterAccepted') },
    { id: 'RECHAZADA', label: t('seller.sentFilterRejected') },
  ];

  return (
    <div ref={listTopRef} className="mx-auto max-w-4xl scroll-mt-24">
      <p className="text-sm text-slate-500">{t('seller.sentSubtitle')}</p>

      <div className="panel-tabs mt-4" role="tablist" aria-label={t('seller.sentTitle')}>
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

      {meta.total > 0 && (
        <p className="mt-3 text-sm text-slate-400">{t('seller.sentCount', { total: String(meta.total) })}</p>
      )}
      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      <div className="mt-6 space-y-6">
        <PanelListLoading loading={loading && offers.length === 0} />
        <div className={loading && offers.length > 0 ? 'space-y-6 opacity-60 transition-opacity' : 'space-y-6'}>
            {offers.length === 0 && !loading && !error && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
                <h3 className="text-lg font-bold text-white">{emptyCopy.title}</h3>
                <p className="mt-2 text-sm text-slate-500">{emptyCopy.hint}</p>
                {statusFilter === 'all' && (
                  <Link href="/seller" className="btn btn-accent mt-5 inline-flex">
                    {t('seller.noSentCta')}
                  </Link>
                )}
              </div>
            )}
            {offers.map((o) => (
              <SellerSentOfferCard
                key={o.id}
                offer={o}
                onDismissed={(id) => {
                  setOffers((prev) => prev.filter((x) => x.id !== id));
                  setMeta((m) => ({ ...m, total: Math.max(0, m.total - 1) }));
                }}
              />
            ))}
            {offers.length > 0 && (
              <PaginationControls
                page={meta.page}
                totalPages={meta.totalPages}
                total={meta.total}
                onPageChange={(nextPage) => {
                  scrollOffersToTop();
                  setPage(nextPage);
                }}
                scrollToTopOnChange={false}
                itemLabel={t('seller.sentTitle').toLowerCase()}
              />
            )}
        </div>
      </div>
    </div>
  );
}

function SavedRequestsTab() {
  const { user } = useAuth();
  const t = useT();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    api<RequestItem[]>('/saved-requests')
      .then((items) => {
        if (!cancelled) setRequests(items);
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
  }, [user?.id, t]);

  if (!user) return null;

  return (
    <div>
      <p className="text-sm text-slate-500">{t('savedRequest.subtitle')}</p>
      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      <div className="mt-6">
        <PanelListLoading loading={loading} />
        {!loading && requests.length === 0 && !error && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
            <h3 className="text-lg font-bold text-white">{t('savedRequest.emptyTitle')}</h3>
            <p className="mt-2 text-sm text-slate-500">{t('savedRequest.emptyText')}</p>
            <Link href="/seller" className="btn btn-accent mt-5 inline-flex">
              {t('savedRequest.exploreCta')}
            </Link>
          </div>
        )}
        {!loading && requests.length > 0 && (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {requests.map((r) => (
              <SellerSavedRequestCard
                key={r.id}
                request={r}
                locale={user.locale}
                onUnsaved={(id) => setRequests((prev) => prev.filter((x) => x.id !== id))}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SellerOffersContent() {
  const { user } = useAuth();
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab: Tab = searchParams.get('tab') === 'saved' ? 'saved' : 'sent';

  if (!user) return null;

  const setTab = (next: Tab) => {
    scrollPanelToTop();
    router.replace(next === 'saved' ? '/seller/offers?tab=saved' : '/seller/offers', { scroll: false });
  };

  return (
    <div className="panel-dark">
      <Header variant="dark" />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-bold text-white">{t('seller.title')}</h1>
        <p className="mt-1 text-slate-500">
          {t('seller.hello')}, <strong className="text-slate-200">{user.name}</strong>
        </p>

        <div className="panel-tabs mt-6">
          <button
            type="button"
            className={`panel-tab ${tab === 'sent' ? 'active' : ''}`}
            onClick={() => setTab('sent')}
            aria-pressed={tab === 'sent'}
          >
            {t('seller.offersTabSent')}
          </button>
          <button
            type="button"
            className={`panel-tab ${tab === 'saved' ? 'active' : ''}`}
            onClick={() => setTab('saved')}
            aria-pressed={tab === 'saved'}
          >
            {t('seller.offersTabSaved')}
          </button>
        </div>

        <section className="panel-fade-in mt-8" key={tab}>
          {tab === 'sent' ? <SentOffersTab /> : <SavedRequestsTab />}
        </section>
      </main>
    </div>
  );
}

export default function SellerOffersPage() {
  return (
    <Suspense fallback={null}>
      <SellerOffersContent />
    </Suspense>
  );
}
