import {
  formatSubscriptionPlanPriceDisplay,
  type SubscriptionPlan,
} from '@buyseekk/shared';

/** Display-only: show Plus membership badge from cached User.subscriptionPlan. */
export function showsPlusMembershipBadge(
  plan: SubscriptionPlan | 'FREE' | 'PLUS' | 'ENTERPRISE' | null | undefined,
): boolean {
  return plan === 'PLUS';
}

/** Public + legacy plan price label — uses shared formatter (US$19.99/mo). */
export function planPriceLabel(plan: SubscriptionPlan, locale: 'ES' | 'EN') {
  return formatSubscriptionPlanPriceDisplay(plan, locale);
}
