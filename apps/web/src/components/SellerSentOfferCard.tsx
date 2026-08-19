'use client';

import { useState } from 'react';
import Link from 'next/link';
import { isActiveNegotiation, isNegotiationEndedWithoutDeal, canRemoveOfferFromListing } from '@buyseekk/shared';
import { api, formatMoney } from '@/lib/api';
import { offerStatusLabel, useLocale, useT } from '@/lib/i18n';
import type { OfferItem } from '@/lib/types';
import { CompareBlock } from '@/components/CompareBlock';

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
  const [deleting, setDeleting] = useState(false);
  const statusClass = STATUS_CLASS[offer.status] ?? STATUS_CLASS.PENDIENTE;
  const dealCompleted = !!offer.dealCompletedAt;
  const negotiationEnded = isNegotiationEndedWithoutDeal(offer);
  const activeNegotiation = isActiveNegotiation(offer);
  const requestClosedWithoutDeal =
    activeNegotiation && offer.request?.status === 'CERRADA';
  const canDelete = canRemoveOfferFromListing(offer);

  const acceptedBadge = dealCompleted
    ? t('buyer.offerDealCompleted')
    : negotiationEnded
      ? t('seller.negotiationEndedLabel')
      : requestClosedWithoutDeal
        ? t('seller.requestClosed')
        : activeNegotiation
          ? t('seller.inNegotiation')
          : offerStatusLabel(locale, offer.status);

  async function handleDelete() {
    if (deleting) return;
    if (!window.confirm(t('seller.deleteOfferConfirm'))) return;
    setDeleting(true);
    try {
      await api(`/offers/${offer.id}`, { method: 'DELETE' });
      onDeleted?.(offer.id);
    } catch {
      setDeleting(false);
    }
  }

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
        <span className={`offer-status-badge ${statusClass}`}>
          {acceptedBadge}
        </span>
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
        <div className="offer-decision-bar offer-decision-bar--seller">
          {dealCompleted && (
            <p className="offer-decision-bar__hint">{t('seller.dealCompletedHint')}</p>
          )}
          {negotiationEnded && (
            <p className="offer-decision-bar__hint">{t('seller.negotiationEndedLabel')}</p>
          )}
          {requestClosedWithoutDeal && (
            <p className="offer-decision-bar__hint">{t('seller.requestClosedHint')}</p>
          )}

          <div className="offer-decision-bar__actions">
            <Link href={`/chats/${offer.chatId}`} className="offer-action-btn offer-action-btn--primary">
              {t('seller.openChat')}
            </Link>
            {activeNegotiation && onEndNegotiation && (
              <button
                type="button"
                className="offer-action-btn offer-action-btn--ghost"
                onClick={() => {
                  if (window.confirm(t('seller.endNegotiationConfirm'))) {
                    onEndNegotiation(offer.id);
                  }
                }}
              >
                {t('seller.endNegotiationAction')}
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                className="offer-action-btn offer-action-btn--ghost"
                onClick={handleDelete}
                disabled={deleting}
              >
                {t('seller.deleteOffer')}
              </button>
            )}
          </div>
        </div>
      )}

      {offer.status === 'RECHAZADA' && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-slate-400">{t('seller.rejectedNoReoffer')}</p>
          <button
            type="button"
            className="offer-action-btn offer-action-btn--ghost"
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
