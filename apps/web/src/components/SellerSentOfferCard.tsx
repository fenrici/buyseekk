'use client';

import { useState } from 'react';
import { canRemoveOfferFromListing } from '@buyseekk/shared';
import { api, formatMoney } from '@/lib/api';
import { offerStatusLabel, useLocale, useT } from '@/lib/i18n';
import type { OfferItem } from '@/lib/types';
import { CompareBlock } from '@/components/CompareBlock';
import { OfferDecisionBar } from '@/components/OfferDecisionBar';

const STATUS_CLASS: Record<string, string> = {
  ACEPTADA: 'offer-status-badge--accepted',
  RECHAZADA: 'offer-status-badge--rejected',
  PENDIENTE: 'offer-status-badge--pending',
};

export function SellerSentOfferCard({
  offer,
  onDismissed,
  onDeleted,
  onEndNegotiation,
}: {
  offer: OfferItem;
  onDismissed?: (id: string) => void;
  onDeleted?: (id: string) => void;
  onEndNegotiation?: (id: string) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const [dismissing, setDismissing] = useState(false);
  const statusClass = STATUS_CLASS[offer.status] ?? STATUS_CLASS.PENDIENTE;
  const canDelete = canRemoveOfferFromListing(offer);
  const buyerName = offer.request?.user?.name ?? '—';

  async function handleDismiss() {
    if (dismissing) return;
    if (!window.confirm(t('seller.dismissOfferConfirm'))) return;
    setDismissing(true);
    try {
      await api(`/offers/${offer.id}`, { method: 'DELETE' });
      onDismissed?.(offer.id);
    } catch {
      setDismissing(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await api(`/offers/${id}`, { method: 'DELETE' });
      onDeleted?.(id);
    } catch {
      /* OfferDecisionBar has no loading state for delete */
    }
  }

  return (
    <article className="offer-received-card">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-400">{offer.requestTitle}</p>
          <p className="mt-1 text-lg font-bold text-white">
            {formatMoney(offer.price, offer.currency)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">{t('seller.offeredPrice')}</p>
        </div>
        {offer.status !== 'ACEPTADA' && (
          <span className={`offer-status-badge ${statusClass}`}>
            {offerStatusLabel(locale, offer.status)}
          </span>
        )}
      </div>

      {(offer.hiddenByModeration || offer.moderationReviewRequired) && (
        <div className="mb-3 rounded-lg border border-amber-300/40 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-200">
          {t('account.underReview')}
        </div>
      )}

      <CompareBlock offer={offer} perspective="seller" />

      {offer.status === 'PENDIENTE' && (
        <p className="mt-3 text-sm text-slate-400">{t('seller.pendingWaiting')}</p>
      )}

      {offer.status === 'ACEPTADA' && offer.chatId && (
        <OfferDecisionBar
          perspective="seller"
          partnerName={buyerName}
          subtitle={offer.dealCompletedAt ? t('seller.dealCompletedHint') : null}
          offerId={offer.id}
          status={offer.status}
          dealCompletedAt={offer.dealCompletedAt}
          negotiationEndedAt={offer.negotiationEndedAt}
          requestStatus={offer.request?.status}
          chatId={offer.chatId}
          onEndNegotiation={onEndNegotiation}
          onDelete={canDelete ? handleDelete : undefined}
        />
      )}

      {offer.status === 'RECHAZADA' && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-slate-400">{t('seller.rejectedNoReoffer')}</p>
          <button
            type="button"
            className="offer-secondary-action offer-secondary-action--button"
            onClick={handleDismiss}
            disabled={dismissing}
          >
            {t('seller.dismissOffer')}
          </button>
        </div>
      )}
    </article>
  );
}
