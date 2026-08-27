import assert from 'node:assert/strict';
import {
  clearRefreshToken,
  createMemorySecureStore,
  getRefreshToken,
  resetSecureStoreAdapter,
  setRefreshToken,
  setSecureStoreAdapter,
} from '../auth/secure-session';
import { clearAccessToken, getAccessToken, setAccessToken } from '../auth/access-token';
import { loginMobile, logoutMobile, refreshMobile, registerMobile } from './auth-api';
import { ApiError, isInvalidSessionError, isRetriableTransportError } from './errors';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const sampleUser = {
  id: 'u1',
  email: 'user@test.com',
  name: 'User',
  role: 'BUYER',
  activeMode: 'BUYER',
  preferredMode: 'BUYER',
  emailVerified: false,
  country: 'US',
  locale: 'EN',
  currency: 'USD',
  subscriptionPlan: 'FREE',
};

async function persistLikeAuthProvider(tokens: {
  user: typeof sampleUser;
  token: string;
  refreshToken: string;
}) {
  await setRefreshToken(tokens.refreshToken);
  setAccessToken(tokens.token);
}

async function main() {
  const memory = createMemorySecureStore();
  setSecureStoreAdapter(memory);

  await persistLikeAuthProvider({
    user: sampleUser,
    token: 'access-login',
    refreshToken: 'refresh-login',
  });
  assert.equal(await getRefreshToken(), 'refresh-login');
  assert.equal(getAccessToken(), 'access-login');

  await setRefreshToken('old-refresh');
  await setRefreshToken('new-refresh');
  assert.equal(await getRefreshToken(), 'new-refresh');

  await setRefreshToken('still-valid');
  const invalid = new ApiError('UNAUTHORIZED', 'Sesión expirada', { status: 401 });
  assert.equal(isInvalidSessionError(invalid), true);
  await clearRefreshToken();
  clearAccessToken();
  assert.equal(await getRefreshToken(), null);

  await setRefreshToken('keep-me');
  const network = new ApiError('NETWORK', 'Sin conexión');
  assert.equal(isRetriableTransportError(network), true);
  assert.equal(isInvalidSessionError(network), false);
  assert.equal(await getRefreshToken(), 'keep-me');

  await clearRefreshToken();
  clearAccessToken();
  assert.equal(await getRefreshToken(), null);
  assert.equal(getAccessToken(), null);

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const body = init?.body ? (JSON.parse(String(init.body)) as { refreshToken?: string }) : null;

    if (url.includes('/auth/mobile/login')) {
      return jsonResponse(201, {
        user: sampleUser,
        token: 'atk',
        refreshToken: 'rtk-login',
      });
    }
    if (url.includes('/auth/mobile/register')) {
      return jsonResponse(201, {
        user: sampleUser,
        token: 'atk2',
        refreshToken: 'rtk-reg',
      });
    }
    if (url.includes('/auth/mobile/refresh')) {
      if (body?.refreshToken === 'bad') {
        return jsonResponse(401, { message: 'Sesión expirada. Volvé a iniciar sesión' });
      }
      if (body?.refreshToken === 'net') {
        throw new TypeError('Network request failed');
      }
      return jsonResponse(201, {
        user: sampleUser,
        token: 'atk3',
        refreshToken: 'rtk-rotated',
      });
    }
    if (url.includes('/auth/mobile/logout')) {
      return jsonResponse(201, { ok: true });
    }
    return jsonResponse(404, { message: 'missing' });
  }) as typeof fetch;

  try {
    const loggedIn = await loginMobile({
      email: 'a@b.com',
      password: 'Testpass123',
      clientType: 'IOS',
    });
    assert.equal(loggedIn.refreshToken, 'rtk-login');
    await persistLikeAuthProvider(loggedIn);
    assert.equal(await getRefreshToken(), 'rtk-login');

    const registered = await registerMobile({
      email: 'new@test.com',
      password: 'Testpass123',
      name: 'New',
      role: 'BUYER',
      acceptedTerms: true,
      country: 'US',
      currency: 'USD',
      clientType: 'IOS',
    });
    assert.equal(registered.refreshToken, 'rtk-reg');
    await persistLikeAuthProvider(registered);

    const rotated = await refreshMobile('rtk-reg');
    assert.equal(rotated.refreshToken, 'rtk-rotated');
    await setRefreshToken(rotated.refreshToken);

    await assert.rejects(
      () => refreshMobile('bad'),
      (err: unknown) => isInvalidSessionError(err),
    );

    await assert.rejects(
      () => refreshMobile('net'),
      (err: unknown) => isRetriableTransportError(err),
    );
    assert.equal(await getRefreshToken(), 'rtk-rotated');

    assert.deepEqual(await logoutMobile('rtk-rotated'), { ok: true });
  } finally {
    globalThis.fetch = originalFetch;
  }

  resetSecureStoreAdapter();
  clearAccessToken();
  console.log('api/session-flow: all assertions passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
