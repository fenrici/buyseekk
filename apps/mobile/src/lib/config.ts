/**
 * Public runtime config for the mobile client.
 * EXPO_PUBLIC_* values are embedded in the JS bundle — never put secrets here.
 */

const DEV_FALLBACK_API_URL = 'https://api.buyseek.us';

function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  const candidate = fromEnv || (__DEV__ ? DEV_FALLBACK_API_URL : undefined);

  if (!candidate) {
    throw new Error(
      'EXPO_PUBLIC_API_URL is required. Copy apps/mobile/.env.example to .env.local',
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error(`EXPO_PUBLIC_API_URL must be a valid URL (got: ${candidate})`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('EXPO_PUBLIC_API_URL must use http or https');
  }

  return parsed.toString().replace(/\/$/, '');
}

/** Canonical API base URL (no trailing slash). */
export const API_URL = resolveApiUrl();
