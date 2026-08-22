'use client';

import { formatBuyerRequestSummary, type AppLocale } from '@buyseekk/shared';
import { useLocale } from '@/lib/i18n';
import type { OfferItem } from '@/lib/types';

type Props = {
  offer: OfferItem;
};

export function BuyerRequestOffersSummary({ offer }: Props) {
  const locale = useLocale() as AppLocale;
  const request = offer.request;
  const summary = formatBuyerRequestSummary(
    {
      title: request?.title ?? offer.requestTitle,
      category: request?.category,
      budget: request?.budget ?? offer.requestBudget,
      currency: request?.currency ?? offer.currency,
      budgetPeriod: request?.budgetPeriod ?? offer.requestBudgetPeriod,
      location: request?.location ?? offer.requestLocation,
      zone: request?.zone,
      country: request?.country,
      carBrand: request?.carBrand,
      carModel: request?.carModel,
      carColor: request?.carColor,
      carYearMin: request?.carYearMin,
      carCondition: request?.carCondition,
      maxMileage: request?.maxMileage,
      minSqm: request?.minSqm,
      maxSqm: request?.maxSqm,
    },
    locale,
  );

  return (
    <header className="buyer-request-offers-summary">
      <p className="buyer-request-offers-summary__primary">{summary.primary}</p>
      {summary.secondary && (
        <p className="buyer-request-offers-summary__secondary">{summary.secondary}</p>
      )}
    </header>
  );
}
