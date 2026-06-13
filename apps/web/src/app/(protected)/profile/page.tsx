'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api, uploadImage } from '@/lib/api';
import { User } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { Header } from '@/components/Header';
import { useAuth } from '@/providers/AuthProvider';
import { useModeSwitch } from '@/providers/ModeSwitchProvider';
import { setStoredLocale, useT } from '@/lib/i18n';
import { logoutSession } from '@/lib/session';

export default function ProfileEditPage() {
  const { user, setSession } = useAuth();
  const { switchMode, switching } = useModeSwitch();
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const [langSaving, setLangSaving] = useState<'ES' | 'EN' | null>(null);
  const [langSaved, setLangSaved] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [form, setForm] = useState({
    name: '',
    bio: '',
    city: '',
    businessName: '',
    website: '',
    avatarUrl: '',
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name ?? '',
      bio: user.bio ?? '',
      city: user.city ?? '',
      businessName: user.businessName ?? '',
      website: user.website ?? '',
      avatarUrl: user.avatarUrl ?? '',
    });
  }, [user?.id]);

  async function handleLanguage(locale: 'ES' | 'EN') {
    if (!user || langSaving || locale === user.locale) return;
    setLangSaving(locale);
    setLangSaved(false);
    try {
      const updated = await api<User>('/users/me/language', {
        method: 'PATCH',
        body: JSON.stringify({ locale }),
      });
      setSession(updated);
      setStoredLocale(updated.locale);
      setLangSaved(true);
      window.setTimeout(() => setLangSaved(false), 2200);
    } catch {
      // se mantiene el idioma anterior
    } finally {
      setLangSaving(null);
    }
  }

  if (!user) return null;

  const isBusiness = user.sellerType === 'BUSINESS';
  const isSeller = user.activeMode === 'SELLER';

  function update(field: keyof typeof form, value: string) {
    setSaved(false);
    setForm((f) => ({ ...f, [field]: value }));
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
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const updated = await api<User>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify(form),
      });
      setSession(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="panel-dark">
      <Header variant="dark" />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-white">{t('profile.editTitle')}</h1>
            <p className="mt-1 text-slate-500">{t('profile.editSubtitle')}</p>
          </div>
          <Link href={`/users/${user.id}`} className="btn btn-ghost text-sm">
            {t('profile.viewPublic')}
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="card mt-8 space-y-5 p-6">
          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
          {saved && (
            <p className="rounded-lg border border-emerald-500/30 bg-emerald-50/50 p-3 text-sm text-emerald-600">
              {t('profile.saved')}
            </p>
          )}

          <div className="flex items-center gap-4">
            <Avatar name={form.name || user.name} url={form.avatarUrl || null} size={72} />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-ghost text-sm"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? t('profile.uploading') : t('profile.changePhoto')}
              </button>
              {form.avatarUrl && (
                <button
                  type="button"
                  className="btn btn-ghost text-sm text-red-500"
                  disabled={uploading}
                  onClick={() => update('avatarUrl', '')}
                >
                  {t('profile.removePhoto')}
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => handlePhoto(e.target.files)}
            />
          </div>

          <div>
            <label htmlFor="profile-name" className="text-sm font-semibold text-slate-700">
              {t('auth.name')}
            </label>
            <input
              id="profile-name"
              className="input mt-1 w-full"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              minLength={2}
              maxLength={60}
              required
            />
          </div>

          <div>
            <label htmlFor="profile-email" className="text-sm font-semibold text-slate-700">
              {t('auth.email')}
            </label>
            <input
              id="profile-email"
              className="input mt-1 w-full opacity-70"
              value={user.email}
              readOnly
              disabled
            />
          </div>

          {isBusiness && (
            <div>
              <label htmlFor="profile-business" className="text-sm font-semibold text-slate-700">
                {t('profile.businessName')}
              </label>
              <input
                id="profile-business"
                className="input mt-1 w-full"
                value={form.businessName}
                onChange={(e) => update('businessName', e.target.value)}
                placeholder={t('profile.businessNamePlaceholder')}
                maxLength={80}
              />
            </div>
          )}

          <div>
            <label htmlFor="profile-bio" className="text-sm font-semibold text-slate-700">
              {t('profile.bio')}
            </label>
            <textarea
              id="profile-bio"
              className="input mt-1 w-full"
              rows={3}
              value={form.bio}
              onChange={(e) => update('bio', e.target.value)}
              placeholder={t('profile.bioPlaceholder')}
              maxLength={500}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="profile-city" className="text-sm font-semibold text-slate-700">
                {t('profile.city')}
              </label>
              <input
                id="profile-city"
                className="input mt-1 w-full"
                value={form.city}
                onChange={(e) => update('city', e.target.value)}
                placeholder={t('profile.cityPlaceholder')}
                maxLength={80}
              />
            </div>
          </div>

          {isBusiness && (
            <div>
              <label htmlFor="profile-website" className="text-sm font-semibold text-slate-700">
                {t('profile.website')}
              </label>
              <input
                id="profile-website"
                className="input mt-1 w-full"
                value={form.website}
                onChange={(e) => update('website', e.target.value)}
                placeholder={t('profile.websitePlaceholder')}
                maxLength={200}
              />
            </div>
          )}

          <button type="submit" disabled={saving || uploading} className="btn btn-primary">
            {saving ? t('common.saving') : t('profile.save')}
          </button>
        </form>

        <section className="card mt-6 space-y-6 p-6">
          <div className="settings-block">
            <p className="settings-block-label">{t('settings.usageMode')}</p>
            <p className="settings-mode-current">
              {isSeller ? t('settings.currentModeSeller') : t('settings.currentModeBuyer')}
            </p>
            <p className="settings-hint">
              {isSeller ? t('settings.modeSellerDesc') : t('settings.modeBuyerDesc')}
            </p>
            <button
              type="button"
              className="settings-mode-switch"
              disabled={switching}
              onClick={() => switchMode(isSeller ? 'BUYER' : 'SELLER')}
            >
              {switching
                ? t('settings.switching')
                : isSeller
                  ? t('settings.switchToBuyer')
                  : t('settings.switchToSeller')}
            </button>
          </div>

          <div className="settings-block border-t border-white/10 pt-6">
            <p className="settings-block-label">{t('settings.preferences')}</p>
            <span className="settings-hint">{t('settings.language')}</span>
            <div className="settings-segmented" role="group" aria-label={t('settings.language')}>
              <button
                type="button"
                className={`settings-seg-btn ${user.locale === 'ES' ? 'active' : ''}`}
                aria-pressed={user.locale === 'ES'}
                disabled={!!langSaving}
                onClick={() => handleLanguage('ES')}
              >
                {t('settings.languageEs')}
              </button>
              <button
                type="button"
                className={`settings-seg-btn ${user.locale === 'EN' ? 'active' : ''}`}
                aria-pressed={user.locale === 'EN'}
                disabled={!!langSaving}
                onClick={() => handleLanguage('EN')}
              >
                {t('settings.languageEn')}
              </button>
            </div>
            {langSaved && <p className="settings-hint settings-hint--ok">{t('settings.languageUpdated')}</p>}
          </div>
        </section>

        <section className="card mt-6 space-y-3 p-6">
          <h2 className="text-lg font-bold text-white">{t('settings.account')}</h2>
          {confirmLogout ? (
            <div className="profile-logout-confirm">
              <p className="settings-hint">{t('settings.logoutConfirm')}</p>
              <div className="profile-logout-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setConfirmLogout(false)}>
                  {t('common.cancel')}
                </button>
                <button type="button" className="profile-logout-btn profile-logout-btn--confirm" onClick={logoutSession}>
                  {t('settings.logoutConfirmYes')}
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="profile-logout-btn" onClick={() => setConfirmLogout(true)}>
              {t('settings.logout')}
            </button>
          )}
        </section>
      </main>
    </div>
  );
}
