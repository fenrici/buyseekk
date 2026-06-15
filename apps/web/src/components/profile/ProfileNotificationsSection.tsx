'use client';

import type { NotificationPreferences } from '@buyseekk/shared';
import { NOTIFICATION_PREFERENCE_KEYS } from '@buyseekk/shared';
import { ProfileSection } from './ProfileSection';
import { ProfileToggle } from './ProfileToggle';
import { useT } from '@/lib/i18n';

const PREF_I18N: Record<keyof NotificationPreferences, string> = {
  matchingRequests: 'profile.notifMatching',
  newOffers: 'profile.notifOffers',
  newMessages: 'profile.notifMessages',
  requestExpiring: 'profile.notifExpiring',
  requestInactive: 'profile.notifInactive',
};

type Props = {
  prefs: NotificationPreferences;
  saving?: boolean;
  embedded?: boolean;
  onChange: (key: keyof NotificationPreferences, value: boolean) => void;
};

export function ProfileNotificationsSection({ prefs, saving, embedded, onChange }: Props) {
  const t = useT();

  const body = (
    <div className="profile-toggle-list">
      {NOTIFICATION_PREFERENCE_KEYS.map((key) => (
        <ProfileToggle
          key={key}
          label={t(PREF_I18N[key])}
          checked={prefs[key]}
          disabled={saving}
          onChange={(v) => onChange(key, v)}
        />
      ))}
    </div>
  );

  if (embedded) return <div className="profile-section card profile-section--embedded">{body}</div>;

  return (
    <ProfileSection title={t('profile.notifTitle')} description={t('profile.notifDesc')}>
      {body}
    </ProfileSection>
  );
}
