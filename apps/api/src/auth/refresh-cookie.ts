import { CookieOptions } from 'express';

export const REFRESH_COOKIE_NAME = 'buyseek_refresh';
export const REFRESH_COOKIE_PATH = '/api/auth';

export function parseDurationMs(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) return 30 * 24 * 60 * 60 * 1000;
  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return amount * (multipliers[unit] ?? multipliers.d);
}

export function getRefreshCookieMaxAgeMs() {
  return parseDurationMs(process.env.JWT_REFRESH_EXPIRES ?? '30d');
}

/**
 * Cross-site actual (buyseek.us → API Railway): SameSite=None + Secure.
 * Dev localhost: SameSite=Lax, Secure=false.
 * Cuando API viva en api.buyseek.us, setear AUTH_COOKIE_DOMAIN=.buyseek.us
 * y se puede usar SameSite=Lax (mismo sitio registrable).
 */
export function buildRefreshCookieOptions(): CookieOptions {
  const isProd = process.env.NODE_ENV === 'production';
  const domain = process.env.AUTH_COOKIE_DOMAIN?.trim() || undefined;
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: REFRESH_COOKIE_PATH,
    maxAge: getRefreshCookieMaxAgeMs(),
    ...(domain ? { domain } : {}),
  };
}

export function parseCookieValue(cookieHeader: string | string[] | undefined, name: string): string | undefined {
  const header = Array.isArray(cookieHeader) ? cookieHeader.join('; ') : cookieHeader;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    if (trimmed.slice(0, eq) !== name) continue;
    try {
      return decodeURIComponent(trimmed.slice(eq + 1));
    } catch {
      return trimmed.slice(eq + 1);
    }
  }
  return undefined;
}
