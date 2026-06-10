'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, normalizePaginated } from '@/lib/api';
import { OfferItem, PaginatedResult, RequestItem } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { Header } from '@/components/Header';
import { CompareBlock } from '@/components/CompareBlock';
import { PaginationControls } from '@/components/PaginationControls';
import { UserRatingBadge } from '@/components/UserRatingBadge';
import { CreateRequestForm } from '@/components/CreateRequestForm';
import { RequestCard } from '@/components/RequestCard';
import { useAuth } from '@/providers/AuthProvider';
import { offerStatusLabel, useT } from '@/lib/i18n';

type Tab = 'publish' | 'mine' | 'offers';

export function BuyerPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const t = useT();
  const [tab, setTab] = useState<Tab>('publish');
  const [myRequests, setMyRequests] = useState<RequestItem[]>([]);
  const [minePage, setMinePage] = useState(1);
  const [mineMeta, setMineMeta] = useState({ total: 0, totalPages: 1, page: 1 });
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [offersPage, setOffersPage] = useState(1);
  const [offersMeta, setOffersMeta] = useState({ total: 0, totalPages: 1, page: 1 });
  const [error, setError] = useState('');

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'publish' || t === 'mine' || t === 'offers') setTab(t);
  }, [searchParams]);

  async function loadMine(page = minePage) {
    const raw = await api<PaginatedResult<RequestItem> | RequestItem[]>(`/requests/mine?page=${page}`);
    const data = normalizePaginated(raw);
    setMyRequests(data.items);
    setMineMeta({ total: data.total, totalPages: data.totalPages, page: data.page });
    setMinePage(data.page);
  }

  async function loadOffers(page = offersPage) {
    const raw = await api<PaginatedResult<OfferItem> | OfferItem[]>(`/offers/received?page=${page}`);
    const data = normalizePaginated(raw);
    setOffers(data.items);
    setOffersMeta({ total: data.total, totalPages: data.totalPages, page: data.page });
    setOffersPage(data.page);
  }

  useEffect(() => {
    if (!user) return;
    setError('');
    if (tab === 'mine') loadMine(minePage).catch((e) => setError(e.message));
    if (tab === 'offers') loadOffers(offersPage).catch((e) => setError(e.message));
  }, [tab, user, minePage, offersPage]);

  async function accept(id: string) {
    try {
      const res = await api<{ chatId?: string }>(`/offers/${id}/accept`, { method: 'PATCH' });
      if (res.chatId) {
        router.push(`/chats/${res.chatId}`);
        return;
      }
      loadOffers(offersPage);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    }
  }

  async function reject(id: string) {
    try {
      await api(`/offers/${id}/reject`, { method: 'PATCH' });
      loadOffers(offersPage);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    }
  }

  async function removeRequest(id: string) {
    try {
      await api(`/requests/${id}`, { method: 'DELETE' });
      await loadMine(minePage);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    }
  }

  if (!user) return null;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'publish', label: t('buyer.tabPublish') },
    { id: 'mine', label: t('buyer.tabMine') },
    { id: 'offers', label: t('buyer.tabOffers') },
  ];

  const pendingCount = offers.filter((o) => o.status === 'PENDIENTE').length;

  return (
    <div className="panel-dark">
      <Header variant="dark" />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-3xl font-bold text-white">{t('buyer.title')}</h1>
        <p className="mt-1 text-slate-500">{t('buyer.subtitle')}</p>

        <div className="panel-tabs mt-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`panel-tab ${tab === t.id ? 'active' : ''}`}
            >
              {t.label}
              {t.id === 'offers' && pendingCount > 0 && (
                <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${tab === t.id ? 'bg-white/20' : 'bg-amber-400 text-white'}`}>
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

        {tab === 'publish' && (
          <div className="mt-8">
            <CreateRequestForm user={user} onSuccess={() => { setTab('mine'); loadMine(1); }} />
          </div>
        )}

        {tab === 'mine' && (
          <div className="mt-8 space-y-4">
            {myRequests.length === 0 && <p className="text-slate-500">{t('buyer.noRequests')}</p>}
            {myRequests.map((r) => (
              <RequestCard
                key={r.id}
                variant="buyer"
                request={r}
                locale={user.locale}
                onDelete={removeRequest}
                onUpdated={() => loadMine(minePage)}
              />
            ))}
            <PaginationControls
              page={mineMeta.page}
              totalPages={mineMeta.totalPages}
              total={mineMeta.total}
              onPageChange={setMinePage}
              itemLabel={t('buyer.tabMine').toLowerCase()}
            />
          </div>
        )}

        {tab === 'offers' && (
          <div className="mt-8 space-y-6">
            {offers.length === 0 && <p className="text-slate-500">{t('buyer.noOffers')}</p>}
            {offers.map((o) => (
              <article key={o.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold">{o.requestTitle}</h2>
                    <div className="mt-2 flex items-center gap-3">
                      {o.seller ? (
                        <Link href={`/users/${o.seller.id}`} className="shrink-0">
                          <Avatar name={o.seller.name} url={o.seller.avatarUrl} size={36} />
                        </Link>
                      ) : (
                        <Avatar name="?" size={36} />
                      )}
                      <div>
                        {o.seller ? (
                          <Link href={`/users/${o.seller.id}`} className="text-sm font-semibold hover:underline">
                            {o.seller.businessName || o.seller.name}
                          </Link>
                        ) : (
                          <p className="text-sm font-semibold">—</p>
                        )}
                        <UserRatingBadge stats={o.seller?.rating} compact />
                      </div>
                    </div>
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">{offerStatusLabel(user.locale, o.status)}</span>
                </div>
                <CompareBlock offer={o} />
                {o.status === 'PENDIENTE' && (
                  <div className="mt-4 flex gap-2">
                    <button onClick={() => accept(o.id)} className="btn btn-accent">{t('buyer.accept')}</button>
                    <button onClick={() => reject(o.id)} className="btn btn-ghost text-red-600">{t('buyer.reject')}</button>
                  </div>
                )}
                {o.status === 'ACEPTADA' && o.chatId && (
                  <Link
                    href={`/chats/${o.chatId}`}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    💬 {t('buyer.openChat')}
                  </Link>
                )}
              </article>
            ))}
            <PaginationControls
              page={offersMeta.page}
              totalPages={offersMeta.totalPages}
              total={offersMeta.total}
              onPageChange={setOffersPage}
              itemLabel={t('buyer.tabOffers').toLowerCase()}
            />
          </div>
        )}
      </main>
    </div>
  );
}
