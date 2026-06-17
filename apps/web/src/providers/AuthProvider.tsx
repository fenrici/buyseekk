'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, clearToken, getToken } from '@/lib/api';
import { setStoredLocale } from '@/lib/i18n';
import { User } from '@/lib/types';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  refresh: (opts?: { silent?: boolean }) => Promise<void>;
  setSession: (user: User) => void;
  clearSession: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const setSession = useCallback((nextUser: User) => {
    setUser(nextUser);
    setLoading(false);
  }, []);

  const clearSession = useCallback(() => {
    clearToken();
    setUser(null);
    setLoading(false);
  }, []);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    if (!opts?.silent) setLoading(true);
    try {
      const me = await api<User>('/auth/me');
      setUser(me);
      setStoredLocale(me.locale);
    } catch {
      // Solo cerrar sesión si los tokens fueron invalidados (p. ej. refresh falló en api()).
      if (!getToken()) {
        setUser(null);
      }
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && getToken()) {
        void refresh({ silent: true });
      }
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted && getToken()) {
        void refresh({ silent: true });
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [refresh]);

  const value = useMemo(
    () => ({ user, loading, refresh, setSession, clearSession }),
    [user, loading, refresh, setSession, clearSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
