/** Provider that owns in-app subscription management for the current plan. */
export type BillingManagementProvider = 'STRIPE' | 'APPLE' | 'GOOGLE';

/** Public billing snapshot for Plan & Billing UI (no provider secrets). */
export type BillingStatusResponse = {
  plan: 'FREE' | 'PLUS';
  status: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  canCancelInBuyseek: boolean;
  canResumeInBuyseek: boolean;
  managementProvider: BillingManagementProvider | null;
};
