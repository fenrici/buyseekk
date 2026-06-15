'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, getToken, setAuthTokens } from '@/lib/api';
import { User } from '@/lib/types';
import { getPostLoginPath } from '@/lib/auth';
import { PortalLoadingScreen } from '@/components/PortalLoadingScreen';
import { PublicHeader } from '@/components/PublicHeader';
import { setStoredLocale, useT } from '@/lib/i18n';
import { useGuestOnlyRoute } from '@/hooks/useGuestOnlyRoute';
import { useAuth } from '@/providers/AuthProvider';

const DEMOS = {
  buyer: { email: 'comprador@buyseekk.com', password: 'demo1234' },
  seller: { email: 'vendedor@buyseekk.com', password: 'demo1234' },
};

function LoginForm() {
  const router = useRouter();
  const { setSession } = useAuth();
  const { ready: guestReady } = useGuestOnlyRoute();
  const searchParams = useSearchParams();
  const roleHint = searchParams.get('role');
  const t = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (roleHint === 'seller') {
      setEmail(DEMOS.seller.email);
      setPassword(DEMOS.seller.password);
    } else if (roleHint === 'buyer') {
      setEmail(DEMOS.buyer.email);
      setPassword(DEMOS.buyer.password);
    }
  }, [roleHint]);

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
    <main className="auth-portal">
      <section className="auth-portal-screen">
        <div className="portal-bg" aria-hidden="true" />
        <div className="portal-overlay" aria-hidden="true" />
        <div className="portal-glow" aria-hidden="true" />

        <PublicHeader activeRoute="/login" />

        <div className="auth-portal-layout">
          <div className="auth-portal-center">
            <div className="auth-card portal-animate" style={{ animationDelay: '0.12s' }}>
            <p className="auth-card-subtitle">{t('auth.loginPageSubtitle')}</p>

            {(roleHint === 'buyer' || roleHint === 'seller') && (
              <p className="auth-role-hint">
                {roleHint === 'seller' ? t('auth.loginSellerHint') : t('auth.loginBuyerHint')}
              </p>
            )}

            <div className="auth-demo-grid">
              <button type="button" onClick={() => fillDemo('buyer')} className="auth-demo-btn auth-demo-btn--buyer">
                <span className="auth-demo-label">{t('nav.buyer')}</span>
                <span className="auth-demo-name">Carlos M.</span>
              </button>
              <button type="button" onClick={() => fillDemo('seller')} className="auth-demo-btn auth-demo-btn--seller">
                <span className="auth-demo-label">{t('nav.seller')}</span>
                <span className="auth-demo-name">Luxury Motors</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              {error && <p className="auth-error" role="alert">{error}</p>}
              <div className="auth-field">
                <label htmlFor="login-email" className="auth-label">
                  {t('auth.email')}
                </label>
                <input
                  id="login-email"
                  className="auth-input"
                  type="email"
                  autoComplete="email"
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

            <p className="auth-demo-hint">{t('auth.demoPassword')}</p>
            <p className="auth-footer-link">
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

function LoginFallback() {
  return <PortalLoadingScreen />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
