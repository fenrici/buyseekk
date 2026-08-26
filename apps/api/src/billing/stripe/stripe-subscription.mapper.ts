import { SubscriptionStatus } from '@prisma/client';
import type { NormalizedStripeSubscription } from './stripe-billing.provider';
import type Stripe from 'stripe';

function unixToDate(unix: number | null | undefined): Date | null {
  if (unix == null || !Number.isFinite(unix)) return null;
  return new Date(unix * 1000);
}

export function normalizeStripeSubscription(
  sub: Stripe.Subscription,
): NormalizedStripeSubscription {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
  if (!customerId) {
    throw new Error(`Stripe subscription ${sub.id} missing customer`);
  }

  const priceId =
    sub.items?.data?.[0]?.price?.id ??
    (typeof sub.items?.data?.[0]?.price === 'string' ? sub.items.data[0].price : null);

  // Prefer subscription-level period fields; fall back to first item (API variance).
  const periodStartUnix =
    (sub as { current_period_start?: number }).current_period_start ??
    sub.items?.data?.[0]?.current_period_start;
  const periodEndUnix =
    (sub as { current_period_end?: number }).current_period_end ??
    sub.items?.data?.[0]?.current_period_end;

  return {
    id: sub.id,
    customerId,
    status: sub.status,
    priceId: priceId ?? null,
    currentPeriodStart: unixToDate(periodStartUnix),
    currentPeriodEnd: unixToDate(periodEndUnix),
    cancelAtPeriodEnd: !!sub.cancel_at_period_end,
    canceledAt: unixToDate(sub.canceled_at),
    metadataUserId: sub.metadata?.userId?.trim() || null,
    metadataPlan: sub.metadata?.plan?.trim() || null,
  };
}

/**
 * Explicit Stripe → Buyseek status map.
 * Unknown statuses return null (caller must not treat as ACTIVE).
 */
export function mapStripeSubscriptionStatus(status: string): SubscriptionStatus | null {
  switch (status) {
    case 'active':
      return SubscriptionStatus.ACTIVE;
    case 'trialing':
      return SubscriptionStatus.TRIALING;
    case 'past_due':
      return SubscriptionStatus.PAST_DUE;
    case 'unpaid':
      return SubscriptionStatus.UNPAID;
    case 'incomplete':
      return SubscriptionStatus.INCOMPLETE;
    case 'incomplete_expired':
      return SubscriptionStatus.EXPIRED;
    case 'canceled':
      return SubscriptionStatus.CANCELED;
    case 'paused':
      // No Plus while paused.
      return SubscriptionStatus.UNPAID;
    default:
      return null;
  }
}
