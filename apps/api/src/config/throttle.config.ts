function envInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Límites por ventana de 60s. Override opcional vía env (THROTTLE_*_LIMIT). */
export const THROTTLE_LIMITS = {
  default: { ttl: 60_000, limit: envInt('THROTTLE_DEFAULT_LIMIT', 120) },
  login: { ttl: 60_000, limit: envInt('THROTTLE_LOGIN_LIMIT', 10) },
  register: { ttl: 60_000, limit: envInt('THROTTLE_REGISTER_LIMIT', 5) },
  upload: { ttl: 60_000, limit: envInt('THROTTLE_UPLOAD_LIMIT', 15) },
  offer: { ttl: 60_000, limit: envInt('THROTTLE_OFFER_LIMIT', 30) },
  chat: { ttl: 60_000, limit: envInt('THROTTLE_CHAT_LIMIT', 60) },
  search: { ttl: 60_000, limit: envInt('THROTTLE_SEARCH_LIMIT', 90) },
  write: { ttl: 60_000, limit: envInt('THROTTLE_WRITE_LIMIT', 10) },
} as const;

export type ThrottleProfile = keyof typeof THROTTLE_LIMITS;

export function buildThrottlerDefinitions() {
  return (Object.entries(THROTTLE_LIMITS) as [ThrottleProfile, { ttl: number; limit: number }][])
    .map(([name, cfg]) => ({ name, ttl: cfg.ttl, limit: cfg.limit }));
}
