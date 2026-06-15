'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, setAuthTokens } from '@/lib/api';
import { User } from '@/lib/types';
import { getDashboardPathForMode, hasSellerProfile } from '@/lib/auth';
import { PublicHeader } from '@/components/PublicHeader';
import { SellerOnboardingModal } from '@/components/SellerOnboardingModal';
import { setStoredLocale, useT } from '@/lib/i18n';
import { useAuth } from '@/providers/AuthProvider';
import {
  getDefaultRegisterCountry,
  getDefaultRegisterCurrency,
  showCountrySelectors,
  showCurrencySelectors,
} from '@/lib/launch-country';

type Step = 'account' | 'role';

export default function RegisterPage() {
  const router = useRouter();
  const { setSession } = useAuth();
  const t = useT();
  const [step, setStep] = useState<Step>('account');
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    role: 'BUYER' as 'BUYER' | 'SELLER',
    country: getDefaultRegisterCountry(),
    currency: getDefaultRegisterCurrency(),
    acceptedTerms: false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sellerOnboarding, setSellerOnboarding] = useState(false);

  function goToRoleStep() {
    if (!form.name.trim() || !form.email.trim() || form.password.length < 6) {
      setError(t('common.error'));
      return;
    }
    setError('');
    setStep('role');
  }

  function update(field: string, value: string | boolean) {
    setForm((f) => {
      const next = { ...f, [field]: value };
      if (field === 'country' && value === 'US') next.currency = 'USD';
      return next;
    });
  }

  function finishRegistration(user: User) {
    if (form.role === 'SELLER' && !hasSellerProfile(user)) {
      setSellerOnboarding(true);
      return;
    }
    router.replace(getDashboardPathForMode(user.activeMode));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await api<{ token: string; refreshToken: string; user: User }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          name: form.name,
          role: form.role,
          country: getDefaultRegisterCountry(),
          currency: getDefaultRegisterCurrency(),
          acceptedTerms: form.acceptedTerms,
        }),
      });
      setAuthTokens(res.token, res.refreshToken);
      setStoredLocale(res.user.locale);
      setSession(res.user);
      finishRegistration(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  function handleOnboardingComplete(user: User) {
    setSession(user);
    setSellerOnboarding(false);
    router.replace(getDashboardPathForMode(user.activeMode));
  }

  return (
    <main className="auth-portal auth-portal--register">
      <section className="auth-portal-screen">
        <div className="portal-bg" aria-hidden="true" />
        <div className="portal-overlay" aria-hidden="true" />
        <div className="portal-glow" aria-hidden="true" />

        <PublicHeader activeRoute="/register" />

        <div className="auth-portal-layout">
          <div className="auth-portal-center">
            <div
              className={`auth-card auth-card--register portal-animate${step === 'role' ? ' auth-card--role-step' : ''}`}
              style={{ animationDelay: '0.12s' }}
            >
              <h1 className="auth-card-title">{t('auth.registerTitle')}</h1>
              <p className="auth-card-subtitle">{t('auth.registerPageSubtitle')}</p>

              <form onSubmit={handleSubmit} className="auth-form auth-form--register">
                {error && <p className="auth-error" role="alert">{error}</p>}

                {step === 'account' && (
                  <>
                    <div className="auth-field">
                      <label htmlFor="register-name" className="auth-label">
                        {t('auth.name')}
                      </label>
                      <input
                        id="register-name"
                        className="auth-input"
                        value={form.name}
                        onChange={(e) => update('name', e.target.value)}
                        placeholder={t('auth.namePlaceholder')}
                        autoComplete="name"
                        required
                      />
                    </div>
                    <div className="auth-field">
                      <label htmlFor="register-email" className="auth-label">
                        {t('auth.email')}
                      </label>
                      <input
                        id="register-email"
                        className="auth-input"
                        type="email"
                        value={form.email}
                        onChange={(e) => update('email', e.target.value)}
                        placeholder={t('auth.emailPlaceholder')}
                        autoComplete="email"
                        required
                      />
                    </div>
                    <div className="auth-field">
                      <label htmlFor="register-password" className="auth-label">
                        {t('auth.password')}
                      </label>
                      <input
                        id="register-password"
                        className="auth-input"
                        type="password"
                        value={form.password}
                        onChange={(e) => update('password', e.target.value)}
                        placeholder={t('auth.passwordPlaceholder')}
                        autoComplete="new-password"
                        minLength={6}
                        required
                      />
                    </div>
                    {showCountrySelectors() && (
                      <div className="auth-field-grid auth-field-grid--register">
                        <div className="auth-field">
                          <label htmlFor="register-country" className="auth-label">
                            {t('auth.country')}
                          </label>
                          <select
                            id="register-country"
                            className="auth-input auth-select"
                            value={form.country}
                            onChange={(e) => update('country', e.target.value)}
                          >
                            <option value="AR">{t('auth.countryAR')}</option>
                            <option value="US">{t('auth.countryUS')}</option>
                          </select>
                        </div>
                        {showCurrencySelectors() && (
                          <div className="auth-field">
                            <label htmlFor="register-currency" className="auth-label">
                              {t('auth.currency')}
                            </label>
                            <select
                              id="register-currency"
                              className="auth-input auth-select"
                              value={form.currency}
                              onChange={(e) => update('currency', e.target.value)}
                            >
                              <option value="ARS">ARS</option>
                              <option value="USD">USD</option>
                            </select>
                          </div>
                        )}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={goToRoleStep}
                      className="portal-cta portal-cta-primary auth-submit"
                    >
                      {t('auth.stepContinue')}
                    </button>
                  </>
                )}

                {step === 'role' && (
                  <>
                    <div className="auth-role-step">
                      <h2 className="auth-role-step-title">{t('auth.roleStepTitle')}</h2>
                      <p className="auth-role-step-subtitle">{t('auth.roleStepSubtitle')}</p>
                    </div>

                    <div className="auth-role-cards" role="group" aria-label={t('auth.role')}>
                      <button
                        type="button"
                        className={`auth-role-card ${form.role === 'BUYER' ? 'active' : ''}`}
                        aria-pressed={form.role === 'BUYER'}
                        onClick={() => update('role', 'BUYER')}
                      >
                        <span className="auth-role-card-title">{t('auth.roleBuyerOption')}</span>
                        <span className="auth-role-card-desc">{t('auth.roleBuyerOptionDesc')}</span>
                      </button>
                      <button
                        type="button"
                        className={`auth-role-card ${form.role === 'SELLER' ? 'active' : ''}`}
                        aria-pressed={form.role === 'SELLER'}
                        onClick={() => update('role', 'SELLER')}
                      >
                        <span className="auth-role-card-title">{t('auth.roleSellerOption')}</span>
                        <span className="auth-role-card-desc">{t('auth.roleSellerOptionDesc')}</span>
                      </button>
                    </div>

                    <div className="auth-step-actions">
                      <label className="auth-terms">
                        <input
                          type="checkbox"
                          checked={form.acceptedTerms}
                          onChange={(e) => update('acceptedTerms', e.target.checked)}
                          required
                        />
                        <span>
                          {t('auth.acceptTerms')}{' '}
                          <Link href="/terms" target="_blank" rel="noopener noreferrer">
                            {t('auth.termsLink')}
                          </Link>{' '}
                          {t('auth.acceptTermsAnd')}{' '}
                          <Link href="/privacy" target="_blank" rel="noopener noreferrer">
                            {t('auth.privacyLink')}
                          </Link>
                          .
                        </span>
                      </label>
                      <div className="auth-step-actions__row">
                        <button
                          type="button"
                          onClick={() => {
                            setError('');
                            setStep('account');
                          }}
                          className="portal-cta portal-cta-secondary"
                        >
                          {t('auth.stepBack')}
                        </button>
                        <button
                          type="submit"
                          disabled={loading || !form.acceptedTerms}
                          className="portal-cta portal-cta-primary"
                        >
                          {loading ? t('auth.creating') : t('nav.register')}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </form>

              <p className="auth-footer-link auth-footer-link--register">
                {t('auth.hasAccount')}{' '}
                <Link href="/login">{t('auth.enter')}</Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      <SellerOnboardingModal
        open={sellerOnboarding}
        required
        onCancel={() => setSellerOnboarding(false)}
        onComplete={handleOnboardingComplete}
      />
    </main>
  );
}
