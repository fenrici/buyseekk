export const SUBSCRIPTION_PLANS = ['FREE', 'PLUS', 'ENTERPRISE'] as const;
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number];

/** Public product catalog — Enterprise is legacy/dormant and not sold. */
export const PUBLIC_SUBSCRIPTION_PLANS = ['FREE', 'PLUS'] as const;
export type PublicSubscriptionPlan = (typeof PUBLIC_SUBSCRIPTION_PLANS)[number];

export const SUBSCRIPTION_PROVIDERS = ['STRIPE', 'APPLE', 'GOOGLE'] as const;
export type SubscriptionProvider = (typeof SUBSCRIPTION_PROVIDERS)[number];

export const SUBSCRIPTION_STATUSES = [
  'ACTIVE',
  'TRIALING',
  'PAST_DUE',
  'CANCELED',
  'UNPAID',
  'INCOMPLETE',
  'EXPIRED',
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/** Máximo de ofertas por día en plan FREE (cuando Plus no está desbloqueado globalmente). */
export const FREE_DAILY_OFFER_LIMIT = 20;

/** Máximo de alertas inteligentes (SavedSearch) en plan FREE. */
export const FREE_MAX_SMART_ALERTS = 3;

export const SUBSCRIPTION_LIMIT_MESSAGES = {
  dailyOffers:
    'Has alcanzado el límite diario de ofertas. Buyseek Plus elimina este límite.',
  smartAlerts: 'Buyseek Plus permite alertas inteligentes ilimitadas.',
} as const;

/** Precios mensuales en USD (solo UI; cobro Stripe en fases siguientes). */
export const SUBSCRIPTION_PRICES_USD: Record<PublicSubscriptionPlan, number> = {
  FREE: 0,
  PLUS: 20,
};

/** @deprecated Prefer SUBSCRIPTION_PRICES_USD + PUBLIC_SUBSCRIPTION_PLANS. Enterprise not sold. */
export const LEGACY_SUBSCRIPTION_PRICES_USD: Record<SubscriptionPlan, number> = {
  FREE: 0,
  PLUS: 20,
  ENTERPRISE: 100,
};

export type SubscriptionUser = {
  subscriptionPlan: SubscriptionPlan;
};

/** Snapshot used to resolve whether a provider subscription currently grants Plus. */
export type SubscriptionEntitlementInput = {
  status: SubscriptionStatus;
  currentPeriodEnd?: Date | string | null;
};

export type SubscriptionEntitlementSnapshot = SubscriptionEntitlementInput & {
  provider?: SubscriptionProvider;
  id?: string;
};

/**
 * Statuses / rules that keep Plus access (MVP):
 * - ACTIVE, TRIALING, PAST_DUE → yes
 * - CANCELED with currentPeriodEnd in the future → yes until period end
 * - UNPAID, INCOMPLETE, EXPIRED, CANCELED past end → no
 */
export function subscriptionGrantsPlus(
  subscription: SubscriptionEntitlementInput,
  now: Date = new Date(),
): boolean {
  const status = subscription.status;
  if (status === 'ACTIVE' || status === 'TRIALING' || status === 'PAST_DUE') {
    return true;
  }
  if (status === 'CANCELED') {
    const end = coerceDate(subscription.currentPeriodEnd);
    return !!end && end.getTime() > now.getTime();
  }
  return false;
}

/** True if any subscription in the list currently grants Plus. */
export function anySubscriptionGrantsPlus(
  subscriptions: SubscriptionEntitlementInput[],
  now: Date = new Date(),
): boolean {
  return subscriptions.some((sub) => subscriptionGrantsPlus(sub, now));
}

/** Derive User.subscriptionPlan display cache from live entitlement (FREE | PLUS only). */
export function planFromPlusEntitlement(hasPlus: boolean): PublicSubscriptionPlan {
  return hasPlus ? 'PLUS' : 'FREE';
}

/**
 * Display-only helper for UI badges/copy.
 * MUST NOT be used for authorization — User.subscriptionPlan is a derived cache.
 */
export function planCacheLooksLikePlus(plan: SubscriptionPlan): boolean {
  return plan === 'PLUS' || plan === 'ENTERPRISE';
}

/** @deprecated Use planCacheLooksLikePlus — display only, never for auth. */
export const planCacheGrantsPlus = planCacheLooksLikePlus;

/**
 * Pure Plus entitlement (no IO).
 * 1) PLUS_FEATURES_UNLOCKED → Plus
 * 2) Else only Subscription rows that currently grant Plus
 * User.subscriptionPlan is intentionally ignored (display cache only).
 */
export function resolvePlusEntitlement(input: {
  plusFeaturesUnlocked: boolean;
  subscriptions?: SubscriptionEntitlementInput[];
  now?: Date;
}): boolean {
  if (input.plusFeaturesUnlocked) return true;
  return anySubscriptionGrantsPlus(input.subscriptions ?? [], input.now ?? new Date());
}

/**
 * @deprecated Sync unlock-only helper. Prefer SubscriptionService.hasPlusEntitlement.
 * Without Subscription rows this only reflects PLUS_FEATURES_UNLOCKED — never the plan cache.
 */
export function canUsePlusFeatures(
  _user: SubscriptionUser,
  plusFeaturesUnlocked: boolean,
): boolean {
  return resolvePlusEntitlement({ plusFeaturesUnlocked, subscriptions: [] });
}

/**
 * @deprecated Enterprise is not a public product. Never grants access from plan cache.
 * Only PLUS_FEATURES_UNLOCKED bypasses (launch).
 */
export function canUseEnterpriseFeatures(
  _user: SubscriptionUser,
  plusFeaturesUnlocked: boolean,
): boolean {
  return plusFeaturesUnlocked;
}

function coerceDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
