'use client';

import { ProfileLinkRow } from './ProfileLinkRow';
import { ProfileSection } from './ProfileSection';
import { useT } from '@/lib/i18n';

export function ProfileHelpSection({ embedded }: { embedded?: boolean } = {}) {
  const t = useT();

  const body = (
    <div className="profile-link-list">
      <ProfileLinkRow label={t('profile.helpCenter')} comingSoon />
      <ProfileLinkRow label={t('profile.contactSupport')} comingSoon />
      <ProfileLinkRow label={t('profile.reportProblem')} comingSoon />
      <ProfileLinkRow label={t('profile.sendFeedback')} comingSoon />
    </div>
  );

  if (embedded) return <div className="profile-section card profile-section--embedded">{body}</div>;

  return (
    <ProfileSection title={t('profile.helpTitle')} description={t('profile.helpDesc')}>
      {body}
    </ProfileSection>
  );
}
