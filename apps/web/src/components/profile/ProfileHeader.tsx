'use client';

import type { SubscriptionPlan } from '@buyseekk/shared';
import Link from 'next/link';
import { Avatar } from '@/components/Avatar';
import { useT } from '@/lib/i18n';
import type { User } from '@/lib/types';

const PLAN_BADGE: Record<SubscriptionPlan, string> = {
  FREE: 'profile-plan-badge profile-plan-badge--free',
  PLUS: 'profile-plan-badge profile-plan-badge--plus',
  ENTERPRISE: 'profile-plan-badge profile-plan-badge--enterprise',
};

type Props = {
  user: User;
  displayName: string;
  avatarUrl: string | null;
  isSeller: boolean;
  onEditProfile: () => void;
};

export function ProfileHeader({ user, displayName, avatarUrl, isSeller, onEditProfile }: Props) {
  const t = useT();
  const plan = (user.subscriptionPlan ?? 'FREE') as SubscriptionPlan;

  return (
    <header className="profile-hero card">
      <div className="profile-hero__main">
        <Avatar name={displayName || user.name} url={avatarUrl} size={80} className="profile-hero__avatar" />
        <div className="profile-hero__info">
          <h1 className="profile-hero__name">{displayName || user.name}</h1>
          <p className="profile-hero__email">{user.email}</p>
          <p className="profile-hero__verified">
            <span
              className={`profile-verified-badge profile-verified-badge--compact ${user.emailVerified ? 'profile-verified-badge--ok' : 'profile-verified-badge--pending'}`}
            >
              {user.emailVerified ? t('profile.emailVerified') : t('profile.emailNotVerified')}
            </span>
          </p>
          <div className="profile-hero__badges">
            <span className={`profile-role-badge ${isSeller ? 'profile-role-badge--seller' : 'profile-role-badge--buyer'}`}>
              {isSeller ? t('profile.roleSeller') : t('profile.roleBuyer')}
            </span>
            <span className={PLAN_BADGE[plan]}>{t(`subscription.plan.${plan}`)}</span>
          </div>
        </div>
      </div>
      <div className="profile-hero__actions">
        <button type="button" className="profile-hero__edit-btn" onClick={onEditProfile}>
          {t('profile.editProfile')}
        </button>
        <Link href={`/users/${user.id}`} className="profile-hero__link">
          {t('profile.viewPublic')}
        </Link>
      </div>
    </header>
  );
}
