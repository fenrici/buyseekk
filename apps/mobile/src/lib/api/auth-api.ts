import type { MobileLogoutResponse } from '@buyseekk/shared';
import { apiGet, apiPost } from './client';
import { parseAuthUser, type AuthUser, type MobileAuthTokens } from '../auth/types';

export type MobileLoginBody = {
  email: string;
  password: string;
  clientType: 'IOS' | 'ANDROID';
  deviceId?: string;
  deviceLabel?: string;
};

export type MobileRegisterBody = {
  email: string;
  password: string;
  name: string;
  role: 'BUYER' | 'SELLER' | 'BOTH';
  acceptedTerms: true;
  country: 'AR' | 'US';
  currency?: 'ARS' | 'USD';
  locale?: 'ES' | 'EN';
  sellerType?: 'INDIVIDUAL' | 'COMPANY';
  sellerCategory?: 'AUTOS' | 'INMOBILIARIA';
  clientType: 'IOS' | 'ANDROID';
  deviceId?: string;
  deviceLabel?: string;
};

function parseAuthTokens(raw: unknown): MobileAuthTokens {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid auth response');
  const data = raw as Record<string, unknown>;
  if (typeof data.token !== 'string' || typeof data.refreshToken !== 'string') {
    throw new Error('Invalid auth response');
  }
  return {
    user: parseAuthUser(data.user),
    token: data.token,
    refreshToken: data.refreshToken,
  };
}

export async function loginMobile(body: MobileLoginBody): Promise<MobileAuthTokens> {
  const raw = await apiPost<unknown>('/api/auth/mobile/login', body, {
    skipAuth: true,
    skipAuthRefresh: true,
  });
  return parseAuthTokens(raw);
}

export async function registerMobile(body: MobileRegisterBody): Promise<MobileAuthTokens> {
  const raw = await apiPost<unknown>('/api/auth/mobile/register', body, {
    skipAuth: true,
    skipAuthRefresh: true,
  });
  return parseAuthTokens(raw);
}

export async function refreshMobile(refreshToken: string): Promise<MobileAuthTokens> {
  const raw = await apiPost<unknown>(
    '/api/auth/mobile/refresh',
    { refreshToken },
    { skipAuth: true, skipAuthRefresh: true },
  );
  return parseAuthTokens(raw);
}

export async function logoutMobile(refreshToken: string): Promise<MobileLogoutResponse> {
  return apiPost<MobileLogoutResponse>(
    '/api/auth/mobile/logout',
    { refreshToken },
    { skipAuth: true, skipAuthRefresh: true },
  );
}

export async function fetchMe(): Promise<AuthUser> {
  const raw = await apiGet<unknown>('/api/auth/me');
  return parseAuthUser(raw);
}
