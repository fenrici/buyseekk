import {
  LEGACY_SUBSCRIPTION_PRICES_USD,
  SUBSCRIPTION_PRICES_USD,
  type SubscriptionPlan,
} from '@buyseekk/shared';

/** Display-only: show Plus membership badge from cached User.subscriptionPlan. */
export function showsPlusMembershipBadge(
  plan: SubscriptionPlan | 'FREE' | 'PLUS' | 'ENTERPRISE' | null | undefined,
): boolean {
  return plan === 'PLUS';
}

type PriceT = {
  (key: 'subscription.priceMonth', vars: { amount: string }): string;
};

/** Public plans use SUBSCRIPTION_PRICES_USD; legacy ENTERPRISE falls back for display only. */
export function planPriceLabel(plan: SubscriptionPlan, t: PriceT) {
  const amount =
    plan === 'FREE' || plan === 'PLUS'
      ? SUBSCRIPTION_PRICES_USD[plan]
      : LEGACY_SUBSCRIPTION_PRICES_USD[plan];
  return t('subscription.priceMonth', { amount: String(amount) });
}
