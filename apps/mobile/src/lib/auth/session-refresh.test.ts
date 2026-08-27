import assert from 'node:assert/strict';
import {
  bumpSessionGeneration,
  coordinatedRefresh,
  getSessionGeneration,
  persistAuthRefreshToken,
  resetSessionRefreshCoordinator,
} from './session-refresh';
import {
  clearRefreshToken,
  createMemorySecureStore,
  getRefreshToken,
  resetSecureStoreAdapter,
  setRefreshToken,
  setSecureStoreAdapter,
} from './secure-session';
import { clearAccessToken, getAccessToken, setAccessToken } from './access-token';
import { resetApiRefreshState } from '../api/client';

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
  emailVerified: true,
  country: 'US',
  locale: 'EN',
  currency: 'USD',
  subscriptionPlan: 'FREE',
};

async function main() {
  resetSessionRefreshCoordinator();
  resetApiRefreshState();
  clearAccessToken();

  const memory = createMemorySecureStore();
  setSecureStoreAdapter(memory);

  const originalFetch = globalThis.fetch;
  let refreshHits = 0;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const body = init?.body ? (JSON.parse(String(init.body)) as { refreshToken?: string }) : null;

    if (url.includes('/auth/mobile/refresh')) {
      refreshHits += 1;
      await new Promise((r) => setTimeout(r, 40));
      if (body?.refreshToken === 'net-token') {
        throw new TypeError('Network request failed');
      }
      if (body?.refreshToken === 'bad-token') {
        return jsonResponse(401, { message: 'Sesión expirada. Volvé a iniciar sesión' });
      }
      return jsonResponse(201, {
        user: sampleUser,
        token: `access-${refreshHits}`,
        refreshToken: `rotated-${refreshHits}`,
      });
    }
    return jsonResponse(404, { message: 'missing' });
  }) as typeof fetch;

  try {
    // --- concurrent coordinatedRefresh → one network hit ---
    await setRefreshToken('live-token');
    refreshHits = 0;
    const [a, b, c] = await Promise.all([
      coordinatedRefresh(),
      coordinatedRefresh(),
      coordinatedRefresh(),
    ]);
    assert.equal(refreshHits, 1);
    assert.equal(a.kind, 'ok');
    assert.equal(b.kind, 'ok');
    assert.equal(c.kind, 'ok');
    if (a.kind === 'ok') assert.equal(a.accessToken, 'access-1');
    assert.equal(await getRefreshToken(), 'rotated-1');

    // --- two retryRestore-style calls share flight ---
    await setRefreshToken('live-token-2');
    refreshHits = 0;
    const dual = await Promise.all([coordinatedRefresh(), coordinatedRefresh()]);
    assert.equal(refreshHits, 1);
    assert.equal(dual[0].kind, 'ok');
    assert.equal(dual[1].kind, 'ok');

    // --- logout bump aborts late refresh (no revive) ---
    await setRefreshToken('about-to-refresh');
    refreshHits = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/auth/mobile/refresh')) {
        refreshHits += 1;
        await gate;
        return jsonResponse(201, {
          user: sampleUser,
          token: 'late-access',
          refreshToken: 'late-refresh',
        });
      }
      return jsonResponse(404, {});
    }) as typeof fetch;

    const pending = coordinatedRefresh();
    // Simulate logout while refresh in flight
    bumpSessionGeneration();
    await clearRefreshToken();
    clearAccessToken();
    release();
    const late = await pending;
    assert.equal(late.kind, 'aborted');
    assert.equal(await getRefreshToken(), null);
    assert.equal(getAccessToken(), null);

    // --- logout + login: old refresh must not wipe new session ---
    await setRefreshToken('old-session');
    refreshHits = 0;
    let release2!: () => void;
    const gate2 = new Promise<void>((resolve) => {
      release2 = resolve;
    });
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      if (String(input).includes('/auth/mobile/refresh')) {
        refreshHits += 1;
        await gate2;
        return jsonResponse(201, {
          user: { ...sampleUser, email: 'old@test.com' },
          token: 'old-access',
          refreshToken: 'old-rotated',
        });
      }
      return jsonResponse(404, {});
    }) as typeof fetch;

    const stale = coordinatedRefresh();
    bumpSessionGeneration(); // logout
    await clearRefreshToken();
    bumpSessionGeneration(); // login
    await persistAuthRefreshToken('new-login-refresh');
    setAccessToken('new-login-access');
    release2();
    const staleResult = await stale;
    assert.equal(staleResult.kind, 'aborted');
    assert.equal(await getRefreshToken(), 'new-login-refresh');
    assert.equal(getAccessToken(), 'new-login-access');

    // --- SecureStore fail on rotated persist ---
    const failing = createMemorySecureStore();
    const originalSet = failing.setItemAsync.bind(failing);
    let failNext = false;
    failing.setItemAsync = async (key, value) => {
      if (failNext) throw new Error('secure store full');
      return originalSet(key, value);
    };
    setSecureStoreAdapter(failing);
    await setRefreshToken('will-rotate');
    failNext = true;
    globalThis.fetch = (async () =>
      jsonResponse(201, {
        user: sampleUser,
        token: 'atk',
        refreshToken: 'cannot-save',
      })) as typeof fetch;
    const persistFail = await coordinatedRefresh();
    assert.equal(persistFail.kind, 'persist_failed');
    assert.equal(getAccessToken(), null);

    // --- network keeps refresh ---
    setSecureStoreAdapter(memory);
    memory.store.clear();
    await setRefreshToken('net-token');
    globalThis.fetch = (async () => {
      throw new TypeError('Network request failed');
    }) as typeof fetch;
    const net = await coordinatedRefresh();
    assert.equal(net.kind, 'network');
    assert.equal(await getRefreshToken(), 'net-token');

    // --- invalid clears conceptually (coordinator returns invalid; caller clears) ---
    await setRefreshToken('bad-token');
    globalThis.fetch = (async () =>
      jsonResponse(401, { message: 'Sesión expirada. Volvé a iniciar sesión' })) as typeof fetch;
    const inv = await coordinatedRefresh();
    assert.equal(inv.kind, 'invalid');

    assert.ok(getSessionGeneration() >= 2);
  } finally {
    globalThis.fetch = originalFetch;
    resetSecureStoreAdapter();
    resetSessionRefreshCoordinator();
    clearAccessToken();
  }

  console.log('auth/session-refresh: all assertions passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
