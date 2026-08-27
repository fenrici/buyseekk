import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  fetchMe,
  loginMobile,
  logoutMobile,
  registerMobile,
  type MobileLoginBody,
  type MobileRegisterBody,
} from '@/lib/api/auth-api';
import {
  applyAccessToken,
  clearAccessToken,
  getAccessToken,
  setApiRefreshRunner,
} from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { getMobileClientType } from '@/lib/auth/client-type';
import {
  bumpSessionGeneration,
  coordinatedRefresh,
  persistAuthRefreshToken,
} from '@/lib/auth/session-refresh';
import { clearRefreshToken, getRefreshToken } from '@/lib/auth/secure-session';
import type { AuthStatus, AuthUser } from '@/lib/auth/types';

export const ME_QUERY_KEY = ['auth', 'me'] as const;

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  /** Transient restore error that did not destroy the session (network/5xx). */
  restoreError: string | null;
  login: (input: { email: string; password: string }) => Promise<void>;
  register: (
    input: Omit<MobileRegisterBody, 'clientType' | 'acceptedTerms'> & {
      acceptedTerms: boolean;
    },
  ) => Promise<void>;
  logout: () => Promise<void>;
  retryRestore: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('booting');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const userRef = useRef<AuthUser | null>(null);

  const syncUser = useCallback(
    (next: AuthUser | null) => {
      userRef.current = next;
      setUser(next);
      if (next) {
        queryClient.setQueryData(ME_QUERY_KEY, next);
      }
    },
    [queryClient],
  );

  const clearLocalSession = useCallback(async () => {
    clearAccessToken();
    await clearRefreshToken();
    syncUser(null);
    queryClient.clear();
    setRestoreError(null);
    setStatus('unauthenticated');
  }, [queryClient, syncUser]);

  /**
   * Applies a coordinated refresh outcome to React state.
   * Returns access token for the API interceptor, or null.
   */
  const applyRefreshOutcome = useCallback(
    async (forInterceptor: boolean): Promise<string | null> => {
      const outcome = await coordinatedRefresh();

      switch (outcome.kind) {
        case 'ok': {
          applyAccessToken(outcome.accessToken);
          syncUser(outcome.user);
          setStatus('authenticated');
          setRestoreError(null);
          return outcome.accessToken;
        }
        case 'invalid':
        case 'empty': {
          clearAccessToken();
          await clearRefreshToken();
          syncUser(null);
          queryClient.clear();
          setStatus('unauthenticated');
          setRestoreError(null);
          return null;
        }
        case 'persist_failed': {
          clearAccessToken();
          syncUser(null);
          queryClient.clear();
          setStatus('unauthenticated');
          setRestoreError(outcome.error.message);
          return null;
        }
        case 'aborted': {
          // Logout/login superseded this refresh — leave whatever state they set.
          return forInterceptor ? getAccessToken() : null;
        }
        case 'network': {
          if (!forInterceptor) {
            clearAccessToken();
            syncUser(null);
            setStatus('unauthenticated');
            setRestoreError(outcome.error.message);
          }
          throw outcome.error;
        }
        default:
          return null;
      }
    },
    [queryClient, syncUser],
  );

  const refreshForInterceptor = useCallback(async (): Promise<string | null> => {
    try {
      return await applyRefreshOutcome(true);
    } catch {
      return null;
    }
  }, [applyRefreshOutcome]);

  useEffect(() => {
    setApiRefreshRunner(refreshForInterceptor);
    return () => setApiRefreshRunner(null);
  }, [refreshForInterceptor]);

  const restoreSession = useCallback(async () => {
    setRestoreError(null);
    const stored = await getRefreshToken();
    if (!stored) {
      clearAccessToken();
      syncUser(null);
      setStatus('unauthenticated');
      return;
    }

    try {
      const access = await applyRefreshOutcome(false);
      if (!access) return;

      try {
        const me = await fetchMe();
        syncUser(me);
      } catch {
        // Soft-fail /me — refresh already supplied user.
      }
    } catch (error) {
      if (!(error instanceof ApiError)) {
        clearAccessToken();
        syncUser(null);
        setStatus('unauthenticated');
        setRestoreError('No pudimos restaurar tu sesión. Revisá tu conexión.');
      }
    }
  }, [applyRefreshOutcome, syncUser]);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  const establishSession = useCallback(
    async (tokens: { user: AuthUser; token: string; refreshToken: string }) => {
      bumpSessionGeneration();
      await persistAuthRefreshToken(tokens.refreshToken);
      applyAccessToken(tokens.token);
      syncUser(tokens.user);
      setRestoreError(null);
      setStatus('authenticated');
    },
    [syncUser],
  );

  const login = useCallback(
    async (input: { email: string; password: string }) => {
      const body: MobileLoginBody = {
        email: input.email.trim(),
        password: input.password,
        clientType: getMobileClientType(),
      };
      const tokens = await loginMobile(body);
      await establishSession(tokens);
    },
    [establishSession],
  );

  const register = useCallback(
    async (
      input: Omit<MobileRegisterBody, 'clientType' | 'acceptedTerms'> & {
        acceptedTerms: boolean;
      },
    ) => {
      if (input.acceptedTerms !== true) {
        throw new ApiError('VALIDATION', 'Debés aceptar los términos y la política de privacidad');
      }
      const body: MobileRegisterBody = {
        ...input,
        acceptedTerms: true,
        clientType: getMobileClientType(),
      };
      const tokens = await registerMobile(body);
      await establishSession(tokens);
    },
    [establishSession],
  );

  const logout = useCallback(async () => {
    // Invalidate in-flight refresh before touching storage.
    bumpSessionGeneration();
    const refresh = await getRefreshToken();
    await clearLocalSession();
    if (refresh) {
      try {
        await logoutMobile(refresh);
      } catch {
        // Best-effort server revoke.
      }
    }
  }, [clearLocalSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      restoreError,
      login,
      register,
      logout,
      retryRestore: restoreSession,
    }),
    [status, user, restoreError, login, register, logout, restoreSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
