'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useT } from '@/lib/i18n';
import { User } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';

type Placement = 'desktop' | 'mobile';

type ToastState = { type: 'success' | 'info'; text: string } | null;

function MailIcon() {
  return (
    <svg
      className="email-verify-card__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

function Spinner() {
  return <span className="email-verify-card__spinner" aria-hidden="true" />;
}

export function EmailVerificationBanner({ placement }: { placement: Placement }) {
  const { user, setSession } = useAuth();
  const t = useT();
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  if (!user || user.emailVerified) return null;

  function showToast(type: 'success' | 'info', text: string) {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 2800);
  }

  async function handleVerify() {
    if (checking || resending) return;
    setChecking(true);
    setToast(null);
    try {
      const me = await api<User>('/auth/me');
      if (me.emailVerified) {
        setSession(me);
        return;
      }
      showToast('info', t('auth.verifyEmailNotYet'));
    } catch (err) {
      showToast('info', err instanceof Error ? err.message : t('common.error'));
    } finally {
      setChecking(false);
    }
  }

  async function handleResend() {
    if (checking || resending) return;
    setResending(true);
    setToast(null);
    try {
      await api('/auth/resend-verification', { method: 'POST' });
      showToast('success', t('auth.verifyEmailResent'));
    } catch (err) {
      showToast('info', err instanceof Error ? err.message : t('common.error'));
    } finally {
      setResending(false);
    }
  }

  return (
    <>
      <div
        className={`email-verify-card-wrap email-verify-card-wrap--${placement}`}
        role="status"
        aria-live="polite"
      >
        <div className="email-verify-card">
          <div className="email-verify-card__main">
            <MailIcon />
            <p className="email-verify-card__text">{t('auth.verifyEmailBanner')}</p>
          </div>
          <div className="email-verify-card__actions">
            <button
              type="button"
              className="email-verify-card__btn email-verify-card__btn--ghost"
              onClick={handleResend}
              disabled={checking || resending}
            >
              {resending ? t('auth.verifyEmailSending') : t('auth.verifyEmailResendShort')}
            </button>
            <button
              type="button"
              className="email-verify-card__btn email-verify-card__btn--primary"
              onClick={handleVerify}
              disabled={checking || resending}
            >
              {checking ? (
                <>
                  <Spinner />
                  {t('auth.verifyEmailChecking')}
                </>
              ) : (
                t('auth.verifyEmailPrimary')
              )}
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <div
          className={`email-verify-toast email-verify-toast--${toast.type}`}
          role="status"
          aria-live="polite"
        >
          {toast.text}
        </div>
      )}
    </>
  );
}
