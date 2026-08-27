import {
  clearRefreshToken,
  getRefreshToken,
  setRefreshToken,
} from './secure-session';
import { clearAccessToken } from './access-token';
import type { AuthUser } from './types';
import { refreshMobile } from '../api/auth-api';
import {
  ApiError,
  isInvalidSessionError,
  isRetriableTransportError,
} from '../api/errors';

/**
 * Global session refresh coordinator.
 * - Single-flight: one in-flight POST /auth/mobile/refresh max
 * - Generation/epoch: logout/login bumps gen so late results cannot revive session
 */

export type RefreshOutcome =
  | { kind: 'ok'; accessToken: string; user: AuthUser; generation: number }
  | { kind: 'invalid' }
  | { kind: 'network'; error: ApiError }
  | { kind: 'persist_failed'; error: ApiError }
  | { kind: 'aborted' }
  | { kind: 'empty' };

let generation = 0;
let inFlight: Promise<RefreshOutcome> | null = null;

export function getSessionGeneration(): number {
  return generation;
}

/** Invalidate any in-flight refresh apply/persist (logout / new login). */
export function bumpSessionGeneration(): number {
  generation += 1;
  return generation;
}

/** Test helper. */
export function resetSessionRefreshCoordinator(): void {
  generation = 0;
  inFlight = null;
}

function persistFailedError(cause?: unknown): ApiError {
  return new ApiError(
    'UNKNOWN',
    'No pudimos guardar tu sesión de forma segura. Volvé a iniciar sesión.',
    { cause },
  );
}

/**
 * Shared refresh entry-point used by:
 * - startup restore / retryRestore
 * - 401 interceptor (via API client runner)
 */
export async function coordinatedRefresh(): Promise<RefreshOutcome> {
  if (inFlight) return inFlight;

  const startedGeneration = generation;

  inFlight = (async (): Promise<RefreshOutcome> => {
    try {
      if (startedGeneration !== generation) return { kind: 'aborted' };

      const stored = await getRefreshToken();
      if (!stored) return { kind: 'empty' };
      if (startedGeneration !== generation) return { kind: 'aborted' };

      let tokens: { user: AuthUser; token: string; refreshToken: string };
      try {
        tokens = await refreshMobile(stored);
      } catch (error) {
        if (isInvalidSessionError(error)) return { kind: 'invalid' };
        if (error instanceof ApiError && isRetriableTransportError(error)) {
          return { kind: 'network', error };
        }
        if (error instanceof ApiError) return { kind: 'network', error };
        return {
          kind: 'network',
          error: new ApiError('NETWORK', 'Sin conexión. Revisá tu internet e intentá de nuevo.', {
            cause: error,
          }),
        };
      }

      // Server rotated the previous refresh — must not write if session was invalidated locally.
      if (startedGeneration !== generation) return { kind: 'aborted' };

      try {
        await setRefreshToken(tokens.refreshToken);
      } catch (cause) {
        // Previous refresh is already revoked server-side; drop local credentials.
        clearAccessToken();
        try {
          await clearRefreshToken();
        } catch {
          /* ignore */
        }
        return { kind: 'persist_failed', error: persistFailedError(cause) };
      }

      if (startedGeneration !== generation) {
        // Logout/login won the race after our write. Only undo if we still own the stored value
        // (do not wipe a newer login's refresh).
        try {
          const current = await getRefreshToken();
          if (current === tokens.refreshToken) {
            await clearRefreshToken();
          }
        } catch {
          /* ignore */
        }
        return { kind: 'aborted' };
      }

      return {
        kind: 'ok',
        accessToken: tokens.token,
        user: tokens.user,
        generation: startedGeneration,
      };
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/**
 * Persist login/register refresh BEFORE publishing access/session.
 * On SecureStore failure: leave unauthenticated (do not keep access in memory).
 */
export async function persistAuthRefreshToken(refreshToken: string): Promise<void> {
  try {
    await setRefreshToken(refreshToken);
  } catch (cause) {
    clearAccessToken();
    try {
      await clearRefreshToken();
    } catch {
      /* ignore */
    }
    throw persistFailedError(cause);
  }
}
