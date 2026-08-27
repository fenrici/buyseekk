import { API_URL } from '../config';
import { getAccessToken, setAccessToken, clearAccessToken } from '../auth/access-token';
import {
  networkApiError,
  parseApiErrorBody,
  timeoutApiError,
} from './errors';

const DEFAULT_TIMEOUT_MS = 20_000;

export type ApiRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Skip Authorization header and 401 refresh. */
  skipAuth?: boolean;
  /** Do not attempt single-flight refresh on 401 (login/register/refresh/logout). */
  skipAuthRefresh?: boolean;
  timeoutMs?: number;
  signal?: AbortSignal;
  /** Override in-memory token for a single call. */
  accessToken?: string | null;
  /** Injectable fetch for tests. */
  fetchImpl?: typeof fetch;
};

type RefreshRunner = () => Promise<string | null>;

let refreshRunner: RefreshRunner | null = null;
let refreshInFlight: Promise<string | null> | null = null;

/** AuthProvider registers the session refresh implementation. */
export function setApiRefreshRunner(runner: RefreshRunner | null): void {
  refreshRunner = runner;
}

/** Test helper — reset single-flight state. */
export function resetApiRefreshState(): void {
  refreshInFlight = null;
  refreshRunner = null;
}

/**
 * Single-flight refresh: concurrent 401s share one refresh Promise.
 */
export async function runSingleFlightRefresh(): Promise<string | null> {
  if (!refreshRunner) return null;
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        return await refreshRunner!();
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

async function readJsonSafe(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function joinUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = API_URL.replace(/\/$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}

/**
 * Central HTTP client for Buyseek mobile.
 * - Bearer access from memory
 * - One shared refresh on 401, then single retry
 */
export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const {
    method = 'GET',
    body,
    skipAuth = false,
    skipAuthRefresh = false,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal,
    fetchImpl = fetch,
  } = options;

  const execute = async (token: string | null): Promise<Response> => {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (!skipAuth && token) headers.Authorization = `Bearer ${token}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const onExternalAbort = () => controller.abort();
    signal?.addEventListener('abort', onExternalAbort);

    try {
      return await fetchImpl(joinUrl(path), {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        if (signal?.aborted) throw err;
        throw timeoutApiError(err);
      }
      throw networkApiError(err);
    } finally {
      clearTimeout(timeoutId);
      signal?.removeEventListener('abort', onExternalAbort);
    }
  };

  const initialToken =
    options.accessToken !== undefined
      ? options.accessToken
      : skipAuth
        ? null
        : getAccessToken();

  let response = await execute(initialToken);

  if (response.status === 401 && !skipAuth && !skipAuthRefresh) {
    const nextToken = await runSingleFlightRefresh();
    if (nextToken) {
      response = await execute(nextToken);
    }
  }

  if (!response.ok) {
    const payload = await readJsonSafe(response);
    throw parseApiErrorBody(response.status, payload);
  }

  if (response.status === 204) return undefined as T;
  return (await readJsonSafe(response)) as T;
}

export async function apiGet<T>(path: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>) {
  return apiRequest<T>(path, { ...options, method: 'GET' });
}

export async function apiPost<T>(
  path: string,
  body?: unknown,
  options?: Omit<ApiRequestOptions, 'method' | 'body'>,
) {
  return apiRequest<T>(path, { ...options, method: 'POST', body });
}

/** Apply tokens from a successful login/register/refresh response. */
export function applyAccessToken(token: string): void {
  setAccessToken(token);
}

export { getAccessToken, setAccessToken, clearAccessToken };
