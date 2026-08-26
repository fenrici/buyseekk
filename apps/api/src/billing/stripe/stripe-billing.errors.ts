import Stripe from 'stripe';

/**
 * Marker for tests / non-SDK fatal failures that must release an OPEN attempt.
 * Transient timeouts should NOT set this — leave OPEN for idempotent retry.
 */
export class StripeBillingFatalError extends Error {
  readonly stripeBillingFatal = true;

  constructor(message: string) {
    super(message);
    this.name = 'StripeBillingFatalError';
  }
}

/** Definitive failures — abandon the OPEN attempt so a new one can start. */
export function isDefinitiveStripeBillingError(err: unknown): boolean {
  if (!err) return false;
  if (err instanceof StripeBillingFatalError) return true;
  if (typeof err === 'object' && err !== null && 'stripeBillingFatal' in err) {
    return Boolean((err as { stripeBillingFatal?: unknown }).stripeBillingFatal);
  }
  if (err instanceof Stripe.errors.StripeInvalidRequestError) return true;
  if (err instanceof Stripe.errors.StripeAuthenticationError) return true;
  if (err instanceof Stripe.errors.StripePermissionError) return true;
  return false;
}
