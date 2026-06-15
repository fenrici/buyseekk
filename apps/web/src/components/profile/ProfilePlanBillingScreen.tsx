'use client';

import { useEffect, useState } from 'react';
import {
  FREE_DAILY_OFFER_LIMIT,
  FREE_MAX_SMART_ALERTS,
  type SubscriptionPlan,
} from '@buyseekk/shared';
import { api } from '@/lib/api';
import { planPriceLabel } from '@/lib/subscription-display';
import { useT } from '@/lib/i18n';
import type { User } from '@/lib/types';
import { ProfilePricingCard } from './ProfilePricingCard';

type SavedSearch = { id: string };
type OfferItem = { createdAt: string };
type Paginated<T> = { items: T[] };

const PRICING_PLANS: SubscriptionPlan[] = ['FREE', 'PLUS', 'ENTERPRISE'];

function startOfUtcDay(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function featureList(raw: string) {
  return raw.split('|').map((line) => line.trim()).filter(Boolean);
}

type Props = {
  user: User;
  isSeller: boolean;
};

export function ProfilePlanBillingScreen({ user, isSeller }: Props) {
  const t = useT();
  const currentPlan = (user.subscriptionPlan ?? 'FREE') as SubscriptionPlan;
  const hasPlus = currentPlan === 'PLUS' || currentPlan === 'ENTERPRISE';

  const [offersToday, setOffersToday] = useState(0);
  const [alertCount, setAlertCount] = useState(0);
  const [usageLoading, setUsageLoading] = useState(isSeller);

  useEffect(() => {
    if (!isSeller) {
      setUsageLoading(false);
      return;
    }
    let cancelled = false;
    setUsageLoading(true);
    (async () => {
      try {
        const [searches, offersRes] = await Promise.all([
          api<SavedSearch[]>('/saved-searches').catch(() => []),
          api<Paginated<OfferItem> | OfferItem[]>('/offers/sent?limit=50').catch(() => ({ items: [] })),
        ]);
        if (cancelled) return;
        const alerts = Array.isArray(searches) ? searches.length : 0;
        const offerItems = Array.isArray(offersRes) ? offersRes : (offersRes.items ?? []);
        const dayStart = startOfUtcDay().getTime();
        setAlertCount(alerts);
        setOffersToday(offerItems.filter((o) => new Date(o.createdAt).getTime() >= dayStart).length);
      } finally {
        if (!cancelled) setUsageLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSeller, user.id]);

  const offerLimit = hasPlus ? null : FREE_DAILY_OFFER_LIMIT;
  const alertLimit = hasPlus ? null : FREE_MAX_SMART_ALERTS;
  const summaryFeatures = featureList(t(`subscription.pricingFeatures.${currentPlan}`));

  return (
    <div className="pricing-page">
      <section className="pricing-current" aria-labelledby="pricing-current-title">
        <p id="pricing-current-title" className="pricing-current__eyebrow">
          {t('profile.billingCurrent')}
        </p>
        <div className="pricing-current__main">
          <div className="pricing-current__identity">
            <h2 className="pricing-current__plan">{t(`subscription.plan.${currentPlan}`)}</h2>
            <span className="pricing-current__badge">{t('subscription.currentPlan')}</span>
          </div>
          <p className="pricing-current__price">
            {currentPlan === 'FREE' ? t('subscription.priceZero') : planPriceLabel(currentPlan, t)}
          </p>
        </div>
        <ul className="pricing-current__features">
          {summaryFeatures.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        {isSeller && (
          <div className="pricing-current__usage">
            <div className="pricing-current__usage-item">
              <span>{t('subscription.offersToday')}</span>
              <strong>
                {usageLoading ? '…' : offerLimit ? `${offersToday}/${offerLimit}` : t('subscription.unlimited')}
              </strong>
            </div>
            <div className="pricing-current__usage-item">
              <span>{t('subscription.smartAlertsLabel')}</span>
              <strong>
                {usageLoading ? '…' : alertLimit ? `${alertCount}/${alertLimit}` : t('subscription.unlimited')}
              </strong>
            </div>
          </div>
        )}
      </section>

      <section className="pricing-grid" aria-label={t('subscription.compareTitle')}>
        {PRICING_PLANS.map((plan) => (
          <ProfilePricingCard
            key={plan}
            plan={plan}
            currentPlan={currentPlan}
            highlighted={plan === 'PLUS'}
          />
        ))}
      </section>
    </div>
  );
}
