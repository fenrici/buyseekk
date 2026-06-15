export const SUBSCRIPTION_PLANS = ['FREE', 'PLUS', 'ENTERPRISE'] as const;
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number];

/** Máximo de ofertas por día en plan FREE (cuando Plus no está desbloqueado globalmente). */
export const FREE_DAILY_OFFER_LIMIT = 20;

/** Máximo de alertas inteligentes (SavedSearch) en plan FREE. */
export const FREE_MAX_SMART_ALERTS = 3;

export const SUBSCRIPTION_LIMIT_MESSAGES = {
  dailyOffers:
    'Has alcanzado el límite diario de ofertas. Buyseek Plus elimina este límite.',
  smartAlerts: 'Buyseek Plus permite alertas inteligentes ilimitadas.',
} as const;

/** Precios mensuales en USD (solo UI; sin cobro integrado aún). */
export const SUBSCRIPTION_PRICES_USD: Record<SubscriptionPlan, number> = {
  FREE: 0,
  PLUS: 20,
  ENTERPRISE: 100,
};

export type SubscriptionUser = {
  subscriptionPlan: SubscriptionPlan;
};

/** Plus o Enterprise, o lanzamiento gratuito con todas las funciones Plus. */
export function canUsePlusFeatures(
  user: SubscriptionUser,
  plusFeaturesUnlocked: boolean,
): boolean {
  if (plusFeaturesUnlocked) return true;
  return user.subscriptionPlan === 'PLUS' || user.subscriptionPlan === 'ENTERPRISE';
}

/** Solo Enterprise, o lanzamiento gratuito (equivale a Enterprise para features futuras). */
export function canUseEnterpriseFeatures(
  user: SubscriptionUser,
  plusFeaturesUnlocked: boolean,
): boolean {
  if (plusFeaturesUnlocked) return true;
  return user.subscriptionPlan === 'ENTERPRISE';
}
