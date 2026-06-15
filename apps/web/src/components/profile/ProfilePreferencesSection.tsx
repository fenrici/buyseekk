'use client';

import { ProfileSection } from './ProfileSection';
import { ProfileToggle } from './ProfileToggle';
import { useT } from '@/lib/i18n';

type Props = {
  locale: 'ES' | 'EN';
  preferredMode: 'BUYER' | 'SELLER';
  canChooseSeller: boolean;
  langSaving: boolean;
  prefsSaving: boolean;
  embedded?: boolean;
  onLanguage: (locale: 'ES' | 'EN') => void;
  onPreferredMode: (mode: 'BUYER' | 'SELLER') => void;
};

export function ProfilePreferencesSection({
  locale,
  preferredMode,
  canChooseSeller,
  langSaving,
  prefsSaving,
  embedded,
  onLanguage,
  onPreferredMode,
}: Props) {
  const t = useT();

  const body = (
    <>
      <div className="profile-pref-block">
        <p className="profile-pref-block__label">{t('settings.language')}</p>
        <div className="settings-segmented" role="group" aria-label={t('settings.language')}>
          <button
            type="button"
            className={`settings-seg-btn ${locale === 'ES' ? 'active' : ''}`}
            aria-pressed={locale === 'ES'}
            disabled={langSaving || prefsSaving}
            onClick={() => onLanguage('ES')}
          >
            {t('settings.languageEs')}
          </button>
          <button
            type="button"
            className={`settings-seg-btn ${locale === 'EN' ? 'active' : ''}`}
            aria-pressed={locale === 'EN'}
            disabled={langSaving || prefsSaving}
            onClick={() => onLanguage('EN')}
          >
            {t('settings.languageEn')}
          </button>
        </div>
      </div>

      <div className="profile-pref-block profile-pref-block--mode">
        <p className="profile-pref-block__label">{t('profile.defaultMode')}</p>
        <p className="profile-pref-block__hint">{t('profile.defaultModeHint')}</p>
        <div className="settings-segmented" role="group" aria-label={t('profile.defaultMode')}>
          <button
            type="button"
            className={`settings-seg-btn ${preferredMode === 'BUYER' ? 'active' : ''}`}
            aria-pressed={preferredMode === 'BUYER'}
            disabled={prefsSaving}
            onClick={() => onPreferredMode('BUYER')}
          >
            {t('profile.roleBuyer')}
          </button>
          <button
            type="button"
            className={`settings-seg-btn ${preferredMode === 'SELLER' ? 'active' : ''}`}
            aria-pressed={preferredMode === 'SELLER'}
            disabled={prefsSaving || !canChooseSeller}
            onClick={() => onPreferredMode('SELLER')}
          >
            {t('profile.roleSeller')}
          </button>
        </div>
      </div>

      <div className="profile-pref-block profile-pref-block--muted">
        <ProfileToggle
          label={t('profile.themeDark')}
          description={t('profile.themeLightSoon')}
          checked
          disabled
          onChange={() => {}}
        />
      </div>
    </>
  );

  if (embedded) return <div className="profile-section card profile-section--embedded">{body}</div>;
  return (
    <ProfileSection title={t('profile.prefsTitle')} description={t('profile.prefsDesc')}>
      {body}
    </ProfileSection>
  );
}
