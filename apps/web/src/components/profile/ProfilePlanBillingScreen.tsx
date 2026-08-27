'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  PUBLIC_SUBSCRIPTION_PLANS,
  type PublicSubscriptionPlan,
} from '@buyseekk/shared';
import { ApiError, api } from '@/lib/api';
import {
  checkoutReturnGrantsPlus,
  isStripeCheckoutUrl,
  requestPlusCheckout,
  type CheckoutReturnStatus,
} from '@/lib/billing-checkout';
import {
  cancelPlusSubscription,
  fetchBillingStatus,
  formatBillingPeriodEnd,
  resumePlusSubscription,
  type BillingStatus,
} from '@/lib/billing-management';
import { useLocale, useT } from '@/lib/i18n';
import type { User } from '@/lib/types';
import { CancelPlusModal } from './CancelPlusModal';
import { ProfilePricingCard, type PricingCardAction } from './ProfilePricingCard';

const PRICING_PLANS: PublicSubscriptionPlan[] = [...PUBLIC_SUBSCRIPTION_PLANS];

type Props = {
  user: User;
  checkoutReturn?: CheckoutReturnStatus;
};

export function ProfilePlanBillingScreen({ user, checkoutReturn = null }: Props) {
  const t = useT();
  const locale = useLocale();

  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);

  const loadBilling = useCallback(async () => {
    setBillingLoading(true);
    try {
      const status = await fetchBillingStatus();
      setBilling(status);
    } catch {
      setBilling(null);
    } finally {
      setBillingLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBilling();
  }, [loadBilling, user.id]);

  const planFromUser =
    user.subscriptionPlan === 'PLUS' || user.subscriptionPlan === 'ENTERPRISE';
  const isPlus = billing ? billing.plan === 'PLUS' : planFromUser;
  const periodEndLabel = formatBillingPeriodEnd(billing?.currentPeriodEnd ?? null, locale);

  async function handleUpgrade() {
    if (checkoutLoading) return;
    setActionError('');
    setCheckoutLoading(true);
    try {
      const url = await requestPlusCheckout();
      if (!isStripeCheckoutUrl(url)) {
        throw new Error(t('subscription.checkoutError'));
      }
      window.location.assign(url);
    } catch (err) {
      setActionError(readError(err, t('subscription.checkoutError')));
      setCheckoutLoading(false);
    }
  }

  async function handleConfirmCancel() {
    if (cancelLoading) return;
    setActionError('');
    setCancelLoading(true);
    try {
      const status = await cancelPlusSubscription();
      setBilling(status);
      setShowCancelModal(false);
    } catch (err) {
      setActionError(readError(err, t('subscription.billingActionError')));
    } finally {
      setCancelLoading(false);
    }
  }

  async function handleResume() {
    if (resumeLoading) return;
    setActionError('');
    setResumeLoading(true);
    try {
      const status = await resumePlusSubscription();
      setBilling(status);
    } catch (err) {
      setActionError(readError(err, t('subscription.billingActionError')));
    } finally {
      setResumeLoading(false);
    }
  }

  const showSuccessBanner =
    checkoutReturn === 'success' && !checkoutReturnGrantsPlus(checkoutReturn);
  const showCanceledBanner = checkoutReturn === 'canceled';

  function cardProps(plan: PublicSubscriptionPlan) {
    const currentPlan: PublicSubscriptionPlan = isPlus ? 'PLUS' : 'FREE';

    if (!isPlus) {
      if (plan === 'FREE') {
        return {
          action: 'current' as PricingCardAction,
          highlighted: false,
          onAction: undefined,
          statusPrimary: null,
          statusSecondary: null,
          reserveStatusSpace: false,
        };
      }
      return {
        action: 'upgrade' as PricingCardAction,
        highlighted: true,
        onAction: handleUpgrade,
        actionLoading: checkoutLoading,
        statusPrimary: null,
        statusSecondary: null,
        reserveStatusSpace: false,
      };
    }

    if (plan === 'PLUS') {
      if (billingLoading) {
        return {
          action: 'current' as PricingCardAction,
          highlighted: true,
          onAction: undefined,
          statusPrimary: null,
          statusSecondary: null,
          reserveStatusSpace: true,
        };
      }
      const statusPrimary =
        periodEndLabel != null ? t('subscription.plusActiveUntil', { date: periodEndLabel }) : null;
      const statusSecondary = billing?.cancelAtPeriodEnd ? t('subscription.cancelScheduled') : null;
      return {
        action: billing?.canResumeInBuyseek ? ('resume' as PricingCardAction) : ('current' as PricingCardAction),
        highlighted: true,
        onAction: billing?.canResumeInBuyseek ? handleResume : undefined,
        actionLoading: resumeLoading,
        statusPrimary,
        statusSecondary,
        reserveStatusSpace: true,
      };
    }

    if (billingLoading) {
      return {
        action: 'none' as PricingCardAction,
        highlighted: false,
        onAction: undefined,
        actionLoading: false,
        statusPrimary: null,
        statusSecondary: null,
        reserveStatusSpace: false,
      };
    }

    return {
      action: billing?.canCancelInBuyseek ? ('downgrade' as PricingCardAction) : ('none' as PricingCardAction),
      highlighted: false,
      onAction: billing?.canCancelInBuyseek ? () => setShowCancelModal(true) : undefined,
      actionLoading: cancelLoading,
      statusPrimary: null,
      statusSecondary: null,
      reserveStatusSpace: false,
    };
  }

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
      {actionError && (
        <p className="pricing-banner pricing-banner--error" role="alert">
          {actionError}
        </p>
      )}

      <section
        className="pricing-grid pricing-grid--plans"
        aria-label={t('subscription.compareTitle')}
        aria-busy={billingLoading}
      >
        {PRICING_PLANS.map((plan) => {
          const props = cardProps(plan);
          return (
            <ProfilePricingCard
              key={plan}
              plan={plan}
              currentPlan={isPlus ? 'PLUS' : 'FREE'}
              highlighted={props.highlighted}
              action={props.action}
              actionLoading={props.actionLoading}
              onAction={props.onAction}
              statusPrimary={props.statusPrimary}
              statusSecondary={props.statusSecondary}
              reserveStatusSpace={props.reserveStatusSpace}
            />
          );
        })}
      </section>

      {showCancelModal && (
        <CancelPlusModal
          periodEndLabel={periodEndLabel ?? t('subscription.cancelModalFallbackDate')}
          loading={cancelLoading}
          onKeepPlus={() => setShowCancelModal(false)}
          onConfirmCancel={() => void handleConfirmCancel()}
          onClose={() => {
            if (!cancelLoading) setShowCancelModal(false);
          }}
        />
      )}
    </div>
  );
}

function readError(err: unknown, fallback: string) {
  if (err instanceof ApiError) return err.message || fallback;
  if (err instanceof Error) return err.message || fallback;
  return fallback;
}
