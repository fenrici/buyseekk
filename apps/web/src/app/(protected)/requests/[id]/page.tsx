'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { RequestItem } from '@/lib/types';
import { Header } from '@/components/Header';
import { ImageGallery } from '@/components/ImageGallery';
import { ImageUpload } from '@/components/ImageUpload';
import { useAuth } from '@/providers/AuthProvider';
import { RequestMeta } from '@/components/RequestMeta';
import { useT } from '@/lib/i18n';

export default function RequestDetailPage() {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [request, setRequest] = useState<RequestItem | null>(null);
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    setCurrency(user.currency);
    api<RequestItem>(`/requests/${id}`).then(setRequest).catch((e) => setError(e.message));
  }, [id, user]);

  async function sendOffer(e: React.FormEvent) {
    e.preventDefault();
    if (!imageUrls.length) {
      setError(t('request.needPhoto'));
      return;
    }
    try {
      await api('/offers', {
        method: 'POST',
        body: JSON.stringify({ requestId: id, price: parseInt(price), currency, message, imageUrls }),
      });
      router.push('/seller');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    }
  }

  if (!user || !request) {
    return <><Header /><main className="p-8">{t('common.loading')}</main></>;
  }

  return (
    <>
      <Header />
      <main className="mx-auto grid max-w-5xl gap-8 px-4 py-10 md:grid-cols-2">
        <div>
          {(request.imageUrls?.length ?? 0) > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t('request.refPhotos')}
              </p>
              <ImageGallery urls={request.imageUrls} alt={request.title} className="h-64 md:h-72" />
            </div>
          )}
          <RequestMeta request={request} locale={user.locale} size="md" />
          <p className="mt-2 text-sm text-slate-400">
            {request.location}
            {request.category === 'INMOBILIARIA' && request.zone ? ` · ${request.zone}` : ''} · {t('request.buyer')}: {request.user.name}
          </p>
        </div>
        <form onSubmit={sendOffer} className="card h-fit p-6">
          <h2 className="text-xl font-bold">{t('request.sendOfferTitle')}</h2>
          {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
          <div className="mt-4 space-y-4">
            <input className="input w-full" type="number" placeholder={t('request.pricePlaceholder')} value={price} onChange={(e) => setPrice(e.target.value)} required />
            <select className="input w-full" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="USD">USD</option>
              <option value="ARS">ARS</option>
            </select>
            <textarea className="input w-full" rows={4} placeholder={t('request.messagePlaceholder')} value={message} onChange={(e) => setMessage(e.target.value)} required />
            <ImageUpload
              label={t('request.productPhotos')}
              hint={t('request.productPhotosHint')}
              value={imageUrls}
              onChange={setImageUrls}
              required
            />
            <button className="btn btn-accent w-full">{t('request.submitOffer')}</button>
          </div>
        </form>
      </main>
    </>
  );
}
