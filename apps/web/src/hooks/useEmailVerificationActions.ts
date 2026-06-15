'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useT } from '@/lib/i18n';
import type { User } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';

type ToastState = { type: 'success' | 'info'; text: string } | null;

export function useEmailVerificationActions() {
  const { setSession } = useAuth();
  const t = useT();
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

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
        showToast('success', t('auth.verifyEmailSuccess'));
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

  return {
    checking,
    resending,
    toast,
    handleVerify,
    handleResend,
    clearToast: () => setToast(null),
  };
}
