'use client';

import type { SubscriptionPlan } from '@buyseekk/shared';
import { useT } from '@/lib/i18n';

type Props = {
  plan: SubscriptionPlan;
  onUpgrade?: () => void;
  showUpgrade?: boolean;
};

export function ProfilePlanTeaser({ plan, onUpgrade, showUpgrade = true }: Props) {
  const t = useT();

  if (plan !== 'FREE') {
    return (
      <div className="profile-plan-teaser card">
        <p className="profile-plan-teaser__label">{t(`subscription.plan.${plan}`)} {t('profile.planTitle')}</p>
        <p className="profile-plan-teaser__hint">{t(`subscription.tagline.${plan}`)}</p>
      </div>
    );
  }

  return (
    <div className="profile-plan-teaser card">
      <p className="profile-plan-teaser__label">{t('profile.hubFreePlan')}</p>
      <ul className="profile-plan-teaser__limits">
        <li>{t('profile.hubOfferLimit')}</li>
        <li>{t('profile.hubAlertLimit')}</li>
      </ul>
      {showUpgrade && onUpgrade && (
        <button type="button" className="profile-plan-teaser__upgrade" onClick={onUpgrade}>
          {t('subscription.upgradeCta')}
        </button>
      )}
    </div>
  );
}
