import 'reflect-metadata';
import { validateEnv } from '../src/config/env.validation';
import { parseCorsOrigins, isAllowedCorsOrigin } from '../src/config/cors-origins';
import { buildRefreshCookieOptions, parseDurationMs } from '../src/auth/refresh-cookie';
import { canonicalizeEmail } from '../src/auth/email-canonicalize';

function baseEnv(overrides: Record<string, unknown> = {}) {
  return {
    DATABASE_URL: 'postgresql://buyseekk:buyseekk@localhost:5432/buyseekk',
    JWT_SECRET: 'abcdefghijklmnopqrstuvwxyz012345',
    ...overrides,
  };
}

function prodEnv(overrides: Record<string, unknown> = {}) {
  return baseEnv({
    NODE_ENV: 'production',
    CORS_ORIGIN: 'https://buyseek.us',
    WEB_URL: 'https://buyseek.us',
    PLUS_FEATURES_UNLOCKED: 'true',
    STORAGE_PROVIDER: 'r2',
    STORAGE_PUBLIC_URL: 'https://media.example.com',
    R2_ACCOUNT_ID: 'account',
    R2_ACCESS_KEY_ID: 'key',
    R2_SECRET_ACCESS_KEY: 'secret',
    R2_BUCKET_NAME: 'bucket',
    ...overrides,
  });
}

describe('Security config', () => {
  const previousNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = previousNodeEnv;
  });

  it('canonicalizes emails', () => {
    expect(canonicalizeEmail('  Franco@Email.com ')).toBe('franco@email.com');
  });

  it('parses CORS origins without wildcards', () => {
    expect(parseCorsOrigins('https://buyseek.us, https://www.buyseek.us/')).toEqual([
      'https://buyseek.us',
      'https://www.buyseek.us',
    ]);
    expect(isAllowedCorsOrigin('https://evil.example', parseCorsOrigins('https://buyseek.us'))).toBe(false);
  });

  it('builds production refresh cookies as HttpOnly Secure SameSite=None', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.AUTH_COOKIE_DOMAIN;
    const options = buildRefreshCookieOptions();
    expect(options.httpOnly).toBe(true);
    expect(options.secure).toBe(true);
    expect(options.sameSite).toBe('none');
    expect(options.path).toBe('/api/auth');
  });

  it('builds dev refresh cookies as Lax without Secure', () => {
    process.env.NODE_ENV = 'test';
    const options = buildRefreshCookieOptions();
    expect(options.httpOnly).toBe(true);
    expect(options.secure).toBe(false);
    expect(options.sameSite).toBe('lax');
  });

  it('parses refresh duration', () => {
    expect(parseDurationMs('15m')).toBe(15 * 60 * 1000);
    expect(parseDurationMs('30d')).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it('requires production secrets, CORS, WEB_URL and explicit PLUS_FEATURES_UNLOCKED', () => {
    expect(() => validateEnv(prodEnv())).not.toThrow();

    expect(() => validateEnv(prodEnv({ JWT_SECRET: 'short-secret-16xx' }))).toThrow(/32/);

    expect(() => validateEnv(prodEnv({ PLUS_FEATURES_UNLOCKED: undefined }))).toThrow(
      /PLUS_FEATURES_UNLOCKED/,
    );

    expect(() => validateEnv(prodEnv({ REDIS_URL: 'http://localhost:6379' }))).toThrow(/REDIS_URL/);
  });

  it('requires Stripe keys and WEB_URL when STRIPE_BILLING_ENABLED=true', () => {
    expect(() =>
      validateEnv(
        baseEnv({
          STRIPE_BILLING_ENABLED: 'true',
          STRIPE_SECRET_KEY: 'sk_test_x',
          STRIPE_PRICE_PLUS_MONTHLY: 'price_x',
          WEB_URL: 'http://localhost:3000',
        }),
      ),
    ).not.toThrow();

    expect(() => validateEnv(baseEnv({ STRIPE_BILLING_ENABLED: 'true' }))).toThrow(/STRIPE_SECRET_KEY/);
    expect(() =>
      validateEnv(baseEnv({ STRIPE_BILLING_ENABLED: 'true', STRIPE_SECRET_KEY: 'sk_test_x' })),
    ).toThrow(/STRIPE_PRICE_PLUS_MONTHLY/);
    expect(() =>
      validateEnv(
        baseEnv({
          STRIPE_BILLING_ENABLED: 'true',
          STRIPE_SECRET_KEY: 'sk_test_x',
          STRIPE_PRICE_PLUS_MONTHLY: 'price_x',
        }),
      ),
    ).toThrow(/WEB_URL/);
  });

  it('requires R2 in production and HTTPS public URL', () => {
    expect(() => validateEnv(prodEnv({ STORAGE_PROVIDER: 'local' }))).toThrow(/STORAGE_PROVIDER/);
    expect(() => validateEnv(prodEnv({ STORAGE_PROVIDER: undefined }))).toThrow(/STORAGE_PROVIDER/);
    expect(() => validateEnv(prodEnv({ R2_BUCKET_NAME: undefined }))).toThrow(/R2_BUCKET_NAME/);
    expect(() => validateEnv(prodEnv({ STORAGE_PUBLIC_URL: 'http://media.example.com' }))).toThrow(
      /HTTPS/,
    );
  });
});
