'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { PublicHeader } from '@/components/PublicHeader';
import { useT } from '@/lib/i18n';

export default function ForgotPasswordPage() {
  const t = useT();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      await api('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-portal">
      <section className="auth-portal-screen">
        <div className="portal-bg" aria-hidden="true" />
        <div className="portal-overlay" aria-hidden="true" />
        <PublicHeader activeRoute="/forgot-password" />
        <div className="auth-portal-layout">
          <div className="auth-portal-center">
            <div className="auth-card portal-animate">
              <h1 className="auth-card-title">{t('auth.forgotPasswordTitle')}</h1>
              <p className="auth-card-subtitle">{t('auth.forgotPasswordSubtitle')}</p>
              {sent ? (
                <p className="auth-success" role="status">{t('auth.forgotPasswordSent')}</p>
              ) : (
                <form onSubmit={handleSubmit} className="auth-form">
                  {error && <p className="auth-error" role="alert">{error}</p>}
                  <div className="auth-field">
                    <label htmlFor="forgot-email" className="auth-label">{t('auth.email')}</label>
                    <input
                      id="forgot-email"
                      className="auth-input"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" disabled={loading} className="portal-cta portal-cta-primary auth-submit">
                    {loading ? t('auth.forgotPasswordSending') : t('auth.forgotPasswordSubmit')}
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
