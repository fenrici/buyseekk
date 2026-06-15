'use client';

import type { SubscriptionPlan } from '@buyseekk/shared';
import Link from 'next/link';
import { Avatar } from '@/components/Avatar';
import { useT } from '@/lib/i18n';
import type { User } from '@/lib/types';

type Props = {
  user: User;
  isSeller: boolean;
  onEditProfile: () => void;
};

export function ProfileCompactHeader({ user, isSeller, onEditProfile }: Props) {
  const t = useT();
  const plan = (user.subscriptionPlan ?? 'FREE') as SubscriptionPlan;
  const roleLabel = isSeller ? t('profile.roleSeller') : t('profile.roleBuyer');
  const planLabel =
    plan === 'FREE' ? t('profile.hubFreePlan') : t(`subscription.plan.${plan}`);

  return (
    <header className="profile-compact card">
      <div className="profile-compact__top">
        <div className="profile-compact__identity">
          <Avatar name={user.name} url={user.avatarUrl || null} size={64} className="profile-compact__avatar" />
          <div className="profile-compact__info">
            <h1 className="profile-compact__name">{user.name}</h1>
            <p className="profile-compact__email">{user.email}</p>
            <p className="profile-compact__meta">
              {roleLabel} <span aria-hidden>•</span> {planLabel}
            </p>
            <span className="profile-compact__verified profile-compact__verified--mobile-only">
              <span
                className={`profile-verified-badge profile-verified-badge--compact ${user.emailVerified ? 'profile-verified-badge--ok' : 'profile-verified-badge--pending'}`}
              >
                {user.emailVerified ? t('profile.emailVerified') : t('profile.emailNotVerified')}
              </span>
            </span>
          </div>
        </div>
        <Link href={`/users/${user.id}`} className="profile-compact__public">
          {t('profile.viewPublic')}
        </Link>
      </div>
      <button type="button" className="profile-compact__edit profile-compact__edit--mobile-only" onClick={onEditProfile}>
        {t('profile.editProfile')}
      </button>
    </header>
  );
}
