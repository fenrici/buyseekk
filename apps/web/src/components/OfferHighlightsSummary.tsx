'use client';

import { highlightToOfferItem } from '@/lib/offer-highlight';
import { useT } from '@/lib/i18n';
import type { OfferHighlight, OfferHighlightLabel } from '@/lib/types';
import { OfferReceivedCard } from '@/components/OfferReceivedCard';

const BADGE_CLASS: Record<OfferHighlightLabel, string> = {
  recommended: 'offer-highlight-badge--recommended',
  lowest_price: 'offer-highlight-badge--price',
  closest_match: 'offer-highlight-badge--closest',
};

const REASON_KEY: Record<OfferHighlightLabel, string> = {
  recommended: 'highlights.reasonRecommended',
  lowest_price: 'highlights.reasonLowest',
  closest_match: 'highlights.reasonClosest',
};

const BADGE_KEY: Record<OfferHighlightLabel, string> = {
  recommended: 'highlights.badgeRecommended',
  lowest_price: 'highlights.badgeLowest',
  closest_match: 'highlights.badgeClosest',
};

const LABEL_ORDER: OfferHighlightLabel[] = ['recommended', 'lowest_price', 'closest_match'];

type Props = {
  highlights: OfferHighlight[];
  onAccept: (offerId: string) => void;
  onReject: (offerId: string) => void;
};

export function OfferHighlightsSummary({ highlights, onAccept, onReject }: Props) {
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
          <OfferReceivedCard
            key={`${h.label}-${h.offerId}`}
            offer={highlightToOfferItem(h)}
            onAccept={onAccept}
            onReject={onReject}
            sellerName={h.sellerName}
            subtitle={<p className="text-sm text-slate-400">{t(REASON_KEY[h.label])}</p>}
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
