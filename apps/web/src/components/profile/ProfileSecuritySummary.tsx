'use client';

import Link from 'next/link';
import { useT } from '@/lib/i18n';

type Props = {
  emailVerified: boolean;
  onOpenSecurity?: () => void;
};

export function ProfileSecuritySummary({ emailVerified, onOpenSecurity }: Props) {
  const t = useT();

  return (
    <section className="profile-side-card card" aria-labelledby="profile-security-summary-title">
      <h2 id="profile-security-summary-title" className="profile-side-card__title">
        {t('profile.securitySummaryTitle')}
      </h2>
      <dl className="profile-security-summary">
        <div className="profile-security-summary__row">
          <dt>{t('profile.emailStatus')}</dt>
          <dd>
            <span
              className={`profile-security-summary__pill ${emailVerified ? 'profile-security-summary__pill--ok' : 'profile-security-summary__pill--warn'}`}
            >
              {emailVerified ? t('profile.emailVerified') : t('profile.emailNotVerified')}
            </span>
          </dd>
        </div>
        <div className="profile-security-summary__row">
          <dt>{t('profile.passwordStatus')}</dt>
          <dd>
            <Link href="/forgot-password" className="profile-security-summary__link">
              {t('profile.passwordProtected')}
            </Link>
          </dd>
        </div>
        <div className="profile-security-summary__row">
          <dt>{t('profile.lastAccess')}</dt>
          <dd className="profile-security-summary__muted">{t('profile.lastAccessUnknown')}</dd>
        </div>
        <div className="profile-security-summary__row">
          <dt>{t('profile.activeSessions')}</dt>
          <dd className="profile-security-summary__muted">{t('subscription.comingSoon')}</dd>
        </div>
      </dl>
      {onOpenSecurity && (
        <button type="button" className="profile-side-card__link-btn" onClick={onOpenSecurity}>
          {t('profile.menuSecurity')} →
        </button>
      )}
    </section>
  );
}
