import { ApiError, api } from './api';

export type CheckoutReturnStatus = 'success' | 'canceled' | null;

/** Success/cancel query never grants Plus — entitlement stays server-side. */
export function parseCheckoutReturn(param: string | null | undefined): CheckoutReturnStatus {
  if (param === 'success' || param === 'canceled') return param;
  return null;
}

export function checkoutReturnGrantsPlus(_status: CheckoutReturnStatus): false {
  return false;
}

export type CheckoutSessionResponse = {
  url: string;
  sessionId?: string;
};

/**
 * Request Plus Hosted Checkout URL. Caller redirects the browser.
 * Does not mutate local plan/entitlement state.
 */
export async function requestPlusCheckout(
  post: typeof api = api,
): Promise<string> {
  const session = await post<CheckoutSessionResponse>('/billing/checkout', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  if (!session?.url || typeof session.url !== 'string') {
    throw new ApiError('Checkout URL missing', 500);
  }
  return session.url;
}

export function isStripeCheckoutUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname.endsWith('stripe.com');
  } catch {
    return false;
  }
}
