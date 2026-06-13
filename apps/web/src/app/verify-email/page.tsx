'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { PublicHeader } from '@/components/PublicHeader';
import { PortalLoadingScreen } from '@/components/PortalLoadingScreen';
import { useT } from '@/lib/i18n';
import { useAuth } from '@/providers/AuthProvider';

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const t = useT();
  const { setSession } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage(t('auth.verifyEmailInvalid'));
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await api<{ user: Parameters<typeof setSession>[0] }>('/auth/verify-email', {
          method: 'POST',
          body: JSON.stringify({ token }),
        });
        if (cancelled) return;
        setSession(res.user);
        setStatus('success');
        setMessage(t('auth.verifyEmailSuccess'));
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        setMessage(err instanceof Error ? err.message : t('auth.verifyEmailInvalid'));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, setSession, t]);

  return (
    <main className="auth-portal">
      <section className="auth-portal-screen">
        <div className="portal-bg" aria-hidden="true" />
        <div className="portal-overlay" aria-hidden="true" />
        <PublicHeader activeRoute="/verify-email" />
        <div className="auth-portal-layout">
          <div className="auth-portal-center">
            <div className="auth-card portal-animate">
              <h1 className="auth-card-title">{t('auth.verifyEmailTitle')}</h1>
              {status === 'loading' && <p>{t('auth.verifyEmailLoading')}</p>}
              {status !== 'loading' && (
                <p className={status === 'error' ? 'auth-error' : 'auth-success'} role="alert">
                  {message}
                </p>
              )}
              <p className="auth-footer-link">
                <Link href="/login">{t('auth.enter')}</Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<PortalLoadingScreen />}>
      <VerifyEmailForm />
    </Suspense>
  );
}
