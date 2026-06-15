'use client';

import { ProfileLinkRow } from './ProfileLinkRow';
import { ProfileSection } from './ProfileSection';
import { useT } from '@/lib/i18n';

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0';

export function ProfileAboutSection({ embedded }: { embedded?: boolean } = {}) {
  const t = useT();

  const body = (
    <>
      <div className="profile-about-version">
        <span>{t('profile.appVersion')}</span>
        <strong>{APP_VERSION}</strong>
      </div>
      <div className="profile-link-list">
        <ProfileLinkRow label={t('profile.terms')} comingSoon />
        <ProfileLinkRow label={t('profile.privacy')} comingSoon />
      </div>
    </>
  );

  if (embedded) return <div className="profile-section card profile-section--embedded">{body}</div>;

  return <ProfileSection title={t('profile.aboutTitle')}>{body}</ProfileSection>;
}
