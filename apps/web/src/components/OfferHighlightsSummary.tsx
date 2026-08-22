'use client';

import { highlightToOfferItem } from '@/lib/offer-highlight';
import { useT } from '@/lib/i18n';
import type { OfferHighlight, OfferHighlightLabel } from '@/lib/types';
import { OfferReceivedCompactCard } from '@/components/OfferReceivedCompactCard';

const BADGE_CLASS: Record<OfferHighlightLabel, string> = {
  recommended: 'offer-highlight-badge--recommended',
  lowest_price: 'offer-highlight-badge--price',
  closest_match: 'offer-highlight-badge--closest',
};

const BADGE_KEY: Record<OfferHighlightLabel, string> = {
  recommended: 'highlights.badgeRecommended',
  lowest_price: 'highlights.badgeLowest',
  closest_match: 'highlights.badgeClosest',
};

const LABEL_ORDER: OfferHighlightLabel[] = ['recommended', 'lowest_price', 'closest_match'];

type Props = {
  highlights: OfferHighlight[];
  onViewOffer: (offerId: string) => void;
};

export function OfferHighlightsSummary({ highlights, onViewOffer }: Props) {
  const t = useT();

  if (!highlights.length) return null;

  const sorted = [...highlights].sort(
    (a, b) => LABEL_ORDER.indexOf(a.label) - LABEL_ORDER.indexOf(b.label),
  );

  return (
    <section className="offer-highlights">
      <header className="mb-4">
        <h2 className="text-lg font-bold text-white">{t('highlights.title')}</h2>
        <p className="mt-1 text-sm text-slate-400">{t('highlights.subtitle')}</p>
      </header>

      <div className="offer-highlights-stack">
        {sorted.map((h) => (
          <OfferReceivedCompactCard
            key={`${h.label}-${h.offerId}`}
            offer={highlightToOfferItem(h)}
            onViewOffer={onViewOffer}
            header={
              <span className={`offer-highlight-badge ${BADGE_CLASS[h.label]}`}>
                {t(BADGE_KEY[h.label])}
              </span>
            }
          />
        ))}
      </div>
    </section>
  );
}
