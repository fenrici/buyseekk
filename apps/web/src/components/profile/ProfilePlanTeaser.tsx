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
  const cardClass = `profile-plan-teaser card${onOpenPlan ? ' profile-plan-teaser--interactive' : ''}${className ? ` ${className}` : ''}`;

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

  const upgradeButton =
    plan === 'FREE' && showUpgrade && onUpgrade ? (
      <button type="button" className="profile-plan-teaser__upgrade" onClick={onUpgrade}>
        {t('subscription.upgradeCta')}
      </button>
    ) : null;

  const content = (
    <>
      {openControl}
      {upgradeButton}
    </>
  );

  if (isSidebar) {
    return (
      <section className="profile-side-card card" aria-labelledby="profile-plan-sidebar-title">
        <h2 id="profile-plan-sidebar-title" className="profile-side-card__title">
          {t('profile.planSectionLabel')}
        </h2>
        {content}
      </section>
    );
  }

  return <div className={cardClass}>{content}</div>;
}
