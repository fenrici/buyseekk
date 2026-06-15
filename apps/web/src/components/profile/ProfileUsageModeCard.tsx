'use client';

import { useT } from '@/lib/i18n';

type Props = {
  isSeller: boolean;
  switching: boolean;
  onSwitch: () => void;
};

export function ProfileUsageModeCard({ isSeller, switching, onSwitch }: Props) {
  const t = useT();

  return (
    <section className="profile-mode card" aria-labelledby="profile-mode-title">
      <div className="profile-mode__head">
        <h2 id="profile-mode-title" className="profile-mode__title">
          {t('settings.usageMode')}
        </h2>
        <span className={`profile-role-badge ${isSeller ? 'profile-role-badge--seller' : 'profile-role-badge--buyer'}`}>
          {isSeller ? t('profile.roleSeller') : t('profile.roleBuyer')}
        </span>
      </div>
      <p className="profile-mode__current">
        <span>{t('profile.currentMode')}:</span>{' '}
        <strong>{isSeller ? t('profile.roleSeller') : t('profile.roleBuyer')}</strong>
      </p>
      <p className="profile-mode__desc">
        {isSeller ? t('profile.modeSellerDesc') : t('profile.modeBuyerDesc')}
      </p>
      <button type="button" className="profile-mode__switch" disabled={switching} onClick={onSwitch}>
        {switching ? t('settings.switching') : t('profile.switchMode')}
      </button>
    </section>
  );
}
