import { SUBSCRIPTION_PRICES_USD, type SubscriptionPlan } from '@buyseekk/shared';

export function planPriceLabel(
  plan: SubscriptionPlan,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  const amount = SUBSCRIPTION_PRICES_USD[plan];
  if (amount === 0) return t('subscription.priceFree');
  return t('subscription.pricePerMonth', { price: String(amount) });
}
