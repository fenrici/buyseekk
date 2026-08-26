export const STRIPE_BILLING_PROVIDER = Symbol('STRIPE_BILLING_PROVIDER');

export type CreateStripeCustomerInput = {
  email: string;
  name: string;
  userId: string;
  /** Deterministic key so concurrent creates reuse one Stripe Customer. */
  idempotencyKey: string;
};

export type CreateStripeCheckoutSessionInput = {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  userId: string;
  plan: 'PLUS';
  /** Key tied to BillingCheckoutSession.id — not a forever-static user key. */
  idempotencyKey: string;
};

export type StripeCustomerResult = { id: string };
export type StripeCheckoutSessionResult = {
  id: string;
  url: string;
  /** Unix seconds when the Checkout Session expires, if Stripe provides it. */
  expiresAtUnix?: number | null;
};

/** Stripe adapter — future Apple/Google providers stay outside this interface. */
export interface StripeBillingProvider {
  createCustomer(input: CreateStripeCustomerInput): Promise<StripeCustomerResult>;
  createCheckoutSession(input: CreateStripeCheckoutSessionInput): Promise<StripeCheckoutSessionResult>;
}
