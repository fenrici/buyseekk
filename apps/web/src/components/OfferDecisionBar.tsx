'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useT } from '@/lib/i18n';

type Props = {
  sellerName: string;
  subtitle: ReactNode;
  offerId: string;
  status: string;
  dealCompletedAt?: string | null;
  negotiationEndedAt?: string | null;
  requestStatus?: string | null;
  chatId?: string | null;
  onAccept: (offerId: string) => void;
  onReject: (offerId: string) => void;
  onComplete?: (offerId: string) => void;
  onEndNegotiation?: (offerId: string) => void;
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
  sellerName,
  subtitle,
  offerId,
  status,
  dealCompletedAt,
  negotiationEndedAt,
  requestStatus,
  chatId,
  onAccept,
  onReject,
  onComplete,
  onEndNegotiation,
}: Props) {
  const t = useT();
  const dealCompleted = !!dealCompletedAt;
  const negotiationEnded = !!negotiationEndedAt && !dealCompleted;
  const isActiveNegotiation = status === 'ACEPTADA' && !dealCompleted && !negotiationEnded;
  const requestClosedWithoutDeal =
    isActiveNegotiation && requestStatus === 'CERRADA';
  const canCompleteDeal = isActiveNegotiation && !requestClosedWithoutDeal;

  let statusPill: StatusPill | null = null;
  if (canCompleteDeal) {
    statusPill = { label: t('buyer.offerAccepted'), tone: 'active' };
  } else if (status === 'ACEPTADA' && dealCompleted) {
    statusPill = { label: t('buyer.offerDealCompleted'), tone: 'success' };
  } else if (negotiationEnded) {
    statusPill = { label: t('buyer.negotiationEndedLabel'), tone: 'muted' };
  } else if (requestClosedWithoutDeal) {
    statusPill = { label: t('buyer.offerRequestClosed'), tone: 'muted' };
  } else if (status === 'RECHAZADA') {
    statusPill = { label: t('buyer.offerRejected'), tone: 'rejected' };
  }

  const showNegotiationActions = status === 'ACEPTADA' && !!chatId;

  return (
    <div className="offer-decision-bar">
      <div className="offer-decision-bar__top">
        <div className="offer-decision-bar__identity">
          <p className="offer-decision-bar__seller">{sellerName}</p>
          {statusPill && <StatusBadge pill={statusPill} />}
        </div>
        <div className="offer-decision-bar__subtitle">{subtitle}</div>
      </div>

      {status === 'PENDIENTE' && (
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
            {t('buyer.openChat')}
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
                if (window.confirm(t('buyer.endNegotiationConfirm'))) {
                  onEndNegotiation(offerId);
                }
              }}
              className="offer-action-btn offer-action-btn--ghost"
            >
              {t('buyer.endNegotiationAction')}
            </button>
          )}
        </div>
      )}

      {showNegotiationActions && !canCompleteDeal && (
        <div className="offer-decision-bar__actions">
          <Link href={`/chats/${chatId}`} className="offer-action-btn offer-action-btn--primary">
            {t('buyer.openChat')}
          </Link>
        </div>
      )}
    </div>
  );
}
