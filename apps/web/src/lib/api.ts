import type { PaginatedResult } from './types';

function normalizeApiUrl(raw?: string) {
  const value = raw?.trim() || 'http://localhost:4000';
  if (value.startsWith('http://') || value.startsWith('https://')) return value.replace(/\/$/, '');
  return `https://${value.replace(/\/$/, '')}`;
}

export const API_URL = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL);

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('buyseekk_token');
}

export function setToken(token: string) {
  localStorage.setItem('buyseekk_token', token);
}

export function clearToken() {
  localStorage.removeItem('buyseekk_token');
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

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/api${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data.message ?? data.error ?? 'Error en la solicitud';
    throw new Error(Array.isArray(msg) ? msg.join(', ') : msg);
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

export async function uploadImage(file: File): Promise<{ url: string }> {
  const token = getToken();
  const form = new FormData();
  form.append('file', file);

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/api/uploads`, { method: 'POST', headers, body: form });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data.message ?? data.error ?? 'Error al subir imagen';
    throw new Error(Array.isArray(msg) ? msg.join(', ') : msg);
  }
  return data as { url: string };
}
