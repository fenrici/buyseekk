'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, formatMoney } from '@/lib/api';
import { ImageGallery } from '@/components/ImageGallery';
import { OfferItem, RequestItem } from '@/lib/types';
import { Header } from '@/components/Header';
import { CompareBlock } from '@/components/CompareBlock';
import { UserRatingBadge } from '@/components/UserRatingBadge';
import { useUser } from '@/hooks/useUser';
import { isSellerRole } from '@/lib/auth';

export default function SellerPage() {
  const router = useRouter();
  const { user, loading } = useUser();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [sentOffers, setSentOffers] = useState<OfferItem[]>([]);
  const [category, setCategory] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && user && !isSellerRole(user.role)) router.push('/buyer');
  }, [user, loading, router]);

  async function load() {
    if (!user) return;
    try {
      const q = category ? `?category=${category}` : '';
      const [reqs, offers] = await Promise.all([
        api<RequestItem[]>(`/requests${q}`),
        api<OfferItem[]>('/offers/sent'),
      ]);
      setRequests(reqs.filter((r) => r.user.id !== user.id));
      setSentOffers(offers);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando datos');
    }
  }

  useEffect(() => {
    if (user) load();
  }, [user, category]);

  if (loading || !user) {
    return <><Header /><main className="p-8">Cargando...</main></>;
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-bold">Panel vendedor</h1>
        <p className="mt-1 text-slate-500">
          Hola, <strong>{user.name}</strong> — explorá solicitudes y enviá ofertas
        </p>

        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

        <section className="mt-10">
          <h2 className="text-xl font-bold">Solicitudes de compradores</h2>
          <div className="mt-4 flex gap-2">
            {['', 'AUTOS', 'INMOBILIARIA'].map((c) => (
              <button key={c || 'all'} onClick={() => setCategory(c)} className={`rounded-full px-4 py-2 text-sm font-semibold ${category === c ? 'bg-indigo-600 text-white' : 'border bg-white'}`}>
                {c === '' ? 'Todas' : c === 'AUTOS' ? 'Autos' : 'Inmuebles'}
              </button>
            ))}
          </div>
          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {requests.map((r) => (
              <article key={r.id} className="card card-listing">
                <ImageGallery urls={r.imageUrls} alt={r.title} className="h-52" />
                <div className="flex flex-1 flex-col p-5">
                  <span className={`tag ${r.category === 'AUTOS' ? 'tag-autos' : 'tag-inm'}`}>
                    {r.category === 'AUTOS' ? 'Autos' : 'Inmuebles'}
                  </span>
                  <h3 className="mt-2 text-lg font-bold leading-snug">{r.title}</h3>
                  <p className="mt-2 text-xl font-extrabold text-[var(--accent)]">
                    {formatMoney(r.budget, r.currency, r.budgetPeriod ?? '')}
                  </p>
                  <p className="mt-2 line-clamp-2 flex-1 text-sm text-[var(--text-muted)]">{r.requirements}</p>
                  <p className="mt-2 text-xs text-slate-400">{r.location} · {r.offersCount} ofertas</p>
                  <div className="mt-4 flex items-center gap-3 border-t pt-4">
                    <div className="avatar text-xs">{r.user.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}</div>
                    <div>
                      <p className="text-sm font-semibold">{r.user.name}</p>
                      <UserRatingBadge stats={r.user.rating} compact />
                    </div>
                  </div>
                  <Link href={`/requests/${r.id}`} className="btn btn-accent mt-4 w-full">
                    Enviar oferta
                  </Link>
                </div>
              </article>
            ))}
          </div>
          {requests.length === 0 && <p className="mt-4 text-slate-500">No hay solicitudes en esta categoría.</p>}
        </section>

        <section className="mt-14 border-t pt-10">
          <h2 className="text-xl font-bold">Mis ofertas enviadas</h2>
          <div className="mt-6 space-y-6">
            {sentOffers.length === 0 && <p className="text-slate-500">Todavía no enviaste ofertas.</p>}
            {sentOffers.map((o) => (
              <article key={o.id} className="rounded-xl border bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold">{o.requestTitle}</h3>
                    <p className="text-sm text-slate-500">Precio ofertado: {formatMoney(o.price, o.currency)}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                    o.status === 'ACEPTADA' ? 'bg-emerald-100 text-emerald-700' :
                    o.status === 'RECHAZADA' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>{o.status}</span>
                </div>
                <CompareBlock offer={o} perspective="seller" />
                {o.status === 'ACEPTADA' && o.chatId && (
                  <Link
                    href={`/chats/${o.chatId}`}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    💬 Abrir chat
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
