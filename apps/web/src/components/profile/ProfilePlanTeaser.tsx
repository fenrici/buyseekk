'use client';

import type { SubscriptionPlan } from '@buyseekk/shared';
import { useT } from '@/lib/i18n';

type Props = {
  plan: SubscriptionPlan;
  onOpenPlan?: () => void;
  onUpgrade?: () => void;
  showUpgrade?: boolean;
  variant?: 'default' | 'sidebar';
  className?: string;
};

export function ProfilePlanTeaser({
  plan,
  onOpenPlan,
  onUpgrade,
  showUpgrade = true,
  variant = 'default',
  className,
}: Props) {
  const t = useT();
  const isSidebar = variant === 'sidebar';
  const isPlusPlan = plan === 'PLUS' || plan === 'ENTERPRISE';
  const cardClass = `profile-plan-teaser card${onOpenPlan ? ' profile-plan-teaser--interactive' : ''}${className ? ` ${className}` : ''}`;

  const upgradeButton =
    plan === 'FREE' && showUpgrade && onUpgrade ? (
      <button type="button" className="profile-plan-teaser__upgrade" onClick={onUpgrade}>
        {t('subscription.upgradeCta')}
      </button>
    ) : null;

  if (isSidebar) {
    return (
      <section
        className={`profile-plan-sidecard card${isPlusPlan ? ' profile-plan-sidecard--plus' : ''}`}
        aria-labelledby="profile-plan-sidebar-title"
      >
        <button
          type="button"
          className="profile-plan-sidecard__open"
          onClick={onOpenPlan}
          aria-label={t('profile.openPlanBilling')}
        >
          <div className="profile-plan-sidecard__body">
            <p id="profile-plan-sidebar-title" className="profile-plan-sidecard__eyebrow">
              {t('profile.planSectionLabel')}
            </p>
            <div className="profile-plan-sidecard__title-row">
              <p className="profile-plan-sidecard__plan">{t(`subscription.plan.${plan}`)}</p>
              <span className="profile-plan-sidecard__status">{t('subscription.currentPlan')}</span>
            </div>
            <p className="profile-plan-sidecard__meta">
              {plan === 'FREE'
                ? `${t('profile.hubOfferLimit')} · ${t('profile.hubAlertLimit')}`
                : t(`subscription.tagline.${plan === 'ENTERPRISE' ? 'PLUS' : plan}`)}
            </p>
          </div>
          <span className="profile-plan-sidecard__chevron" aria-hidden>
            ›
          </span>
        </button>
        {upgradeButton}
      </section>
    );
  }

  const head = (
    <div className="profile-plan-teaser__head">
      <p className="profile-plan-teaser__name">{t(`subscription.plan.${plan}`)}</p>
      <span className="profile-plan-teaser__status">{t('subscription.currentPlan')}</span>
    </div>
  );

  const openBody =
    plan === 'FREE' ? (
      <>
        {head}
        <ul className="profile-plan-teaser__limits">
          <li>{t('profile.hubOfferLimit')}</li>
          <li>{t('profile.hubAlertLimit')}</li>
        </ul>
      </>
    ) : (
      <>
        {head}
        <p className="profile-plan-teaser__hint">{t(`subscription.tagline.${plan}`)}</p>
      </>
    );

  const openControl = onOpenPlan ? (
    <button
      type="button"
      className="profile-plan-teaser__open"
      onClick={onOpenPlan}
      aria-label={t('profile.openPlanBilling')}
    >
      {openBody}
      <span className="profile-plan-teaser__chevron" aria-hidden>
        ›
      </span>
    </button>
  ) : (
    openBody
  );

  return (
    <div className={cardClass}>
      {openControl}
      {upgradeButton}
    </div>
  );
}
