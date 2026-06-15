'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, getToken, setAuthTokens } from '@/lib/api';
import { User } from '@/lib/types';
import { getPostLoginPath } from '@/lib/auth';
import { PortalLoadingScreen } from '@/components/PortalLoadingScreen';
import { PublicHeader } from '@/components/PublicHeader';
import { setStoredLocale, useT } from '@/lib/i18n';
import { useGuestOnlyRoute } from '@/hooks/useGuestOnlyRoute';
import { useAuth } from '@/providers/AuthProvider';

const DEMO_ENABLED = process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === 'true';

const DEMOS = {
  buyer: {
    email: 'comprador.us@buyseekk.com',
    password: 'demo1234',
    name: 'James R.',
    hint: 'US buyer',
  },
  seller: {
    email: 'vendedor@buyseekk.com',
    password: 'demo1234',
    name: 'Luxury Motors',
    hint: 'US seller',
  },
} as const;

function BuyerDemoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" strokeLinecap="round" />
    </svg>
  );
}

function SellerDemoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M3 9l9-5 9 5v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9z" strokeLinejoin="round" />
      <path d="M9 21V12h6v9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const { setSession } = useAuth();
  const { ready: guestReady } = useGuestOnlyRoute();
  const t = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function fillDemo(type: 'buyer' | 'seller') {
    setEmail(DEMOS[type].email);
    setPassword(DEMOS[type].password);
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await api<{ token: string; refreshToken: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setAuthTokens(res.token, res.refreshToken);
      setStoredLocale(res.user.locale);
      setSession(res.user);
      router.replace(getPostLoginPath(res.user));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  if (!guestReady) {
    return <PortalLoadingScreen />;
  }

  return (
    <main className="auth-portal auth-portal--login">
      <section className="auth-portal-screen">
        <div className="portal-bg" aria-hidden="true" />
        <div className="portal-overlay" aria-hidden="true" />
        <div className="portal-glow portal-glow--subtle" aria-hidden="true" />

        <PublicHeader activeRoute="/login" />

        <div className="auth-portal-layout">
          <div className="auth-portal-center">
            <div className="auth-card auth-card--login portal-animate" style={{ animationDelay: '0.08s' }}>
              <div className="auth-login-brand" aria-hidden>
                <span className="auth-login-brand__mark">B</span>
              </div>

              <h1 className="auth-card-title">{t('auth.loginPageTitle')}</h1>
              <p className="auth-card-subtitle auth-card-subtitle--login">{t('auth.loginPageSubtitle')}</p>

              {DEMO_ENABLED && (
                <section className="auth-login-demo" aria-label={t('auth.loginDefaultHint')}>
                  <div className="auth-login-demo__head">
                    <p className="auth-login-demo__label">{t('auth.loginDefaultHint')}</p>
                    <span className="auth-login-demo__badge">{t('auth.loginDemoBadge')}</span>
                  </div>

                  <div className="auth-login-demo-grid">
                    <button
                      type="button"
                      onClick={() => fillDemo('buyer')}
                      className="auth-login-demo-card auth-login-demo-card--buyer"
                    >
                      <span className="auth-login-demo-card__icon">
                        <BuyerDemoIcon />
                      </span>
                      <span className="auth-login-demo-card__body">
                        <span className="auth-login-demo-card__role">{t('nav.buyer')}</span>
                        <span className="auth-login-demo-card__name">{DEMOS.buyer.name}</span>
                        <span className="auth-login-demo-card__hint">{DEMOS.buyer.hint}</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fillDemo('seller')}
                      className="auth-login-demo-card auth-login-demo-card--seller"
                    >
                      <span className="auth-login-demo-card__icon">
                        <SellerDemoIcon />
                      </span>
                      <span className="auth-login-demo-card__body">
                        <span className="auth-login-demo-card__role">{t('nav.seller')}</span>
                        <span className="auth-login-demo-card__name">{DEMOS.seller.name}</span>
                        <span className="auth-login-demo-card__hint">{DEMOS.seller.hint}</span>
                      </span>
                    </button>
                  </div>
                </section>
              )}

              {DEMO_ENABLED && (
                <div className="auth-login-divider" aria-hidden>
                  <span>{t('auth.loginOrEmail')}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="auth-form auth-form--login">
                {error && (
                  <p className="auth-error" role="alert">
                    {error}
                  </p>
                )}
                <div className="auth-field">
                  <label htmlFor="login-email" className="auth-label">
                    {t('auth.email')}
                  </label>
                  <input
                    id="login-email"
                    className="auth-input"
                    type="email"
                    autoComplete="email"
                    placeholder={t('auth.emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="auth-field">
                  <label htmlFor="login-password" className="auth-label">
                    {t('auth.password')}
                  </label>
                  <input
                    id="login-password"
                    className="auth-input"
                    type="password"
                    autoComplete="current-password"
                    placeholder={t('auth.passwordPlaceholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" disabled={loading} className="portal-cta portal-cta-primary auth-submit">
                  {loading ? t('auth.entering') : t('auth.enter')}
                </button>
                <p className="auth-forgot-link">
                  <Link href="/forgot-password">{t('auth.forgotPasswordLink')}</Link>
                </p>
              </form>

              <p className="auth-footer-link auth-footer-link--login">
                {t('auth.noAccount')}{' '}
                <Link href="/register">{t('auth.signup')}</Link>
              </p>
              {getToken() && <p className="auth-session-note">{t('auth.sessionReplace')}</p>}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return <LoginForm />;
}
