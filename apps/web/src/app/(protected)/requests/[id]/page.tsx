'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { budgetLimitErrorKey, budgetMaxLabel } from '@/lib/money-limits';
import { EmailVerificationErrorAlert } from '@/components/EmailVerificationErrorAlert';
import { spamFieldErrors } from '@/lib/spam';
import { RequestItem } from '@/lib/types';
import { Header } from '@/components/Header';
import { ImageGallery } from '@/components/ImageGallery';
import { ImageUpload } from '@/components/ImageUpload';
import { useAuth } from '@/providers/AuthProvider';
import { useRequireActiveMode } from '@/hooks/useRequireActiveMode';
import { RequestMeta } from '@/components/RequestMeta';
import { PortalLoadingScreen } from '@/components/PortalLoadingScreen';
import { RequestActivity, RequestStatusBadge } from '@/components/RequestStatusBadge';
import { SaveRequestButton, canSellerOfferOnRequest } from '@/components/SaveRequestButton';
import { ReportButton } from '@/components/ReportButton';
import { useT } from '@/lib/i18n';
import { showCurrencySelectors } from '@/lib/launch-country';
import { MoneyInput } from '@/components/MoneyInput';
import { moneyInputLocale } from '@/lib/money-input';

export default function RequestDetailPage() {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  useRequireActiveMode('seller');
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
    if (!request) return;
    if (!imageUrls.length) {
      setError(t('request.needPhoto'));
      return;
    }
    const spamMsgs = spamFieldErrors(t, message);
    if (spamMsgs.length) {
      setError(spamMsgs.join('\n'));
      return;
    }
    const priceNum = parseInt(price, 10);
    const isRent = request?.operation === 'ALQUILER' || !!request?.budgetPeriod;
    if (budgetLimitErrorKey(priceNum, currency as 'USD' | 'ARS', isRent)) {
      setError(t('request.priceMax', { max: budgetMaxLabel(currency as 'USD' | 'ARS', isRent) }));
      return;
    }
    try {
      await api('/offers', {
        method: 'POST',
        body: JSON.stringify({ requestId: id, price: parseInt(price), currency, message, imageUrls }),
      });
      router.push('/seller/offers');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    }
  }

  if (!user || !request) {
    return <PortalLoadingScreen />;
  }

  const canOffer = canSellerOfferOnRequest(request.status, request.myOffer);

  return (
    <div className="panel-dark">
      <Header variant="dark" />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <button
          type="button"
          onClick={() => router.back()}
          className="portal-header-link mb-6 inline-flex items-center gap-1"
        >
          ← {t('common.back')}
        </button>
        <div className="grid gap-8 md:grid-cols-2">
          <div>
          {(request.imageUrls?.length ?? 0) > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t('request.refPhotos')}
              </p>
              <ImageGallery
                urls={request.imageUrls}
                alt={request.title}
                className="h-64 md:h-80"
                cover
              />
            </div>
          )}
          {user.id === request.user.id &&
            (request.hiddenByModeration || request.moderationReviewRequired) && (
              <div className="mb-3 rounded-xl border border-amber-300/40 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-200">
                {t('account.underReview')}
              </div>
            )}
          <div className="mb-2 flex items-start justify-between gap-3">
            <RequestStatusBadge status={request.status} />
            <SaveRequestButton requestId={request.id} initialSaved={request.isSaved} />
          </div>
          <RequestMeta request={request} locale={user.locale} size="md" />
          <p className="mt-2 text-sm text-slate-400">
            {request.location}
            {request.category === 'INMOBILIARIA' && request.zone ? ` · ${request.zone}` : ''} · {t('request.buyer')}:{' '}
            <Link href={`/users/${request.user.id}`} className="font-semibold text-indigo-600 hover:underline">
              {request.user.name}
            </Link>
          </p>
          <RequestActivity
            offersCount={request.offersCount}
            conversationsCount={request.conversationsCount}
            lastBuyerActivityAt={request.lastBuyerActivityAt ?? request.lastActivityAt}
            createdAt={request.createdAt}
            showPublished
            className="mt-1"
          />
          {user.id !== request.user.id && (
            <div className="mt-4">
              <ReportButton target={{ requestId: request.id, reportedUserId: request.user.id }} />
            </div>
          )}
        </div>
        {canOffer ? (
          <form onSubmit={sendOffer} className="card offer-form h-fit p-6">
            <h2 className="text-xl font-bold text-white">{t('request.sendOfferTitle')}</h2>
            {error && <EmailVerificationErrorAlert message={error} className="mt-3" />}
            <div className="offer-form__fields">
              <div className="offer-form__field">
                <label htmlFor="offer-price" className="offer-form__label">
                  {t('request.pricePlaceholder')}
                </label>
                <MoneyInput
                  id="offer-price"
                  className="input offer-form__input w-full"
                  value={price}
                  onChange={setPrice}
                  locale={moneyInputLocale(currency as 'USD' | 'ARS')}
                  required
                />
              </div>
              <div className="offer-form__field">
                <label htmlFor="offer-message" className="offer-form__label">
                  {t('request.messagePlaceholder')}
                </label>
                <textarea
                  id="offer-message"
                  className="input offer-form__input w-full"
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
              </div>
              <ImageUpload
                label={t('request.productPhotos')}
                hint={t('request.productPhotosHint')}
                value={imageUrls}
                onChange={setImageUrls}
                required
                variant="panel"
              />
              <button className="btn btn-accent w-full">{t('request.submitOffer')}</button>
            </div>
          </form>
        ) : (
          <div className="card h-fit p-6">
            <h2 className="text-xl font-bold text-white">{t('request.sendOfferTitle')}</h2>
            <p className="mt-3 text-sm text-slate-400">
              {request.myOffer ? t('savedRequest.alreadyOffered') : t('savedRequest.cannotOffer')}
            </p>
            {request.myOffer?.chatId && (
              <Link href={`/chats/${request.myOffer.chatId}`} className="btn btn-accent mt-4 inline-flex w-full justify-center">
                {t('savedRequest.viewChat')}
              </Link>
            )}
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
