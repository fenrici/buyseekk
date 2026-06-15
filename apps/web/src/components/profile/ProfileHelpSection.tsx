'use client';

import { ProfileLinkRow } from './ProfileLinkRow';
import { ProfileSection } from './ProfileSection';
import { useT } from '@/lib/i18n';

export function ProfileHelpSection({ embedded }: { embedded?: boolean } = {}) {
  const t = useT();

  const body = (
    <div className="profile-link-list">
      <ProfileLinkRow label={t('profile.helpCenter')} href="/help" />
      <ProfileLinkRow label={t('profile.contactSupport')} href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'support@buyseekk.com'}`} external />
      <ProfileLinkRow
        label={t('profile.reportProblem')}
        href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'support@buyseekk.com'}?subject=${encodeURIComponent(t('help.reportSubject'))}`}
        external
      />
      <ProfileLinkRow
        label={t('profile.sendFeedback')}
        href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'support@buyseekk.com'}?subject=${encodeURIComponent(t('help.feedbackSubject'))}`}
        external
      />
    </div>
  );

  if (embedded) return <div className="profile-section card profile-section--embedded">{body}</div>;

  return (
    <ProfileSection title={t('profile.helpTitle')} description={t('profile.helpDesc')}>
      {body}
    </ProfileSection>
  );
}
