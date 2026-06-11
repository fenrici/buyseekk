'use client';

import type { ReactNode } from 'react';
import { OfferItem } from '@/lib/types';
import { CompareBlock } from '@/components/CompareBlock';
import { OfferDecisionBar } from '@/components/OfferDecisionBar';
import { UserRatingBadge } from '@/components/UserRatingBadge';

type Props = {
  offer: OfferItem;
  onAccept: (offerId: string) => void;
  onReject: (offerId: string) => void;
  header?: ReactNode;
  subtitle?: ReactNode;
  sellerName?: string;
};

export function OfferReceivedCard({
  offer,
  onAccept,
  onReject,
  header,
  subtitle,
  sellerName,
}: Props) {
  const seller = sellerName ?? offer.seller?.businessName ?? offer.seller?.name ?? '—';
  const decisionSubtitle = subtitle ?? <UserRatingBadge stats={offer.seller?.rating} compact />;

  return (
    <article id={`offer-${offer.id}`} className="offer-received-card scroll-mt-24">
      {header && <div className="mb-2">{header}</div>}
      <p className="mb-3 text-sm font-semibold text-slate-400">{offer.requestTitle}</p>
      <CompareBlock offer={offer} />
      <OfferDecisionBar
        sellerName={seller}
        subtitle={decisionSubtitle}
        offerId={offer.id}
        status={offer.status}
        chatId={offer.chatId}
        onAccept={onAccept}
        onReject={onReject}
      />
    </article>
  );
}
