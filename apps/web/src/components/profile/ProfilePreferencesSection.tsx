'use client';

import { ProfileSection } from './ProfileSection';
import { ProfileToggle } from './ProfileToggle';
import { useT } from '@/lib/i18n';

type Props = {
  locale: 'ES' | 'EN';
  langSaving: boolean;
  prefsSaving: boolean;
  embedded?: boolean;
  onLanguage: (locale: 'ES' | 'EN') => void;
};

export function ProfilePreferencesSection({
  locale,
  langSaving,
  prefsSaving,
  embedded,
  onLanguage,
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
