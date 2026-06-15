'use client';

import Link from 'next/link';
import { ProfileLinkRow } from './ProfileLinkRow';
import { ProfileSection } from './ProfileSection';
import { useT } from '@/lib/i18n';

type Props = {
  emailVerified: boolean;
  embedded?: boolean;
};

export function ProfileSecuritySection({ emailVerified, embedded }: Props) {
  const t = useT();

  const body = (
    <>
      <div className="profile-security-status">
        <span className="profile-security-status__label">{t('profile.emailStatus')}</span>
        <span
          className={`profile-verified-badge ${emailVerified ? 'profile-verified-badge--ok' : 'profile-verified-badge--pending'}`}
        >
          {emailVerified ? t('profile.emailVerified') : t('profile.emailNotVerified')}
        </span>
      </div>
      <div className="profile-link-list">
        <ProfileLinkRow label={t('profile.changePassword')} href="/forgot-password" />
        <ProfileLinkRow label={t('profile.activeSessions')} comingSoon />
        <ProfileLinkRow label={t('profile.twoFactor')} comingSoon />
      </div>
      {!emailVerified && (
        <p className="profile-section__note">
          <Link href="/verify-email" className="profile-inline-link">
            {t('profile.verifyEmailCta')}
          </Link>
        </p>
      )}
    </>
  );

  if (embedded) return <div className="profile-section card profile-section--embedded">{body}</div>;

  return (
    <ProfileSection title={t('profile.securityTitle')} description={t('profile.securityDesc')}>
      {body}
    </ProfileSection>
  );
}
