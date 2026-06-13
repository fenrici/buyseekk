'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useT } from '@/lib/i18n';
import { User } from '@/lib/types';

type SellerType = 'PERSONAL' | 'BUSINESS';
type SellerCategory = 'AUTOS' | 'INMOBILIARIA';

type Props = {
  open: boolean;
  onCancel: () => void;
  onComplete: (user: User) => void;
};

export function SellerOnboardingModal({ open, onCancel, onComplete }: Props) {
  const t = useT();
  const [sellerType, setSellerType] = useState<SellerType>('PERSONAL');
  const [sellerCategory, setSellerCategory] = useState<SellerCategory>('AUTOS');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  async function submit() {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      const updated = await api<User>('/users/me/seller-profile', {
        method: 'POST',
        body: JSON.stringify({ sellerType, sellerCategory }),
      });
      onComplete(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('sellerOnboarding.error'));
      setSaving(false);
    }
  }

  return (
    <div className="mode-onboarding-backdrop" role="dialog" aria-modal="true" aria-label={t('sellerOnboarding.title')}>
      <div className="mode-onboarding-card">
        <h2 className="mode-onboarding-title">{t('sellerOnboarding.title')}</h2>
        <p className="mode-onboarding-subtitle">{t('sellerOnboarding.subtitle')}</p>

        {error && <p className="auth-error" role="alert">{error}</p>}

        <div className="auth-seller-row">
          <span className="auth-seller-row-label">{t('auth.sellerType')}</span>
          <div className="auth-option-row auth-option-row--compact">
            <button
              type="button"
              className={`auth-option-btn ${sellerType === 'PERSONAL' ? 'active' : ''}`}
              onClick={() => setSellerType('PERSONAL')}
            >
              {t('auth.sellerTypePersonal')}
            </button>
            <button
              type="button"
              className={`auth-option-btn ${sellerType === 'BUSINESS' ? 'active' : ''}`}
              onClick={() => setSellerType('BUSINESS')}
            >
              {t('auth.sellerTypeBusiness')}
            </button>
          </div>
        </div>

        <div className="auth-seller-row">
          <span className="auth-seller-row-label">{t('auth.sellerCategory')}</span>
          <div className="auth-option-row auth-option-row--compact">
            <button
              type="button"
              className={`auth-option-btn ${sellerCategory === 'AUTOS' ? 'active' : ''}`}
              onClick={() => setSellerCategory('AUTOS')}
            >
              {t('seller.autos')}
            </button>
            <button
              type="button"
              className={`auth-option-btn ${sellerCategory === 'INMOBILIARIA' ? 'active' : ''}`}
              onClick={() => setSellerCategory('INMOBILIARIA')}
            >
              {t('seller.realEstate')}
            </button>
          </div>
        </div>
        <p className="auth-seller-hint">{t('auth.sellerCategoryHint')}</p>

        <div className="mode-onboarding-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>
            {t('sellerOnboarding.cancel')}
          </button>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving ? t('sellerOnboarding.saving') : t('sellerOnboarding.submit')}
          </button>
        </div>
      </div>
    </div>
  );
}
