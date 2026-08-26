'use client';

import type { PublicSubscriptionPlan, SubscriptionPlan } from '@buyseekk/shared';
import { planPriceLabel } from '@/lib/subscription-display';
import { useT } from '@/lib/i18n';

function featureList(raw: string) {
  return raw.split('|').map((line) => line.trim()).filter(Boolean);
}

type Props = {
  plan: PublicSubscriptionPlan;
  currentPlan: PublicSubscriptionPlan | SubscriptionPlan;
  highlighted?: boolean;
  /** When set, Plus CTA starts Hosted Checkout (server decides entitlement). */
  onUpgrade?: () => void;
  upgradeLoading?: boolean;
  upgradeDisabled?: boolean;
};

export function ProfilePricingCard({
  plan,
  currentPlan,
  highlighted = false,
  onUpgrade,
  upgradeLoading = false,
  upgradeDisabled = false,
}: Props) {
  const t = useT();
  const isCurrent = plan === currentPlan;
  const features = featureList(t(`subscription.pricingFeatures.${plan}`));

  let ctaLabel = t('subscription.upgradeCta');
  let ctaVariant: 'primary' | 'ghost' | 'current' = 'primary';
  let ctaDisabled = true;
  let showSoon = false;

  if (plan === 'FREE') {
    ctaLabel = t('subscription.currentPlan');
    ctaVariant = 'current';
    ctaDisabled = true;
  } else if (plan === 'PLUS') {
    if (onUpgrade) {
      // Stale User.subscriptionPlan=PLUS must still be able to start Checkout; server enforces real Plus.
      ctaLabel = upgradeLoading ? t('subscription.checkoutLoading') : t('subscription.upgradeCta');
      ctaVariant = 'primary';
      ctaDisabled = upgradeLoading || upgradeDisabled;
      showSoon = false;
    } else {
      ctaLabel = isCurrent ? t('subscription.currentPlan') : t('subscription.upgradeCta');
      ctaVariant = isCurrent ? 'current' : 'primary';
      ctaDisabled = true;
      showSoon = !isCurrent;
    }
  }

  const price = plan === 'FREE' ? t('subscription.priceZero') : planPriceLabel(plan, t);
  const showCta = plan === 'PLUS' || isCurrent;

  return (
    <article
      className={`pricing-card card ${highlighted ? 'pricing-card--featured' : ''} ${isCurrent ? 'pricing-card--current' : ''}`}
    >
      {highlighted && (
        <span className="pricing-card__badge">{t('profile.billingMostPopular')}</span>
      )}
      <header className="pricing-card__head">
        <h3 className="pricing-card__name">{t(`subscription.plan.${plan}`)}</h3>
        <p className="pricing-card__price">{price}</p>
      </header>
      <ul className="pricing-card__features">
        {features.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {showCta && (
        <button
          type="button"
          className={`pricing-card__cta pricing-card__cta--${ctaVariant}`}
          disabled={ctaDisabled}
          onClick={plan === 'PLUS' && onUpgrade && !ctaDisabled ? onUpgrade : undefined}
        >
          <span>{ctaLabel}</span>
          {showSoon && (
            <span className="pricing-card__soon">{t('subscription.comingSoon')}</span>
          )}
        </button>
      )}
    </article>
  );
}
