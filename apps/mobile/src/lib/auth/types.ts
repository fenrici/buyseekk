/**
 * Authenticated user as returned by mobile auth + GET /auth/me
 * (passwordHash never included).
 */
export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  activeMode: string;
  preferredMode: string;
  emailVerified: boolean;
  country: string;
  locale: string;
  currency: string;
  subscriptionPlan: string;
  avatarUrl?: string | null;
  blocked?: boolean;
  suspended?: boolean;
  [key: string]: unknown;
};

export type AuthStatus = 'booting' | 'authenticated' | 'unauthenticated';

export type MobileAuthTokens = {
  user: AuthUser;
  token: string;
  refreshToken: string;
};

export function parseAuthUser(raw: unknown): AuthUser {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid auth user payload');
  }
  const u = raw as Record<string, unknown>;
  if (typeof u.id !== 'string' || typeof u.email !== 'string' || typeof u.name !== 'string') {
    throw new Error('Invalid auth user payload');
  }
  return u as AuthUser;
}
