type TrackerRequest = {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
};

/** Rate-limit key: authenticated user id when Bearer token present, else client IP. */
export function throttleTrackerFromRequest(req: TrackerRequest): string {
  const raw = req.headers?.authorization;
  const auth = Array.isArray(raw) ? raw[0] : raw;
  if (auth?.startsWith('Bearer ')) {
    try {
      const segment = auth.slice(7).split('.')[1];
      if (segment) {
        const payload = JSON.parse(Buffer.from(segment, 'base64url').toString('utf8')) as {
          sub?: string;
        };
        if (payload.sub) return `user:${payload.sub}`;
      }
    } catch {
      /* invalid token — fall back to IP */
    }
  }
  return req.ip ?? 'unknown';
}
