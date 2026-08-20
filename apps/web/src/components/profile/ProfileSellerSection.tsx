'use client';

import { useRef, useState } from 'react';
import { formatUsAreaLocation, MAX_UPLOAD_BYTES, parseUsAreaLocation, type AppBusinessType, type UsStateCode } from '@buyseekk/shared';
import { api, uploadImage } from '@/lib/api';
import { Avatar } from '@/components/Avatar';
import { isUsLaunch } from '@/lib/launch-country';
import { useT } from '@/lib/i18n';
import type { User } from '@/lib/types';
import { UsLocationFields } from '@/components/profile/UsLocationFields';

type SellerType = 'INDIVIDUAL' | 'COMPANY';

type FormState = {
  sellerType: SellerType;
  sellerCategory: 'AUTOS' | 'INMOBILIARIA';
  businessName: string;
  businessType: AppBusinessType | '';
  website: string;
  state: string;
  city: string;
  sellerAvatarUrl: string;
};

function formFromUser(user: User): FormState {
  const parsed = user.city ? parseUsAreaLocation(user.city) : null;
  const state = user.state ?? parsed?.state ?? (isUsLaunch() ? 'FL' : '');
  let cityForFields = user.city ?? '';
  if (parsed) {
    cityForFields = formatUsAreaLocation(parsed.state, parsed.area);
  } else if (isUsLaunch() && user.state && user.city && !user.city.includes(',')) {
    cityForFields = formatUsAreaLocation(user.state as UsStateCode, user.city);
  }
  return {
    sellerType: (user.sellerType as SellerType) ?? 'INDIVIDUAL',
    sellerCategory: user.sellerCategory ?? 'AUTOS',
    businessName: user.businessName ?? '',
    businessType: (user.businessType as AppBusinessType) ?? '',
    website: user.website ?? '',
    state,
    city: cityForFields,
    sellerAvatarUrl: user.sellerAvatarUrl ?? '',
  };
}

function usLocationForSave(city: string, state: string) {
  const parsed = parseUsAreaLocation(city.trim());
  if (parsed && isUsLaunch()) {
    return { city: parsed.area, state: parsed.state };
  }
  return { city: city.trim(), state: state.trim() };
}

export function ProfileSellerSection({
  user,
  onUpdated,
}: {
  user: User;
  onUpdated: (user: User) => void;
}) {
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormState>(() => formFromUser(user));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const isCompany = form.sellerType === 'COMPANY';

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setSaved(false);
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handlePhoto(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setError('');
    if (file.size > MAX_UPLOAD_BYTES || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError(t('images.maxHint', { max: '1', mb: String(MAX_UPLOAD_BYTES / (1024 * 1024)) }));
      return;
    }
    setUploading(true);
    try {
      const { url } = await uploadImage(file);
      update('sellerAvatarUrl', url);
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
      const location = usLocationForSave(form.city, form.state);
      const payload = {
        sellerType: form.sellerType,
        sellerCategory: form.sellerCategory,
        state: location.state,
        city: location.city,
        sellerAvatarUrl: form.sellerAvatarUrl,
        ...(isCompany
          ? {
              businessName: form.businessName.trim(),
              businessType: form.businessType || undefined,
              website: form.website.trim() || undefined,
            }
          : {}),
      };
      const updated = await api<User>('/users/me/seller-profile', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      onUpdated(updated);
      setForm(formFromUser(updated));
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="profile-form card profile-seller-section">
      <h2 className="profile-seller-section__title">{t('profile.sellerSectionTitle')}</h2>
      <p className="profile-seller-section__hint">{t('profile.sellerSectionHint')}</p>

      {error && <p className="profile-form__alert profile-form__alert--error">{error}</p>}
      {saved && <p className="profile-form__alert profile-form__alert--success">{t('profile.saved')}</p>}

      <div className="profile-form__photo">
        <p className="profile-form__photo-label">
          {isCompany ? t('profile.sellerLogoLabel') : t('profile.sellerPhotoLabel')}
        </p>
        <div className="profile-form__photo-row">
          <Avatar name={user.name} url={form.sellerAvatarUrl || null} size={72} />
          <div className="profile-form__photo-actions">
            <button
              type="button"
              className="profile-form__photo-btn"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? t('profile.uploading') : t('profile.changeSellerPhoto')}
            </button>
            {form.sellerAvatarUrl && (
              <button
                type="button"
                className="profile-form__photo-btn profile-form__photo-btn--danger"
                disabled={uploading}
                onClick={() => update('sellerAvatarUrl', '')}
              >
                {t('profile.removePhoto')}
              </button>
            )}
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => handlePhoto(e.target.files)}
        />
      </div>

      <div className="profile-field">
        <span className="profile-field__label">{t('profile.sellerTypeLabel')}</span>
        <div className="auth-option-row auth-option-row--compact" role="radiogroup">
          <button
            type="button"
            className={`auth-option-btn ${form.sellerType === 'INDIVIDUAL' ? 'active' : ''}`}
            onClick={() => update('sellerType', 'INDIVIDUAL')}
          >
            {t('auth.sellerTypePersonal')}
          </button>
          <button
            type="button"
            className={`auth-option-btn ${form.sellerType === 'COMPANY' ? 'active' : ''}`}
            onClick={() => update('sellerType', 'COMPANY')}
          >
            {t('auth.sellerTypeBusiness')}
          </button>
        </div>
      </div>

      <div className="profile-field">
        <label htmlFor="seller-category">{t('sellerOnboarding.categoryLabel')}</label>
        <select
          id="seller-category"
          className="input"
          value={form.sellerCategory}
          onChange={(e) => update('sellerCategory', e.target.value as FormState['sellerCategory'])}
        >
          <option value="AUTOS">{t('sellerOnboarding.categoryAutos')}</option>
          <option value="INMOBILIARIA">{t('sellerOnboarding.categoryRealEstate')}</option>
        </select>
      </div>

      {isCompany && (
        <>
          <div className="profile-field">
            <label htmlFor="seller-business-name">{t('profile.businessName')}</label>
            <input
              id="seller-business-name"
              className="input"
              value={form.businessName}
              onChange={(e) => update('businessName', e.target.value)}
              required
              maxLength={80}
            />
          </div>
          <div className="profile-field">
            <label htmlFor="seller-business-type">{t('profile.businessTypeLabel')}</label>
            <select
              id="seller-business-type"
              className="input"
              value={form.businessType}
              onChange={(e) => update('businessType', e.target.value as AppBusinessType)}
              required
            >
              <option value="">{t('profile.businessTypePlaceholder')}</option>
              <option value="DEALERSHIP">{t('profile.businessTypeDealership')}</option>
              <option value="REAL_ESTATE_AGENCY">{t('profile.businessTypeRealEstate')}</option>
              <option value="OTHER">{t('profile.businessTypeOther')}</option>
            </select>
          </div>
          <div className="profile-field">
            <label htmlFor="seller-website">{t('profile.website')}</label>
            <input
              id="seller-website"
              className="input"
              value={form.website}
              onChange={(e) => update('website', e.target.value)}
              placeholder={t('profile.websitePlaceholder')}
              maxLength={200}
            />
          </div>
        </>
      )}

      {isUsLaunch() ? (
        <>
          <UsLocationFields
            value={form.city}
            onChange={(city) => {
              const parsed = parseUsAreaLocation(city);
              update('city', city);
              if (parsed) update('state', parsed.state);
            }}
          />
          <input type="hidden" value={form.state} readOnly required />
        </>
      ) : (
        <>
          <div className="profile-field">
            <label htmlFor="seller-state">{t('profile.state')}</label>
            <input
              id="seller-state"
              className="input"
              value={form.state}
              onChange={(e) => update('state', e.target.value)}
              required
              maxLength={80}
            />
          </div>
          <div className="profile-field">
            <label htmlFor="seller-city">{t('profile.city')}</label>
            <input
              id="seller-city"
              className="input"
              value={form.city}
              onChange={(e) => update('city', e.target.value)}
              required
              maxLength={80}
            />
          </div>
        </>
      )}

      <div className="profile-form__footer">
        <button type="submit" disabled={saving || uploading} className="profile-form__save">
          {saving ? t('common.saving') : t('profile.save')}
        </button>
      </div>
    </form>
  );
}
