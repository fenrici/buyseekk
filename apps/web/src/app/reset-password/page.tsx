'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { PublicHeader } from '@/components/PublicHeader';
import { PortalLoadingScreen } from '@/components/PortalLoadingScreen';
import { useT } from '@/lib/i18n';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const router = useRouter();
  const t = useT();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (!token) {
      setError(t('auth.resetPasswordInvalid'));
      return;
    }
    if (password.length < 6) {
      setError(t('auth.resetPasswordTooShort'));
      return;
    }
    if (password !== confirm) {
      setError(t('auth.resetPasswordMismatch'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      setDone(true);
      setTimeout(() => router.replace('/login'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.resetPasswordInvalid'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-portal">
      <section className="auth-portal-screen">
        <div className="portal-bg" aria-hidden="true" />
        <div className="portal-overlay" aria-hidden="true" />
        <PublicHeader activeRoute="/reset-password" />
        <div className="auth-portal-layout">
          <div className="auth-portal-center">
            <div className="auth-card portal-animate">
              <h1 className="auth-card-title">{t('auth.resetPasswordTitle')}</h1>
              {done ? (
                <p className="auth-success" role="status">{t('auth.resetPasswordSuccess')}</p>
              ) : (
                <form onSubmit={handleSubmit} className="auth-form">
                  {error && <p className="auth-error" role="alert">{error}</p>}
                  <div className="auth-field">
                    <label htmlFor="reset-password" className="auth-label">{t('auth.password')}</label>
                    <input
                      id="reset-password"
                      className="auth-input"
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="auth-field">
                    <label htmlFor="reset-confirm" className="auth-label">{t('auth.resetPasswordConfirm')}</label>
                    <input
                      id="reset-confirm"
                      className="auth-input"
                      type="password"
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" disabled={loading} className="portal-cta portal-cta-primary auth-submit">
                    {loading ? t('auth.resetPasswordSaving') : t('auth.resetPasswordSubmit')}
                  </button>
                </form>
              )}
              <p className="auth-footer-link">
                <Link href="/login">{t('auth.forgotPasswordBack')}</Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<PortalLoadingScreen />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
