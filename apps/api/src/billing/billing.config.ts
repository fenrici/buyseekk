import { ConfigService } from '@nestjs/config';

function truthy(raw: string | undefined, defaultTrue = false): boolean {
  const value = (raw ?? (defaultTrue ? 'true' : 'false')).trim().toLowerCase();
  return value === 'true' || value === '1' || value === 'yes';
}

export function isStripeBillingEnabled(config: ConfigService): boolean {
  return truthy(config.get<string>('STRIPE_BILLING_ENABLED'), false);
}

export function requireStripeSecretKey(config: ConfigService): string {
  const key = config.get<string>('STRIPE_SECRET_KEY')?.trim();
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is required when STRIPE_BILLING_ENABLED=true');
  }
  return key;
}

export function requireStripePlusPriceId(config: ConfigService): string {
  const priceId = config.get<string>('STRIPE_PRICE_PLUS_MONTHLY')?.trim();
  if (!priceId) {
    throw new Error('STRIPE_PRICE_PLUS_MONTHLY is required when STRIPE_BILLING_ENABLED=true');
  }
  return priceId;
}

export function requireWebUrl(config: ConfigService): string {
  const webUrl = config.get<string>('WEB_URL')?.trim()?.replace(/\/$/, '');
  if (!webUrl) {
    throw new Error('WEB_URL is required when STRIPE_BILLING_ENABLED=true');
  }
  return webUrl;
}

export function stripeCheckoutSuccessUrl(webUrl: string): string {
  return `${webUrl}/profile?section=plan&checkout=success`;
}

export function stripeCheckoutCancelUrl(webUrl: string): string {
  return `${webUrl}/profile?section=plan&checkout=canceled`;
}

/** Deterministic Stripe idempotency key — same Buyseek user → same Customer. */
export function stripeCustomerIdempotencyKey(userId: string): string {
  return `billing-customer:stripe:${userId}`;
}

/**
 * Stripe idempotency key for a concrete BillingCheckoutSession row.
 * Tied to our attempt id so concurrent callers share one Checkout Session,
 * while a later attempt (new row after expiry) can create a new Checkout.
 */
export function stripeCheckoutIdempotencyKey(billingCheckoutSessionId: string): string {
  return `billing-checkout:${billingCheckoutSessionId}`;
}

/** Default OPEN checkout TTL (Stripe sessions last up to 24h). */
export const BILLING_CHECKOUT_TTL_MS = 23 * 60 * 60 * 1000;
