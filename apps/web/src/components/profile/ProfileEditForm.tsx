'use client';

import { useRef } from 'react';
import { Avatar } from '@/components/Avatar';
import { useT } from '@/lib/i18n';
import type { User } from '@/lib/types';

export type ProfileFormState = {
  name: string;
  bio: string;
  city: string;
  businessName: string;
  website: string;
  avatarUrl: string;
};

type Props = {
  user: User;
  form: ProfileFormState;
  isBusiness: boolean;
  uploading: boolean;
  saving: boolean;
  saved: boolean;
  error: string;
  onUpdate: (field: keyof ProfileFormState, value: string) => void;
  onPhoto: (files: FileList | null) => void;
  onSubmit: (e: React.FormEvent) => void;
};

export function ProfileEditForm({
  user,
  form,
  isBusiness,
  uploading,
  saving,
  saved,
  error,
  onUpdate,
  onPhoto,
  onSubmit,
}: Props) {
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <form onSubmit={onSubmit} className="profile-form card">
      {error && <p className="profile-form__alert profile-form__alert--error">{error}</p>}
      {saved && <p className="profile-form__alert profile-form__alert--success">{t('profile.saved')}</p>}

      <div className="profile-form__photo">
        <div className="profile-form__photo-row">
          <Avatar name={form.name || user.name} url={form.avatarUrl || null} size={72} />
          <div className="profile-form__photo-actions">
            <button type="button" className="profile-form__photo-btn" disabled={uploading} onClick={() => fileRef.current?.click()}>
              {uploading ? t('profile.uploading') : t('profile.changePhoto')}
            </button>
            {form.avatarUrl && (
              <button type="button" className="profile-form__photo-btn profile-form__photo-btn--danger" disabled={uploading} onClick={() => onUpdate('avatarUrl', '')}>
                {t('profile.removePhoto')}
              </button>
            )}
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => onPhoto(e.target.files)} />
      </div>

      <div className="profile-field">
        <label htmlFor="profile-name">{t('profile.fullName')}</label>
        <input id="profile-name" className="input" value={form.name} onChange={(e) => onUpdate('name', e.target.value)} minLength={2} maxLength={60} required />
      </div>

      {isBusiness && (
        <div className="profile-field">
          <label htmlFor="profile-business">{t('profile.businessName')}</label>
          <input id="profile-business" className="input" value={form.businessName} onChange={(e) => onUpdate('businessName', e.target.value)} placeholder={t('profile.businessNamePlaceholder')} maxLength={80} />
        </div>
      )}

      <div className="profile-field">
        <label htmlFor="profile-bio">{t('profile.bio')}</label>
        <textarea id="profile-bio" className="input" rows={4} value={form.bio} onChange={(e) => onUpdate('bio', e.target.value)} placeholder={t('profile.bioPlaceholder')} maxLength={500} />
      </div>

      <div className="profile-field">
        <label htmlFor="profile-city">{t('profile.city')}</label>
        <input id="profile-city" className="input" value={form.city} onChange={(e) => onUpdate('city', e.target.value)} placeholder={t('profile.cityPlaceholder')} maxLength={80} />
      </div>

      {isBusiness && (
        <div className="profile-field">
          <label htmlFor="profile-website">{t('profile.website')}</label>
          <input id="profile-website" className="input" value={form.website} onChange={(e) => onUpdate('website', e.target.value)} placeholder={t('profile.websitePlaceholder')} maxLength={200} />
        </div>
      )}

      <div className="profile-form__footer">
        <button type="submit" disabled={saving || uploading} className="profile-form__save">
          {saving ? t('common.saving') : t('profile.save')}
        </button>
      </div>
    </form>
  );
}
