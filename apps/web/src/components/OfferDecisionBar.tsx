'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useT } from '@/lib/i18n';

type Props = {
  sellerName: string;
  subtitle: ReactNode;
  offerId: string;
  status: string;
  chatId?: string | null;
  onAccept: (offerId: string) => void;
  onReject: (offerId: string) => void;
};

export function OfferDecisionBar({
  sellerName,
  subtitle,
  offerId,
  status,
  chatId,
  onAccept,
  onReject,
}: Props) {
  const t = useT();

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
        {status === 'ACEPTADA' && chatId && (
          <Link
            href={`/chats/${chatId}`}
            className="btn btn-primary text-sm"
          >
            💬 {t('buyer.openChat')}
          </Link>
        )}
      </div>
    </div>
  );
}
