import type { PaginatedResult } from './types';

function normalizeApiUrl(raw?: string) {
  const value = raw?.trim() || 'http://localhost:4000';
  if (value.startsWith('http://') || value.startsWith('https://')) return value.replace(/\/$/, '');
  return `https://${value.replace(/\/$/, '')}`;
}

export const API_URL = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL);

const TOKEN_KEY = 'buyseekk_token';
const LEGACY_REFRESH_KEY = 'buyseekk_refresh_token';

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function setAuthTokens(token: string) {
  setToken(token);
  if (typeof window !== 'undefined') {
    localStorage.removeItem(LEGACY_REFRESH_KEY);
  }
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(LEGACY_REFRESH_KEY);
  void import('./socket').then((mod) => mod.disconnectChatSocket()).catch(() => {});
}

let refreshPromise: Promise<boolean> | null = null;

function shouldAttemptRefresh(path: string) {
  const skip = [
    '/auth/login',
    '/auth/register',
    '/auth/refresh',
    '/auth/logout',
    '/auth/forgot-password',
    '/auth/reset-password',
  ];
  return !skip.some((prefix) => path === prefix || path.startsWith(`${prefix}?`));
}

function isAccountDisabledCode(code?: string) {
  return code === 'ACCOUNT_BLOCKED' || code === 'ACCOUNT_SUSPENDED';
}

async function tryRefreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          clearToken();
          return false;
        }
        if (data.token) {
          setAuthTokens(data.token);
          return true;
        }
        clearToken();
        return false;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

/** Acepta respuesta paginada o array legacy (compatibilidad API pre-P0). */
export function normalizePaginated<T>(data: PaginatedResult<T> | T[]): PaginatedResult<T> {
  if (Array.isArray(data)) {
    const total = data.length;
    return {
      items: data,
      total,
      page: 1,
      limit: total || 20,
      totalPages: total === 0 ? 0 : 1,
      hasNextPage: false,
    };
  }
  const items = data.items ?? [];
  const total = data.total ?? items.length;
  const limit = data.limit ?? 20;
  const page = data.page ?? 1;
  const totalPages =
    data.totalPages ?? (total === 0 ? 0 : Math.max(1, Math.ceil(total / limit)));
  return {
    items,
    total,
    page,
    limit,
    totalPages,
    hasNextPage: data.hasNextPage ?? page < totalPages,
  };
}

function throwApiError(data: Record<string, unknown>, status: number): never {
  const raw = data.message ?? data.error ?? 'Error en la solicitud';
  const msg =
    typeof raw === 'object' && raw !== null && 'message' in raw
      ? String((raw as { message: unknown }).message)
      : raw;
  const code =
    typeof data.code === 'string'
      ? data.code
      : typeof raw === 'object' && raw !== null && 'code' in raw
        ? String((raw as { code: unknown }).code)
        : undefined;
  throw new ApiError(Array.isArray(msg) ? msg.join(', ') : String(msg), status, code);
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
  retryOnUnauthorized = true,
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (res.status === 403 && isAccountDisabledCode(typeof data.code === 'string' ? data.code : undefined)) {
    clearToken();
    throwApiError(data, res.status);
  }

  if (res.status === 401 && retryOnUnauthorized && shouldAttemptRefresh(path)) {
    const refreshed = await tryRefreshSession();
    if (refreshed) {
      return api<T>(path, options, false);
    }
  }

  if (!res.ok) {
    throwApiError(data, res.status);
  }
  return data as T;
}

export function formatMoney(amount: number, currency: string, period = '') {
  if (currency === 'ARS') return `$${amount.toLocaleString('es-AR')} ARS${period}`;
  return `$${amount.toLocaleString('en-US')} USD${period}`;
}

export function getImageUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http') || url.startsWith('blob:')) return url;
  if (url.startsWith('/api/')) return `${API_URL}${url}`;
  return url;
}

export async function uploadImage(file: File, retryOnUnauthorized = true): Promise<{ url: string }> {
  const token = getToken();
  const form = new FormData();
  form.append('file', file);

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/api/uploads`, {
    method: 'POST',
    headers,
    body: form,
    credentials: 'include',
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (res.status === 403 && isAccountDisabledCode(typeof data.code === 'string' ? data.code : undefined)) {
    clearToken();
    throwApiError(data, res.status);
  }

  if (res.status === 401 && retryOnUnauthorized) {
    const refreshed = await tryRefreshSession();
    if (refreshed) {
      return uploadImage(file, false);
    }
  }

  if (!res.ok) {
    const msg = data.message ?? data.error ?? 'Error al subir imagen';
    throw new ApiError(
      Array.isArray(msg) ? msg.join(', ') : String(msg),
      res.status,
      typeof data.code === 'string' ? data.code : undefined,
    );
  }
  return data as { url: string };
}
