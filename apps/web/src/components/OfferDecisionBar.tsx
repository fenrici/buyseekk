'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { canRemoveOfferFromListing } from '@buyseekk/shared';
import { useT } from '@/lib/i18n';

type Props = {
  identityName: string;
  subtitle?: ReactNode;
  offerId: string;
  status: string;
  dealCompletedAt?: string | null;
  negotiationEndedAt?: string | null;
  requestStatus?: string | null;
  chatId?: string | null;
  perspective?: 'buyer' | 'seller';
  onAccept?: (offerId: string) => void;
  onReject?: (offerId: string) => void;
  onComplete?: (offerId: string) => void;
  onEndNegotiation?: (offerId: string) => void;
  onDelete?: (offerId: string) => void;
};

type StatusPill = {
  label: string;
  tone: 'active' | 'success' | 'muted' | 'rejected';
};

function StatusBadge({ pill }: { pill: StatusPill }) {
  return (
    <span className={`offer-negotiation-status offer-negotiation-status--${pill.tone}`}>
      {pill.label}
    </span>
  );
}

export function OfferDecisionBar({
  identityName,
  subtitle,
  offerId,
  status,
  dealCompletedAt,
  negotiationEndedAt,
  requestStatus,
  chatId,
  perspective = 'buyer',
  onAccept,
  onReject,
  onComplete,
  onEndNegotiation,
  onDelete,
}: Props) {
  const t = useT();
  const isSeller = perspective === 'seller';
  const dealCompleted = !!dealCompletedAt;
  const negotiationEnded = !!negotiationEndedAt && !dealCompleted;
  const isActiveNegotiation = status === 'ACEPTADA' && !dealCompleted && !negotiationEnded;
  const requestClosedWithoutDeal =
    isActiveNegotiation && requestStatus === 'CERRADA';
  const canCompleteDeal = !isSeller && isActiveNegotiation && !requestClosedWithoutDeal;
  const canDelete =
    !!onDelete &&
    canRemoveOfferFromListing({
      status,
      dealCompletedAt: dealCompletedAt ? new Date(dealCompletedAt) : null,
      negotiationEndedAt: negotiationEndedAt ? new Date(negotiationEndedAt) : null,
    });

  let statusPill: StatusPill | null = null;
  if (canCompleteDeal || (isSeller && isActiveNegotiation && !requestClosedWithoutDeal)) {
    statusPill = {
      label: isSeller ? t('seller.inNegotiation') : t('buyer.offerAccepted'),
      tone: 'active',
    };
  } else if (status === 'ACEPTADA' && dealCompleted) {
    statusPill = { label: t('buyer.offerDealCompleted'), tone: 'success' };
  } else if (negotiationEnded) {
    statusPill = {
      label: isSeller ? t('seller.negotiationEndedLabel') : t('buyer.negotiationEndedLabel'),
      tone: 'muted',
    };
  } else if (requestClosedWithoutDeal) {
    statusPill = {
      label: isSeller ? t('seller.requestClosed') : t('buyer.offerRequestClosed'),
      tone: 'muted',
    };
  } else if (status === 'RECHAZADA') {
    statusPill = { label: t('buyer.offerRejected'), tone: 'rejected' };
  }

  const showNegotiationActions = status === 'ACEPTADA' && !!chatId;
  const openChatLabel = isSeller ? t('seller.openChat') : t('buyer.openChat');
  const deleteLabel = isSeller ? t('seller.deleteOffer') : t('buyer.deleteOffer');
  const deleteConfirm = isSeller ? t('seller.deleteOfferConfirm') : t('buyer.deleteOfferConfirm');

  return (
    <div className={`offer-decision-bar${isSeller ? ' offer-decision-bar--seller' : ''}`}>
      <div className="offer-decision-bar__main">
        <div className="offer-decision-bar__top">
          <div className="offer-decision-bar__identity">
            <p className="offer-decision-bar__seller">{identityName}</p>
            {statusPill && <StatusBadge pill={statusPill} />}
          </div>
          {subtitle ? <div className="offer-decision-bar__subtitle">{subtitle}</div> : null}
        </div>

        {status === 'PENDIENTE' && onAccept && onReject && (
          <div className="offer-decision-bar__actions">
            <button type="button" onClick={() => onAccept(offerId)} className="offer-action-btn offer-action-btn--success">
              {t('buyer.accept')}
            </button>
            <button
              type="button"
              onClick={() => onReject(offerId)}
              className="offer-action-btn offer-action-btn--ghost"
            >
              {t('buyer.reject')}
            </button>
          </div>
        )}

        {showNegotiationActions && canCompleteDeal && (
          <div className="offer-decision-bar__actions">
            <Link href={`/chats/${chatId}`} className="offer-action-btn offer-action-btn--primary">
              {openChatLabel}
            </Link>
            {onComplete && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(t('buyer.completeDealConfirm'))) {
                    onComplete(offerId);
                  }
                }}
                className="offer-action-btn offer-action-btn--success"
              >
                {t('buyer.completeDealAction')}
              </button>
            )}
            {onEndNegotiation && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(
                    isSeller ? t('seller.endNegotiationConfirm') : t('buyer.endNegotiationConfirm'),
                  )) {
                    onEndNegotiation(offerId);
                  }
                }}
                className="offer-action-btn offer-action-btn--ghost"
              >
                {isSeller ? t('seller.endNegotiationAction') : t('buyer.endNegotiationAction')}
              </button>
            )}
          </div>
        )}

        {showNegotiationActions && !canCompleteDeal && (
          <div className="offer-decision-bar__actions">
            <Link href={`/chats/${chatId}`} className="offer-action-btn offer-action-btn--primary">
              {openChatLabel}
            </Link>
            {isSeller && isActiveNegotiation && onEndNegotiation && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(t('seller.endNegotiationConfirm'))) {
                    onEndNegotiation(offerId);
                  }
                }}
                className="offer-action-btn offer-action-btn--ghost"
              >
                {t('seller.endNegotiationAction')}
              </button>
            )}
          </div>
        )}
      </div>

      {canDelete && (
        <div className="offer-decision-bar__secondary">
          <button
            type="button"
            onClick={() => {
              if (window.confirm(deleteConfirm)) {
                onDelete!(offerId);
              }
            }}
            className="offer-secondary-action"
          >
            {deleteLabel}
          </button>
        </div>
      )}
    </div>
  );
}
