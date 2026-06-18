'use client';

import { ProfileLinkRow } from './ProfileLinkRow';
import { ProfileSection } from './ProfileSection';
import { useEmailVerificationActions } from '@/hooks/useEmailVerificationActions';
import { useT } from '@/lib/i18n';

type Props = {
  emailVerified: boolean;
  embedded?: boolean;
};

export function ProfileSecuritySection({ emailVerified, embedded }: Props) {
  const t = useT();
  const { checking, resending, toast, handleVerify, handleResend } = useEmailVerificationActions();

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
        <div className="profile-section__note profile-email-verify-actions">
          <p className="profile-section__note-text">{t('auth.verifyEmailBanner')}</p>
          <div className="profile-email-verify-actions__buttons">
            <button
              type="button"
              className="email-verify-card__btn email-verify-card__btn--primary"
              onClick={handleResend}
              disabled={resending || checking}
            >
              {resending ? t('auth.verifyEmailSending') : t('auth.verifyEmailResend')}
            </button>
            <button
              type="button"
              className="email-verify-card__btn email-verify-card__btn--ghost"
              onClick={handleVerify}
              disabled={resending || checking}
            >
              {checking ? t('auth.verifyEmailChecking') : t('auth.verifyEmailRefresh')}
            </button>
          </div>
          {toast && (
            <p className={`profile-email-verify-actions__toast profile-email-verify-actions__toast--${toast.type}`} role="status">
              {toast.text}
            </p>
          )}
        </div>
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
