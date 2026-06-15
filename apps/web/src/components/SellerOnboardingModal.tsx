'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useT } from '@/lib/i18n';
import { User } from '@/lib/types';

type SellerType = 'PERSONAL' | 'BUSINESS';
type SellerCategory = 'AUTOS' | 'INMOBILIARIA';

type Props = {
  open: boolean;
  required?: boolean;
  onCancel: () => void;
  onComplete: (user: User) => void;
};

export function SellerOnboardingModal({ open, required, onCancel, onComplete }: Props) {
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
      <div className="mode-onboarding-card mode-onboarding-card--register">
        <h2 className="mode-onboarding-title">{t('sellerOnboarding.title')}</h2>

        {error && <p className="auth-error" role="alert">{error}</p>}

        <div className="mode-onboarding-field">
          <p className="mode-onboarding-question">{t('auth.sellerType')}</p>
          <div className="auth-option-row auth-option-row--compact" role="radiogroup" aria-label={t('auth.sellerType')}>
            <button
              type="button"
              role="radio"
              aria-checked={sellerType === 'PERSONAL'}
              className={`auth-option-btn ${sellerType === 'PERSONAL' ? 'active' : ''}`}
              onClick={() => setSellerType('PERSONAL')}
            >
              {t('auth.sellerTypePersonal')}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={sellerType === 'BUSINESS'}
              className={`auth-option-btn ${sellerType === 'BUSINESS' ? 'active' : ''}`}
              onClick={() => setSellerType('BUSINESS')}
            >
              {t('auth.sellerTypeBusiness')}
            </button>
          </div>
        </div>

        <div className="mode-onboarding-field">
          <p className="mode-onboarding-question">{t('auth.sellerCategory')}</p>
          <div className="auth-option-row auth-option-row--compact" role="radiogroup" aria-label={t('auth.sellerCategory')}>
            <button
              type="button"
              role="radio"
              aria-checked={sellerCategory === 'AUTOS'}
              className={`auth-option-btn ${sellerCategory === 'AUTOS' ? 'active' : ''}`}
              onClick={() => setSellerCategory('AUTOS')}
            >
              {t('seller.autos')}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={sellerCategory === 'INMOBILIARIA'}
              className={`auth-option-btn ${sellerCategory === 'INMOBILIARIA' ? 'active' : ''}`}
              onClick={() => setSellerCategory('INMOBILIARIA')}
            >
              {t('seller.realEstate')}
            </button>
          </div>
        </div>

        <div className="mode-onboarding-actions">
          {!required && (
            <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>
              {t('sellerOnboarding.cancel')}
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving ? t('sellerOnboarding.saving') : t('sellerOnboarding.submit')}
          </button>
        </div>
      </div>
    </div>
  );
}
