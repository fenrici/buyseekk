'use client';

import type { SubscriptionPlan } from '@buyseekk/shared';
import { useT } from '@/lib/i18n';

const PLAN_TONES: Record<SubscriptionPlan, string> = {
  FREE: 'subscription-badge--free',
  PLUS: 'subscription-badge--plus',
  ENTERPRISE: 'subscription-badge--enterprise',
};

type Props = {
  plan: SubscriptionPlan;
  /** Si true, muestra la lista de beneficios del plan (UI futura / perfil). */
  showFeatures?: boolean;
  compact?: boolean;
};

export function SubscriptionPlanBadge({ plan, showFeatures = false, compact = false }: Props) {
  const t = useT();

  return (
    <div className={compact ? 'subscription-plan subscription-plan--compact' : 'subscription-plan'}>
      <div className="subscription-plan__header">
        <span className={`subscription-badge ${PLAN_TONES[plan]}`}>{t(`subscription.plan.${plan}`)}</span>
        {!compact && <p className="subscription-plan__tagline">{t(`subscription.tagline.${plan}`)}</p>}
      </div>

      {showFeatures && (
        <ul className="subscription-plan__features">
          {(t(`subscription.features.${plan}`) as string).split('|').map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
