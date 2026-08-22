'use client';

import Link from 'next/link';
import {
  formatBudgetDifferenceLabel,
  formatSellerBuyerIdentity,
  type AppLocale,
} from '@buyseekk/shared';
import { formatMoney, getImageUrl } from '@/lib/api';
import { Avatar } from '@/components/Avatar';
import { useLocale, useT } from '@/lib/i18n';
import type { OfferItem } from '@/lib/types';

type Props = {
  offer: OfferItem;
  onViewOffer: (offerId: string) => void;
  header?: React.ReactNode;
};

function isActiveNegotiation(offer: OfferItem) {
  return (
    offer.status === 'ACEPTADA' &&
    !offer.dealCompletedAt &&
    !offer.negotiationEndedAt &&
    offer.request?.status !== 'CERRADA'
  );
}

export function OfferReceivedCompactCard({ offer, onViewOffer, header }: Props) {
  const t = useT();
  const locale = useLocale() as AppLocale;
  const photo = getImageUrl(offer.imageUrls?.[0]);
  const identity = formatSellerBuyerIdentity(
    {
      role: 'SELLER',
      name: offer.seller?.name,
      sellerType: offer.seller?.sellerType,
      businessName: offer.seller?.businessName,
      state: offer.seller?.state,
      city: offer.seller?.city,
      country: offer.seller?.country,
    },
    locale,
  );
  const budgetDiff = formatBudgetDifferenceLabel(
    offer.requestBudget,
    offer.price,
    offer.currency,
    locale,
  );
  const rating = offer.seller?.rating;
  const hasRating = !!rating && rating.reviewCount > 0 && rating.avgStars != null;
  const activeNegotiation = isActiveNegotiation(offer);
  const title = offer.requestTitle?.trim() || t('buyer.receivedTitle');

  return (
    <article id={`offer-${offer.id}`} className="offer-compact-card scroll-mt-24">
      {header && <div className="offer-compact-card__badge">{header}</div>}

      <div className="offer-compact-card__layout">
        <div className="offer-compact-card__media">
          {photo ? (
            <img src={photo} alt={title} className="offer-compact-card__img" />
          ) : (
            <div className="offer-compact-card__img offer-compact-card__img--empty" aria-hidden />
          )}
        </div>

        <div className="offer-compact-card__main">
          <div className="offer-compact-card__price-row">
            <p className="offer-compact-card__price">
              {formatMoney(offer.price, offer.currency)}
            </p>
          </div>
          {budgetDiff && (
            <p
              className={`offer-compact-card__diff offer-compact-card__diff--${offer.comparison.status}`}
            >
              {budgetDiff}
            </p>
          )}

          <div className="offer-compact-card__seller">
            <Avatar
              name={offer.seller?.name ?? identity.titleLine}
              url={offer.seller?.avatarUrl}
              size={36}
            />
            <div className="offer-compact-card__seller-text">
              <p className="offer-compact-card__seller-title">{identity.titleLine}</p>
              <p className="offer-compact-card__seller-detail">
                {identity.detailLine}
                {hasRating
                  ? ` · ★ ${rating!.avgStars!.toFixed(1)}`
                  : ` · ${t('rating.noRatings')}`}
              </p>
            </div>
          </div>
        </div>

        {offer.message?.trim() && (
          <p className="offer-compact-card__message">{offer.message.trim()}</p>
        )}

        <div className="offer-compact-card__actions">
          {activeNegotiation && offer.chatId ? (
            <>
              <Link
                href={`/chats/${offer.chatId}`}
                className="offer-action-btn offer-action-btn--primary offer-compact-card__cta"
              >
                {t('buyer.openChat')}
              </Link>
              <button
                type="button"
                className="offer-compact-card__secondary"
                onClick={() => onViewOffer(offer.id)}
              >
                {t('highlights.viewOffer')}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="offer-action-btn offer-action-btn--primary offer-compact-card__cta"
              onClick={() => onViewOffer(offer.id)}
            >
              {t('highlights.viewOffer')}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
