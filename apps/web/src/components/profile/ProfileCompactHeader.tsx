'use client';

import Link from 'next/link';
import { avatarUrlForMode, formatSellerBuyerIdentity } from '@buyseekk/shared';
import { Avatar } from '@/components/Avatar';
import { UserDisplayName } from '@/components/UserDisplayName';
import { useLocale, useT } from '@/lib/i18n';
import type { User } from '@/lib/types';

type Props = {
  user: User;
  isSeller: boolean;
  onEditProfile: () => void;
};

export function ProfileCompactHeader({ user, isSeller, onEditProfile }: Props) {
  const t = useT();
  const locale = useLocale();
  const roleLabel = isSeller ? t('profile.roleSeller') : t('profile.roleBuyer');
  const sellerIdentity = isSeller
    ? formatSellerBuyerIdentity(
        {
          role: user.role,
          sellerType: user.sellerType,
          name: user.name,
          businessName: user.businessName,
          businessType: user.businessType,
          state: user.state,
          city: user.city,
          country: user.country,
        },
        locale,
      )
    : null;

  return (
    <header className="profile-compact card">
      <div className="profile-compact__top">
        <div className="profile-compact__identity">
          <Avatar
            name={user.name}
            url={avatarUrlForMode(user, isSeller ? 'SELLER' : 'BUYER')}
            size={64}
            className="profile-compact__avatar"
          />
          <div className="profile-compact__info">
            <h1 className="profile-compact__name">
              <UserDisplayName
                name={user.name}
                subscriptionPlan={user.subscriptionPlan}
                className="user-display-name--hide-plus-desktop"
              />
            </h1>
            <p className="profile-compact__email">{user.email}</p>
            {sellerIdentity ? (
              <>
                <p className="profile-compact__meta">{sellerIdentity.titleLine}</p>
                <p className="profile-compact__location">{sellerIdentity.detailLine}</p>
              </>
            ) : (
              <p className="profile-compact__meta">{roleLabel}</p>
            )}
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
