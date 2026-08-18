/** Origins CORS explícitos (sin wildcard). */
export function parseCorsOrigins(raw?: string): string[] {
  return (raw ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

export function isAllowedCorsOrigin(origin: string | undefined, allowed: string[]): boolean {
  if (!origin) return process.env.NODE_ENV !== 'production';
  return allowed.includes(origin);
}
