'use client';

import type { ReactNode } from 'react';
import { OfferItem } from '@/lib/types';
import { CompareBlock } from '@/components/CompareBlock';
import { OfferDecisionBar } from '@/components/OfferDecisionBar';
import { UserRatingBadge } from '@/components/UserRatingBadge';
import { ReportButton } from '@/components/ReportButton';

type Props = {
  offer: OfferItem;
  onAccept: (offerId: string) => void;
  onReject: (offerId: string) => void;
  onComplete?: (offerId: string) => void;
  onEndNegotiation?: (offerId: string) => void;
  onDelete?: (offerId: string) => void;
  header?: ReactNode;
  subtitle?: ReactNode;
  sellerName?: string;
  onBack?: () => void;
  backLabel?: string;
};

/** Detalle completo de Offer recibida (comparación + acciones). */
export function OfferReceivedCard({
  offer,
  onAccept,
  onReject,
  onComplete,
  onEndNegotiation,
  onDelete,
  header,
  subtitle,
  sellerName,
  onBack,
  backLabel,
}: Props) {
  const decisionSubtitle = subtitle ?? <UserRatingBadge stats={offer.seller?.rating} compact />;

  return (
    <article id={`offer-${offer.id}`} className="offer-received-card scroll-mt-24">
      {onBack && (
        <button type="button" className="offer-received-card__back" onClick={onBack}>
          ← {backLabel ?? 'Back'}
        </button>
      )}
      {header && <div className="mb-2">{header}</div>}
      <CompareBlock offer={offer} />
      <OfferDecisionBar
        seller={{
          role: 'SELLER',
          name: offer.seller?.name ?? sellerName ?? '—',
          sellerType: offer.seller?.sellerType,
          businessName: offer.seller?.businessName,
          businessType: offer.seller?.businessType,
          state: offer.seller?.state,
          city: offer.seller?.city,
          country: offer.seller?.country,
        }}
        subtitle={decisionSubtitle}
        offerId={offer.id}
        status={offer.status}
        dealCompletedAt={offer.dealCompletedAt}
        negotiationEndedAt={offer.negotiationEndedAt}
        requestStatus={offer.request?.status}
        chatId={offer.chatId}
        onAccept={onAccept}
        onReject={onReject}
        onComplete={onComplete}
        onEndNegotiation={onEndNegotiation}
        onDelete={onDelete}
      />
      <div className="mt-2 flex justify-end">
        <ReportButton target={{ offerId: offer.id }} />
      </div>
    </article>
  );
}
