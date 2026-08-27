'use client';

import type { PublicSubscriptionPlan, SubscriptionPlan } from '@buyseekk/shared';
import { planPriceLabel } from '@/lib/subscription-display';
import { useLocale, useT } from '@/lib/i18n';

function featureList(raw: string) {
  return raw.split('|').map((line) => line.trim()).filter(Boolean);
}

export type PricingCardAction =
  | 'none'
  | 'current'
  | 'upgrade'
  | 'downgrade'
  | 'resume';

type Props = {
  plan: PublicSubscriptionPlan;
  currentPlan: PublicSubscriptionPlan | SubscriptionPlan;
  highlighted?: boolean;
  action?: PricingCardAction;
  actionLoading?: boolean;
  onAction?: () => void;
  statusPrimary?: string | null;
  statusSecondary?: string | null;
  reserveStatusSpace?: boolean;
};

export function ProfilePricingCard({
  plan,
  currentPlan,
  highlighted = false,
  action = 'none',
  actionLoading = false,
  onAction,
  statusPrimary = null,
  statusSecondary = null,
  reserveStatusSpace = false,
}: Props) {
  const t = useT();
  const locale = useLocale();
  const isCurrent = plan === currentPlan || (plan === 'PLUS' && currentPlan === 'ENTERPRISE');
  const features = featureList(t(`subscription.pricingFeatures.${plan}`));
  const price = planPriceLabel(plan, locale);

  let ctaLabel = '';
  let ctaVariant: 'primary' | 'ghost' | 'current' | 'danger' = 'primary';
  let ctaDisabled = true;
  let showCta = false;

  if (action === 'current') {
    ctaLabel = t('subscription.currentPlan');
    ctaVariant = 'current';
    ctaDisabled = true;
    showCta = true;
  } else if (action === 'upgrade') {
    ctaLabel = actionLoading ? t('subscription.checkoutLoading') : t('subscription.upgradeCta');
    ctaVariant = 'primary';
    ctaDisabled = actionLoading;
    showCta = true;
  } else if (action === 'downgrade') {
    ctaLabel = actionLoading ? t('subscription.cancelLoading') : t('subscription.downgradeCta');
    ctaVariant = 'danger';
    ctaDisabled = actionLoading;
    showCta = true;
  } else if (action === 'resume') {
    ctaLabel = actionLoading ? t('subscription.resumeLoading') : t('subscription.resumeCta');
    ctaVariant = 'primary';
    ctaDisabled = actionLoading;
    showCta = true;
  }

  return (
    <article
      className={`pricing-card card ${highlighted ? 'pricing-card--featured' : ''} ${isCurrent ? 'pricing-card--current' : ''}`}
    >
      {highlighted && !isCurrent && (
        <span className="pricing-card__badge">{t('profile.billingMostPopular')}</span>
      )}
      {isCurrent && (
        <span className="pricing-card__badge pricing-card__badge--current">{t('subscription.currentPlan')}</span>
      )}
      <header className="pricing-card__head">
        <h3 className="pricing-card__name">{t(`subscription.plan.${plan}`)}</h3>
        <p className="pricing-card__price">{price}</p>
      </header>
      {(statusPrimary || statusSecondary || reserveStatusSpace) && (
        <div
          className={`pricing-card__status${reserveStatusSpace ? ' pricing-card__status--reserved' : ''}`}
        >
          {statusPrimary && <p className="pricing-card__status-primary">{statusPrimary}</p>}
          {statusSecondary && <p className="pricing-card__status-secondary">{statusSecondary}</p>}
        </div>
      )}
      <ul className="pricing-card__features">
        {features.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <div className="pricing-card__cta-slot">
        {showCta && (
          <button
            type="button"
            className={`pricing-card__cta pricing-card__cta--${ctaVariant}${actionLoading ? ' pricing-card__cta--loading' : ''}`}
            disabled={ctaDisabled}
            onClick={onAction && !ctaDisabled ? onAction : undefined}
          >
            <span>{ctaLabel}</span>
          </button>
        )}
      </div>
    </article>
  );
}
