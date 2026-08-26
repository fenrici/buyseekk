'use client';

import { useT } from '@/lib/i18n';

type Props = {
  className?: string;
};

/** Small violet Plus indicator for display cache — not a verification checkmark. */
export function PlusMembershipBadge({ className }: Props) {
  const t = useT();
  return (
    <span
      className={`plus-membership-badge${className ? ` ${className}` : ''}`}
      aria-label={t('subscription.plan.PLUS')}
      title={t('subscription.plan.PLUS')}
    >
      {t('subscription.plan.PLUS')}
    </span>
  );
}
