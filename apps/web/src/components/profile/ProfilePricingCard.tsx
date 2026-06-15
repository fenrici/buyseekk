'use client';

import type { SubscriptionPlan } from '@buyseekk/shared';
import { planPriceLabel } from '@/lib/subscription-display';
import { useT } from '@/lib/i18n';

function featureList(raw: string) {
  return raw.split('|').map((line) => line.trim()).filter(Boolean);
}

type Props = {
  plan: SubscriptionPlan;
  currentPlan: SubscriptionPlan;
  highlighted?: boolean;
};

export function ProfilePricingCard({ plan, currentPlan, highlighted = false }: Props) {
  const t = useT();
  const isCurrent = plan === currentPlan;
  const features = featureList(t(`subscription.pricingFeatures.${plan}`));

  let ctaLabel = t('subscription.upgradeCta');
  let ctaVariant: 'primary' | 'ghost' | 'current' = 'primary';
  let ctaDisabled = true;

  if (plan === 'FREE') {
    ctaLabel = t('subscription.currentPlan');
    ctaVariant = 'current';
    ctaDisabled = isCurrent;
  } else if (plan === 'PLUS') {
    ctaLabel = isCurrent ? t('subscription.currentPlan') : t('subscription.upgradeCta');
    ctaVariant = isCurrent ? 'current' : 'primary';
    ctaDisabled = true;
  } else if (plan === 'ENTERPRISE') {
    ctaLabel = isCurrent ? t('subscription.currentPlan') : t('profile.contactEnterprise');
    ctaVariant = isCurrent ? 'current' : 'ghost';
    ctaDisabled = true;
  }

  const price =
    plan === 'FREE' ? t('subscription.priceZero') : planPriceLabel(plan, t);

  const showCta = isCurrent || plan !== 'FREE';

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
          title={ctaDisabled && !isCurrent ? t('subscription.comingSoon') : undefined}
        >
          <span>{ctaLabel}</span>
          {!isCurrent && (
            <span className="pricing-card__soon">{t('subscription.comingSoon')}</span>
          )}
        </button>
      )}
    </article>
  );
}
