'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, setToken } from '@/lib/api';
import { User } from '@/lib/types';
import { getDashboardPath } from '@/lib/auth';
import { PublicHeader } from '@/components/PublicHeader';
import { setStoredLocale, useT } from '@/lib/i18n';
import { useAuth } from '@/providers/AuthProvider';

export default function RegisterPage() {
  const router = useRouter();
  const { setSession } = useAuth();
  const t = useT();
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    role: 'BUYER',
    sellerType: 'PERSONAL',
    sellerCategory: 'AUTOS',
    country: 'AR',
    currency: 'ARS',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) {
    setForm((f) => {
      const next = { ...f, [field]: value };
      if (field === 'country' && value === 'US') next.currency = 'USD';
      if (field === 'role' && value === 'BUYER') {
        next.sellerType = 'PERSONAL';
        next.sellerCategory = 'AUTOS';
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const payload: Record<string, string> = {
        email: form.email,
        password: form.password,
        name: form.name,
        role: form.role,
        country: form.country,
        currency: form.currency,
      };
      if (form.role === 'SELLER') {
        payload.sellerType = form.sellerType;
        payload.sellerCategory = form.sellerCategory;
      }
      const res = await api<{ token: string; user: User }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setToken(res.token);
      setStoredLocale(res.user.locale);
      setSession(res.user);
      router.replace(getDashboardPath(res.user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={`auth-portal auth-portal--register${form.role === 'SELLER' ? ' auth-portal--register-seller' : ''}`}>
      <section className="auth-portal-screen">
        <div className="portal-bg" aria-hidden="true" />
        <div className="portal-overlay" aria-hidden="true" />
        <div className="portal-glow" aria-hidden="true" />

        <PublicHeader activeRoute="/register" />

        <div className="auth-portal-layout">
          <div className="auth-portal-center">
            <div className="auth-card auth-card--register portal-animate" style={{ animationDelay: '0.12s' }}>
              <h1 className="auth-card-title">{t('auth.registerTitle')}</h1>
              <p className="auth-card-subtitle">{t('auth.registerPageSubtitle')}</p>

              <form onSubmit={handleSubmit} className="auth-form auth-form--register">
                {error && <p className="auth-error" role="alert">{error}</p>}
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
                <div className="auth-field" role="group" aria-labelledby="register-role-label">
                  <span id="register-role-label" className="auth-label">
                    {t('auth.role')}
                  </span>
                  <div className="auth-option-row">
                    <button
                      type="button"
                      className={`auth-option-btn ${form.role === 'BUYER' ? 'active' : ''}`}
                      aria-pressed={form.role === 'BUYER'}
                      onClick={() => update('role', 'BUYER')}
                    >
                      {t('auth.roleBuyer')}
                    </button>
                    <button
                      type="button"
                      className={`auth-option-btn ${form.role === 'SELLER' ? 'active' : ''}`}
                      aria-pressed={form.role === 'SELLER'}
                      onClick={() => update('role', 'SELLER')}
                    >
                      {t('auth.roleSeller')}
                    </button>
                  </div>
                </div>
                {form.role === 'SELLER' && (
                  <div className="auth-seller-panel">
                    <div className="auth-seller-row">
                      <span className="auth-seller-row-label">{t('auth.sellerType')}</span>
                      <div className="auth-option-row auth-option-row--compact">
                        <button
                          type="button"
                          className={`auth-option-btn ${form.sellerType === 'PERSONAL' ? 'active' : ''}`}
                          onClick={() => update('sellerType', 'PERSONAL')}
                        >
                          {t('auth.sellerTypePersonal')}
                        </button>
                        <button
                          type="button"
                          className={`auth-option-btn ${form.sellerType === 'BUSINESS' ? 'active' : ''}`}
                          onClick={() => update('sellerType', 'BUSINESS')}
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
                          className={`auth-option-btn ${form.sellerCategory === 'AUTOS' ? 'active' : ''}`}
                          onClick={() => update('sellerCategory', 'AUTOS')}
                        >
                          {t('seller.autos')}
                        </button>
                        <button
                          type="button"
                          className={`auth-option-btn ${form.sellerCategory === 'INMOBILIARIA' ? 'active' : ''}`}
                          onClick={() => update('sellerCategory', 'INMOBILIARIA')}
                        >
                          {t('seller.realEstate')}
                        </button>
                      </div>
                    </div>
                    <p className="auth-seller-hint">{t('auth.sellerCategoryHint')}</p>
                  </div>
                )}
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
                </div>
                <button type="submit" disabled={loading} className="portal-cta portal-cta-primary auth-submit">
                  {loading ? t('auth.creating') : t('nav.register')}
                </button>
              </form>

              <p className="auth-footer-link auth-footer-link--register">
                {t('auth.hasAccount')}{' '}
                <Link href="/login">{t('auth.enter')}</Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
