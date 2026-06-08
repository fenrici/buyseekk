'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, formatMoney } from '@/lib/api';
import { RequestItem } from '@/lib/types';
import { Header } from '@/components/Header';
import { ImageGallery } from '@/components/ImageGallery';
import { ImageUpload } from '@/components/ImageUpload';
import { useUser } from '@/hooks/useUser';
import { isSellerRole } from '@/lib/auth';

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading } = useUser();
  const [request, setRequest] = useState<RequestItem | null>(null);
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && user && !isSellerRole(user.role)) router.push('/buyer');
  }, [user, loading, router]);

  useEffect(() => {
    if (user && isSellerRole(user.role)) {
      setCurrency(user.currency);
      api<RequestItem>(`/requests/${id}`).then(setRequest).catch((e) => setError(e.message));
    }
  }, [id, user]);

  async function sendOffer(e: React.FormEvent) {
    e.preventDefault();
    if (!imageUrls.length) {
      setError('Subí al menos una foto del producto que ofrecés');
      return;
    }
    try {
      await api('/offers', {
        method: 'POST',
        body: JSON.stringify({ requestId: id, price: parseInt(price), currency, message, imageUrls }),
      });
      router.push('/seller');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar oferta');
    }
  }

  if (loading || !user || !request) {
    return <><Header /><main className="p-8">Cargando...</main></>;
  }

  return (
    <>
      <Header />
      <main className="mx-auto grid max-w-5xl gap-8 px-4 py-10 md:grid-cols-2">
        <div>
          <ImageGallery urls={request.imageUrls} alt={request.title} className="h-64 md:h-72" />
          <h1 className="mt-4 text-2xl font-bold">{request.title}</h1>
          <p className="mt-2 text-2xl font-extrabold text-emerald-600">{formatMoney(request.budget, request.currency, request.budgetPeriod ?? '')}</p>
          <p className="mt-4 text-slate-600">{request.requirements}</p>
          <p className="mt-2 text-sm text-slate-400">{request.location} · Comprador: {request.user.name}</p>
        </div>
        <form onSubmit={sendOffer} className="h-fit rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Enviar oferta</h2>
          {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
          <div className="mt-4 space-y-4">
            <input className="w-full rounded-lg border px-3 py-2" type="number" placeholder="Precio ofertado" value={price} onChange={(e) => setPrice(e.target.value)} required />
            <select className="w-full rounded-lg border px-3 py-2" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="USD">USD</option>
              <option value="ARS">ARS</option>
            </select>
            <textarea className="w-full rounded-lg border px-3 py-2" rows={4} placeholder="Tu propuesta..." value={message} onChange={(e) => setMessage(e.target.value)} required />
            <ImageUpload
              label="Fotos del producto"
              hint="Al menos una obligatoria — el comprador debe ver qué ofrecés"
              value={imageUrls}
              onChange={setImageUrls}
              required
            />
            <button className="w-full rounded-lg bg-emerald-600 py-3 font-semibold text-white">Enviar oferta</button>
          </div>
        </form>
      </main>
    </>
  );
}
