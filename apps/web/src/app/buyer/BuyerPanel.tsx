'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, formatMoney } from '@/lib/api';
import { ImageGallery } from '@/components/ImageGallery';
import { OfferItem, RequestItem } from '@/lib/types';
import { Header } from '@/components/Header';
import { CompareBlock } from '@/components/CompareBlock';
import { UserRatingBadge } from '@/components/UserRatingBadge';
import { CreateRequestForm } from '@/components/CreateRequestForm';
import { useUser } from '@/hooks/useUser';
import { isBuyerRole } from '@/lib/auth';

type Tab = 'publish' | 'mine' | 'offers';

export function BuyerPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useUser();
  const [tab, setTab] = useState<Tab>('publish');
  const [myRequests, setMyRequests] = useState<RequestItem[]>([]);
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'publish' || t === 'mine' || t === 'offers') setTab(t);
  }, [searchParams]);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && user && !isBuyerRole(user.role)) router.push('/seller');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    api<OfferItem[]>('/offers/received').then(setOffers).catch(() => {});
  }, [user]);

  async function loadMine() {
    const data = await api<RequestItem[]>('/requests/mine');
    setMyRequests(data);
  }

  async function loadOffers() {
    const data = await api<OfferItem[]>('/offers/received');
    setOffers(data);
  }

  useEffect(() => {
    if (!user) return;
    setError('');
    if (tab === 'mine') loadMine().catch((e) => setError(e.message));
    if (tab === 'offers') loadOffers().catch((e) => setError(e.message));
  }, [tab, user]);

  async function accept(id: string) {
    const res = await api<{ chatId?: string }>(`/offers/${id}/accept`, { method: 'PATCH' });
    if (res.chatId) {
      router.push(`/chats/${res.chatId}`);
      return;
    }
    loadOffers();
  }

  async function reject(id: string) {
    await api(`/offers/${id}/reject`, { method: 'PATCH' });
    loadOffers();
  }

  async function removeRequest(id: string) {
    await api(`/requests/${id}`, { method: 'DELETE' });
    loadMine();
  }

  if (loading || !user) {
    return <><Header /><main className="p-8">Cargando...</main></>;
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'publish', label: 'Crear solicitud' },
    { id: 'mine', label: 'Mis solicitudes' },
    { id: 'offers', label: 'Ofertas recibidas' },
  ];

  const pendingCount = offers.filter((o) => o.status === 'PENDIENTE').length;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-3xl font-bold">Panel comprador</h1>
        <p className="mt-1 text-slate-500">Publicá lo que buscás y revisá las ofertas que te envían</p>

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
            <CreateRequestForm user={user} onSuccess={() => { setTab('mine'); loadMine(); }} />
          </div>
        )}

        {tab === 'mine' && (
          <div className="mt-8 space-y-4">
            {myRequests.length === 0 && <p className="text-slate-500">Todavía no publicaste ninguna solicitud.</p>}
            {myRequests.map((r) => (
              <article key={r.id} className="card card-listing overflow-hidden">
                <ImageGallery urls={r.imageUrls} alt={r.title} className="h-48" />
                <div className="flex flex-wrap items-start justify-between gap-3 p-5">
                  <div>
                    <span className="text-xs font-bold uppercase text-indigo-600">{r.category}</span>
                    <h2 className="font-bold">{r.title}</h2>
                    <p className="mt-1 text-lg font-extrabold text-emerald-600">{formatMoney(r.budget, r.currency, r.budgetPeriod ?? '')}</p>
                    <p className="mt-2 text-sm text-slate-500">{r.requirements}</p>
                    <p className="mt-2 text-xs text-slate-400">{r.location} · {r.offersCount} ofertas · {r.pendingOffersCount} pendientes</p>
                  </div>
                  <button onClick={() => removeRequest(r.id)} className="rounded-lg border border-red-200 px-3 py-1 text-sm font-semibold text-red-600">
                    Eliminar
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {tab === 'offers' && (
          <div className="mt-8 space-y-6">
            {offers.length === 0 && <p className="text-slate-500">No tenés ofertas pendientes.</p>}
            {offers.map((o) => (
              <article key={o.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold">{o.requestTitle}</h2>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="avatar text-xs">
                        {(o.seller?.name ?? '?').split(' ').map((w) => w[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{o.seller?.name ?? '—'}</p>
                        <UserRatingBadge stats={o.seller?.rating} compact />
                      </div>
                    </div>
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">{o.status}</span>
                </div>
                <CompareBlock offer={o} />
                {o.status === 'PENDIENTE' && (
                  <div className="mt-4 flex gap-2">
                    <button onClick={() => accept(o.id)} className="btn btn-accent">Aceptar</button>
                    <button onClick={() => reject(o.id)} className="btn btn-ghost text-red-600">Rechazar</button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
