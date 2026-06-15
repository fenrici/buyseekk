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
  isSeller: boolean;
  onEditProfile: () => void;
};

export function ProfileCompactHeader({ user, isSeller, onEditProfile }: Props) {
  const t = useT();
  const plan = (user.subscriptionPlan ?? 'FREE') as SubscriptionPlan;

  return (
    <header className="profile-compact card">
      <div className="profile-compact__top">
        <div className="profile-compact__identity">
          <Avatar name={user.name} url={user.avatarUrl || null} size={64} className="profile-compact__avatar" />
          <div className="profile-compact__info">
            <h1 className="profile-compact__name">{user.name}</h1>
            <p className="profile-compact__email">{user.email}</p>
            <span
              className={`profile-verified-badge profile-verified-badge--compact ${user.emailVerified ? 'profile-verified-badge--ok' : 'profile-verified-badge--pending'}`}
            >
              {user.emailVerified ? t('profile.emailVerified') : t('profile.emailNotVerified')}
            </span>
            <div className="profile-compact__badges">
              <span className={`profile-role-badge ${isSeller ? 'profile-role-badge--seller' : 'profile-role-badge--buyer'}`}>
                {isSeller ? t('profile.roleSeller') : t('profile.roleBuyer')}
              </span>
              <span className={PLAN_BADGE[plan]}>{t(`subscription.plan.${plan}`)}</span>
            </div>
          </div>
        </div>
        <Link href={`/users/${user.id}`} className="profile-compact__public">
          {t('profile.viewPublic')}
        </Link>
      </div>
      <button type="button" className="profile-compact__edit" onClick={onEditProfile}>
        {t('profile.editProfile')}
      </button>
    </header>
  );
}
