import type { BillingStatusResponse } from '@buyseekk/shared';
import { ApiError, api } from './api';

export type BillingStatus = BillingStatusResponse;

export async function fetchBillingStatus(post: typeof api = api): Promise<BillingStatus> {
  return post<BillingStatus>('/billing/status');
}

export async function cancelPlusSubscription(post: typeof api = api): Promise<BillingStatus> {
  return post<BillingStatus>('/billing/cancel', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function resumePlusSubscription(post: typeof api = api): Promise<BillingStatus> {
  return post<BillingStatus>('/billing/resume', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export function formatBillingPeriodEnd(iso: string | null, locale: 'ES' | 'EN'): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale === 'ES' ? 'es' : 'en', {
    day: 'numeric',
    month: 'short',
  }).format(date);
}
