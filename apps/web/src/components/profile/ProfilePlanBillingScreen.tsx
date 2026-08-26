'use client';

import { useEffect, useState } from 'react';
import {
  FREE_DAILY_OFFER_LIMIT,
  FREE_MAX_SMART_ALERTS,
  PUBLIC_SUBSCRIPTION_PLANS,
  type PublicSubscriptionPlan,
  type SubscriptionPlan,
} from '@buyseekk/shared';
import { ApiError, api } from '@/lib/api';
import {
  checkoutReturnGrantsPlus,
  isStripeCheckoutUrl,
  requestPlusCheckout,
  type CheckoutReturnStatus,
} from '@/lib/billing-checkout';
import { planPriceLabel } from '@/lib/subscription-display';
import { useT } from '@/lib/i18n';
import type { User } from '@/lib/types';
import { ProfilePricingCard } from './ProfilePricingCard';

type SavedSearch = { id: string };
type OfferItem = { createdAt: string };
type Paginated<T> = { items: T[] };

const PRICING_PLANS: PublicSubscriptionPlan[] = [...PUBLIC_SUBSCRIPTION_PLANS];

function startOfUtcDay(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function featureList(raw: string) {
  return raw.split('|').map((line) => line.trim()).filter(Boolean);
}

function planGrantsPlus(plan: SubscriptionPlan) {
  return plan === 'PLUS' || plan === 'ENTERPRISE';
}

type Props = {
  user: User;
  isSeller: boolean;
  checkoutReturn?: CheckoutReturnStatus;
};

export function ProfilePlanBillingScreen({ user, isSeller, checkoutReturn = null }: Props) {
  const t = useT();
  const currentPlan = (user.subscriptionPlan ?? 'FREE') as SubscriptionPlan;
  const hasPlus = planGrantsPlus(currentPlan);
  const publicCurrentPlan =
    currentPlan === 'ENTERPRISE' ? 'PLUS' : (currentPlan as PublicSubscriptionPlan);

  const [offersToday, setOffersToday] = useState(0);
  const [alertCount, setAlertCount] = useState(0);
  const [usageLoading, setUsageLoading] = useState(isSeller);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

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

  async function handleUpgrade() {
    if (checkoutLoading) return;
    setCheckoutError('');
    setCheckoutLoading(true);
    try {
      const url = await requestPlusCheckout();
      if (!isStripeCheckoutUrl(url)) {
        throw new Error(t('subscription.checkoutError'));
      }
      window.location.assign(url);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : t('subscription.checkoutError');
      setCheckoutError(message || t('subscription.checkoutError'));
      setCheckoutLoading(false);
    }
  }

  const offerLimit = hasPlus ? null : FREE_DAILY_OFFER_LIMIT;
  const alertLimit = hasPlus ? null : FREE_MAX_SMART_ALERTS;
  const summaryFeatures = featureList(
    t(`subscription.pricingFeatures.${currentPlan === 'ENTERPRISE' ? 'PLUS' : currentPlan}`),
  );

  // Never treat checkout=success as Plus entitlement.
  const showSuccessBanner =
    checkoutReturn === 'success' && !checkoutReturnGrantsPlus(checkoutReturn);
  const showCanceledBanner = checkoutReturn === 'canceled';

  return (
    <div className="pricing-page">
      {showSuccessBanner && (
        <p className="pricing-banner pricing-banner--success" role="status">
          {t('subscription.checkoutSuccess')}
        </p>
      )}
      {showCanceledBanner && (
        <p className="pricing-banner pricing-banner--info" role="status">
          {t('subscription.checkoutCanceled')}
        </p>
      )}
      {checkoutError && (
        <p className="pricing-banner pricing-banner--error" role="alert">
          {checkoutError}
        </p>
      )}

      <section
        className={`pricing-current${hasPlus ? ' pricing-current--plus' : ''}`}
        aria-labelledby="pricing-current-title"
      >
        <p id="pricing-current-title" className="pricing-current__eyebrow">
          {t('profile.planSectionLabel')}
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
        <p className="pricing-current__summary">
          {t(`subscription.tagline.${currentPlan === 'ENTERPRISE' ? 'PLUS' : currentPlan}`)}
        </p>
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

      {hasPlus ? (
        <>
          <section className="pricing-manage card" aria-labelledby="pricing-manage-title">
            <h3 id="pricing-manage-title" className="pricing-manage__title">
              {t('subscription.manageSubscription')}
            </h3>
            <p className="pricing-manage__text">{t('subscription.manageSubscriptionHint')}</p>
            <button type="button" className="pricing-manage__cta" disabled>
              <span>{t('subscription.manageSubscription')}</span>
              <span className="pricing-manage__soon">{t('subscription.comingSoon')}</span>
            </button>
          </section>

          <section className="pricing-grid pricing-grid--readonly" aria-label={t('subscription.compareTitle')}>
            {PRICING_PLANS.map((plan) => (
              <ProfilePricingCard
                key={plan}
                plan={plan}
                currentPlan={publicCurrentPlan}
                highlighted={plan === 'PLUS'}
              />
            ))}
          </section>
        </>
      ) : (
        <section className="pricing-grid" aria-label={t('subscription.compareTitle')}>
          {PRICING_PLANS.filter((plan) => plan === 'PLUS').map((plan) => (
            <ProfilePricingCard
              key={plan}
              plan={plan}
              currentPlan={publicCurrentPlan}
              highlighted={plan === 'PLUS'}
              onUpgrade={handleUpgrade}
              upgradeLoading={checkoutLoading}
              upgradeDisabled={checkoutLoading}
            />
          ))}
        </section>
      )}
    </div>
  );
}
