'use client';

import { useEffect, useState } from 'react';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  parseNotificationPreferences,
  type NotificationPreferences,
} from '@buyseekk/shared';
import { api, uploadImage } from '@/lib/api';
import { User } from '@/lib/types';
import { Header } from '@/components/Header';
import { ProfileAboutSection } from '@/components/profile/ProfileAboutSection';
import { ProfileAccountSidebar } from '@/components/profile/ProfileAccountSidebar';
import { ProfileCompactHeader } from '@/components/profile/ProfileCompactHeader';
import { ProfileEditForm, type ProfileFormState } from '@/components/profile/ProfileEditForm';
import { ProfileHelpSection } from '@/components/profile/ProfileHelpSection';
import { ProfileHubMenu } from '@/components/profile/ProfileHubMenu';
import { ProfileNotificationsSection } from '@/components/profile/ProfileNotificationsSection';
import { ProfilePlanBillingScreen } from '@/components/profile/ProfilePlanBillingScreen';
import { ProfilePreferencesSection } from '@/components/profile/ProfilePreferencesSection';
import { ProfileSecuritySection } from '@/components/profile/ProfileSecuritySection';
import { ProfileSubLayout } from '@/components/profile/ProfileSubLayout';
import { ProfileUsageModeCard } from '@/components/profile/ProfileUsageModeCard';
import type { ProfileScreen } from '@/components/profile/profile-screens';
import { useAuth } from '@/providers/AuthProvider';
import { useModeSwitch } from '@/providers/ModeSwitchProvider';
import { setStoredLocale, useT } from '@/lib/i18n';
import { logoutSession } from '@/lib/session';

function profileFormFromUser(user: User): ProfileFormState {
  return {
    name: user.name ?? '',
    bio: user.bio ?? '',
    city: user.city ?? '',
    businessName: user.businessName ?? '',
    website: user.website ?? '',
    avatarUrl: user.avatarUrl ?? '',
  };
}

export default function ProfilePage() {
  const { user, setSession } = useAuth();
  const { switchMode, switching } = useModeSwitch();
  const t = useT();
  const [screen, setScreen] = useState<ProfileScreen>('hub');
  const [langSaving, setLangSaving] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [preferredMode, setPreferredMode] = useState<'BUYER' | 'SELLER'>('BUYER');
  const [form, setForm] = useState<ProfileFormState>(profileFormFromUser({} as User));
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    setForm(profileFormFromUser(user));
    setNotifPrefs(parseNotificationPreferences(user.notificationPreferences));
    setPreferredMode(user.preferredMode ?? user.activeMode ?? 'BUYER');
  }, [user?.id]);

  if (!user) return null;

  const account = user;
  const isBusiness = account.sellerType === 'BUSINESS';
  const isSeller = account.activeMode === 'SELLER';
  const canChooseSeller = account.role === 'SELLER' || account.role === 'BOTH';

  function goHub() {
    setScreen('hub');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function go(screen: ProfileScreen) {
    setScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function update(field: keyof ProfileFormState, value: string) {
    setSaved(false);
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function patchPreferences(body: Record<string, unknown>) {
    setPrefsSaving(true);
    try {
      const updated = await api<User>('/users/me/preferences', { method: 'PATCH', body: JSON.stringify(body) });
      setSession(updated);
      setNotifPrefs(parseNotificationPreferences(updated.notificationPreferences));
      if (updated.preferredMode) setPreferredMode(updated.preferredMode);
    } finally {
      setPrefsSaving(false);
    }
  }

  async function handleLanguage(locale: 'ES' | 'EN') {
    if (langSaving || locale === account.locale) return;
    setLangSaving(true);
    try {
      const updated = await api<User>('/users/me/language', { method: 'PATCH', body: JSON.stringify({ locale }) });
      setSession(updated);
      setStoredLocale(updated.locale);
    } finally {
      setLangSaving(false);
    }
  }

  async function handlePreferredMode(mode: 'BUYER' | 'SELLER') {
    if (mode === preferredMode || prefsSaving) return;
    await patchPreferences({ preferredMode: mode });
  }

  async function handleNotifPref(key: keyof NotificationPreferences, value: boolean) {
    const prev = notifPrefs;
    const next = { ...notifPrefs, [key]: value };
    setNotifPrefs(next);
    try {
      await patchPreferences({ notificationPreferences: { [key]: value } });
    } catch {
      setNotifPrefs(prev);
    }
  }

  async function handlePhoto(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const { url } = await uploadImage(file);
      update('avatarUrl', url);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const updated = await api<User>('/users/me', { method: 'PATCH', body: JSON.stringify(form) });
      setSession(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  function openEdit() {
    setForm(profileFormFromUser(account));
    setError('');
    setSaved(false);
    go('edit');
  }

  let content: React.ReactNode;

  switch (screen) {
    case 'edit':
      content = (
        <ProfileSubLayout title={t('profile.editTitle')} onBack={goHub}>
          <ProfileEditForm
            user={account}
            form={form}
            isBusiness={isBusiness}
            uploading={uploading}
            saving={saving}
            saved={saved}
            error={error}
            onUpdate={update}
            onPhoto={handlePhoto}
            onSubmit={handleSubmit}
          />
        </ProfileSubLayout>
      );
      break;
    case 'preferences':
      content = (
        <ProfileSubLayout title={t('profile.menuPreferences')} onBack={goHub}>
          <ProfilePreferencesSection
            embedded
            locale={account.locale}
            preferredMode={preferredMode}
            canChooseSeller={canChooseSeller}
            langSaving={langSaving}
            prefsSaving={prefsSaving}
            onLanguage={handleLanguage}
            onPreferredMode={handlePreferredMode}
          />
          <ProfileUsageModeCard
            isSeller={isSeller}
            switching={switching}
            onSwitch={() => switchMode(isSeller ? 'BUYER' : 'SELLER')}
          />
        </ProfileSubLayout>
      );
      break;
    case 'notifications':
      content = (
        <ProfileSubLayout title={t('profile.menuNotifications')} onBack={goHub}>
          <ProfileNotificationsSection embedded prefs={notifPrefs} saving={prefsSaving} onChange={handleNotifPref} />
        </ProfileSubLayout>
      );
      break;
    case 'plan':
      content = (
        <ProfileSubLayout
          title={t('profile.menuPlan')}
          subtitle={t('profile.billingSubtitle')}
          onBack={goHub}
          variant="wide"
        >
          <ProfilePlanBillingScreen user={account} isSeller={isSeller} />
        </ProfileSubLayout>
      );
      break;
    case 'security':
      content = (
        <ProfileSubLayout title={t('profile.menuSecurity')} onBack={goHub}>
          <ProfileSecuritySection embedded emailVerified={account.emailVerified} />
        </ProfileSubLayout>
      );
      break;
    case 'help':
      content = (
        <ProfileSubLayout title={t('profile.menuHelp')} onBack={goHub}>
          <ProfileHelpSection embedded />
        </ProfileSubLayout>
      );
      break;
    case 'about':
      content = (
        <ProfileSubLayout title={t('profile.menuAbout')} onBack={goHub}>
          <ProfileAboutSection embedded />
        </ProfileSubLayout>
      );
      break;
    default:
      content = (
        <div className="profile-hub">
          <div className="profile-page__grid">
            <div className="profile-page__main">
              <ProfileCompactHeader user={account} isSeller={isSeller} onEditProfile={openEdit} />
              <ProfileHubMenu onNavigate={go} onLogout={logoutSession} onEditProfile={openEdit} />
            </div>
            <aside className="profile-page__sidebar">
              <ProfileAccountSidebar
                user={account}
                onUpgrade={() => go('plan')}
                onSecurity={() => go('security')}
              />
            </aside>
          </div>
        </div>
      );
  }

  return (
    <div className="panel-dark">
      <Header variant="dark" />
      <main
        className={`profile-page ${
          screen === 'hub' ? 'profile-page--hub' : screen === 'plan' ? 'profile-page--billing' : 'profile-page--sub'
        }`}
      >
        {content}
      </main>
    </div>
  );
}
