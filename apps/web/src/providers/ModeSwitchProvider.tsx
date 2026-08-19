'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useRouter } from 'next/navigation';
import { hasPendingSellerOnboarding } from '@buyseekk/shared';
import { SplashVisual } from '@/components/SplashScreen';
import { SellerOnboardingModal } from '@/components/SellerOnboardingModal';
import { api } from '@/lib/api';
import { getDashboardPathForMode, hasSellerProfile, type UserMode } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { User } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';

type ModeSwitchContextValue = {
  switching: boolean;
  switchMode: (target: UserMode) => void;
};

const ModeSwitchContext = createContext<ModeSwitchContextValue | null>(null);

const MIN_TRANSITION_MS = 500;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function ModeSwitchProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const t = useT();
  const { user, setSession } = useAuth();
  const [switching, setSwitching] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingRequired, setOnboardingRequired] = useState(false);
  const promptedSellerOnboardingRef = useRef<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const busyRef = useRef(false);

  const showToast = useCallback((type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => {
    if (!user) return;
    if (!hasPendingSellerOnboarding(user)) return;
    if (promptedSellerOnboardingRef.current === user.id) return;
    promptedSellerOnboardingRef.current = user.id;
    setOnboardingRequired(true);
    setOnboardingOpen(true);
  }, [user]);

  // Transición visual a pantalla completa: splash → backend → refresca user → redirige.
  const runTransition = useCallback(
    async (target: UserMode, updatedUser?: User) => {
      setSwitching(true);
      const started = Date.now();
      try {
        const next =
          updatedUser ??
          (await api<User>('/users/me/active-mode', {
            method: 'PATCH',
            body: JSON.stringify({ activeMode: target }),
          }));
        flushSync(() => {
          setSession(next);
        });
        const elapsed = Date.now() - started;
        if (elapsed < MIN_TRANSITION_MS) await sleep(MIN_TRANSITION_MS - elapsed);
        router.replace(getDashboardPathForMode(next.activeMode));
        await sleep(150);
        setSwitching(false);
        showToast(
          'success',
          target === 'SELLER' ? t('settings.modeSellerActivated') : t('settings.modeBuyerActivated'),
        );
      } catch {
        setSwitching(false);
        showToast('error', t('settings.modeError'));
      } finally {
        busyRef.current = false;
      }
    },
    [router, setSession, showToast, t],
  );

  const switchMode = useCallback(
    (target: UserMode) => {
      if (busyRef.current || switching) return;
      if (!user) return;
      if (user.activeMode === target) return;

      busyRef.current = true;

      if (target === 'SELLER' && !hasSellerProfile(user)) {
        busyRef.current = false;
        setOnboardingRequired(false);
        setOnboardingOpen(true);
        return;
      }

      void runTransition(target);
    },
    [runTransition, switching, user],
  );

  const handleOnboardingComplete = useCallback(
    (updated: User) => {
      setOnboardingOpen(false);
      setOnboardingRequired(false);
      void runTransition('SELLER', updated);
    },
    [runTransition],
  );

  const handleOnboardingCancel = useCallback(() => {
    setOnboardingOpen(false);
    setOnboardingRequired(false);
  }, []);

  const value = useMemo(() => ({ switching, switchMode }), [switching, switchMode]);

  return (
    <ModeSwitchContext.Provider value={value}>
      {children}
      <SellerOnboardingModal
        open={onboardingOpen}
        required={onboardingRequired}
        onCancel={handleOnboardingCancel}
        onComplete={handleOnboardingComplete}
      />
      {switching && <SplashVisual />}
      {toast && (
        <div className={`mode-toast mode-toast--${toast.type}`} role="status" aria-live="polite">
          {toast.text}
        </div>
      )}
    </ModeSwitchContext.Provider>
  );
}

export function useModeSwitch() {
  const ctx = useContext(ModeSwitchContext);
  if (!ctx) throw new Error('useModeSwitch must be used within ModeSwitchProvider');
  return ctx;
}
