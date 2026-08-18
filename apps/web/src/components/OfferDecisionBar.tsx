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
  requestStatus?: string | null;
  chatId?: string | null;
  onAccept: (offerId: string) => void;
  onReject: (offerId: string) => void;
  onComplete?: (offerId: string) => void;
};

export function OfferDecisionBar({
  sellerName,
  subtitle,
  offerId,
  status,
  dealCompletedAt,
  requestStatus,
  chatId,
  onAccept,
  onReject,
  onComplete,
}: Props) {
  const t = useT();
  const dealCompleted = !!dealCompletedAt;
  const requestClosedWithoutDeal = status === 'ACEPTADA' && !dealCompleted && requestStatus === 'CERRADA';
  const canCompleteDeal = status === 'ACEPTADA' && !dealCompleted && !requestClosedWithoutDeal;

  return (
    <div className="offer-decision-bar">
      <div className="offer-decision-bar__info">
        <p className="offer-decision-bar__seller">{sellerName}</p>
        <div className="offer-decision-bar__subtitle">{subtitle}</div>
      </div>
      <div className="offer-decision-bar__actions">
        {status === 'PENDIENTE' && (
          <>
            <button type="button" onClick={() => onAccept(offerId)} className="btn btn-accent text-sm">
              {t('buyer.accept')}
            </button>
            <button
              type="button"
              onClick={() => onReject(offerId)}
              className="offer-decision-bar__reject btn btn-ghost text-sm"
            >
              {t('buyer.reject')}
            </button>
          </>
        )}
        {canCompleteDeal && (
          <p className="text-sm font-medium text-emerald-300">{t('buyer.offerAccepted')}</p>
        )}
        {status === 'ACEPTADA' && dealCompleted && (
          <p className="text-sm font-medium text-emerald-300">{t('buyer.offerDealCompleted')}</p>
        )}
        {requestClosedWithoutDeal && (
          <p className="text-sm font-medium text-slate-400">{t('buyer.offerRequestClosed')}</p>
        )}
        {status === 'ACEPTADA' && chatId && (
          <Link href={`/chats/${chatId}`} className="btn btn-primary text-sm">
            💬 {t('buyer.openChat')}
          </Link>
        )}
        {canCompleteDeal && onComplete && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm(t('buyer.completeDealConfirm'))) {
                onComplete(offerId);
              }
            }}
            className="btn btn-accent text-sm"
          >
            {t('buyer.completeDealAction')}
          </button>
        )}
        {status === 'RECHAZADA' && (
          <p className="text-sm font-medium text-slate-400">{t('buyer.offerRejected')}</p>
        )}
      </div>
    </div>
  );
}
