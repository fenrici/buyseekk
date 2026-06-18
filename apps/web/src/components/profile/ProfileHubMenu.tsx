'use client';

import { ProfileMenuRow } from './ProfileMenuRow';
import { useT } from '@/lib/i18n';
import type { ProfileScreen } from './profile-screens';

type Props = {
  onNavigate: (screen: ProfileScreen) => void;
  onLogout: () => void;
  onEditProfile: () => void;
};

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" strokeLinecap="round" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function IconSliders() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" strokeLinecap="round" />
      <circle cx="4" cy="14" r="2" />
      <circle cx="12" cy="11" r="2" />
      <circle cx="20" cy="16" r="2" />
    </svg>
  );
}

function IconHelp() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 0 1 4.2 1.8c0 1.8-2.2 2.2-2.2 3.7" strokeLinecap="round" />
      <circle cx="12" cy="17" r="0.5" fill="currentColor" />
    </svg>
  );
}

function IconInfo() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6M12 7h.01" strokeLinecap="round" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ProfileHubMenu({ onNavigate, onLogout, onEditProfile }: Props) {
  const t = useT();

  return (
    <nav className="profile-menu card" aria-label={t('profile.menuTitle')}>
      <ProfileMenuRow
        icon={<IconUser />}
        title={t('profile.menuProfile')}
        description={t('profile.menuProfileDesc')}
        onClick={onEditProfile}
        className="profile-menu-row--desktop-only"
      />
      <ProfileMenuRow
        icon={<IconSettings />}
        title={t('profile.menuPreferences')}
        description={t('profile.menuPreferencesDesc')}
        onClick={() => onNavigate('preferences')}
      />
      <ProfileMenuRow
        icon={<IconSliders />}
        title={t('profile.menuNotifications')}
        description={t('profile.menuNotificationsDesc')}
        onClick={() => onNavigate('notifications')}
      />
      <ProfileMenuRow
        icon={<IconHelp />}
        title={t('profile.menuHelp')}
        description={t('profile.menuHelpDesc')}
        onClick={() => onNavigate('help')}
      />
      <ProfileMenuRow
        icon={<IconInfo />}
        title={t('profile.menuAbout')}
        description={t('profile.menuAboutDesc')}
        onClick={() => onNavigate('about')}
      />
      <ProfileMenuRow
        icon={<IconCard />}
        title={t('profile.menuPlan')}
        description={t('profile.menuPlanDesc')}
        onClick={() => onNavigate('plan')}
        className="profile-menu-row--mobile-only"
      />
      <ProfileMenuRow
        icon={<IconShield />}
        title={t('profile.menuSecurity')}
        description={t('profile.menuSecurityDesc')}
        onClick={() => onNavigate('security')}
        className="profile-menu-row--mobile-only"
      />
      <ProfileMenuRow
        icon={<IconLogout />}
        title={t('settings.logout')}
        description={t('profile.menuLogoutDesc')}
        onClick={onLogout}
        destructive
      />
    </nav>
  );
}

function IconCard() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" strokeLinejoin="round" />
    </svg>
  );
}
