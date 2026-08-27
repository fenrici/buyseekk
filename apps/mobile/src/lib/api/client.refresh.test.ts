import assert from 'node:assert/strict';
import {
  apiRequest,
  clearAccessToken,
  resetApiRefreshState,
  setAccessToken,
  setApiRefreshRunner,
} from './client';
import { ApiError } from './errors';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function main() {
  resetApiRefreshState();
  clearAccessToken();

  // --- single-flight: 3 parallel 401s → 1 refresh ---
  {
    let refreshCalls = 0;
    let protectedCalls = 0;
    setAccessToken('expired-access');

    setApiRefreshRunner(async () => {
      refreshCalls += 1;
      await new Promise((r) => setTimeout(r, 30));
      setAccessToken('fresh-access');
      return 'fresh-access';
    });

    const fetchImpl: typeof fetch = async (_input, init) => {
      const auth = (init?.headers as Record<string, string> | undefined)?.Authorization;
      protectedCalls += 1;
      if (auth === 'Bearer expired-access') {
        return jsonResponse(401, { message: 'Unauthorized' });
      }
      if (auth === 'Bearer fresh-access') {
        return jsonResponse(200, { ok: true });
      }
      return jsonResponse(500, { message: 'unexpected' });
    };

    const results = await Promise.all([
      apiRequest<{ ok: boolean }>('/api/secure', { fetchImpl }),
      apiRequest<{ ok: boolean }>('/api/secure', { fetchImpl }),
      apiRequest<{ ok: boolean }>('/api/secure', { fetchImpl }),
    ]);

    assert.equal(refreshCalls, 1);
    assert.ok(protectedCalls >= 4);
    assert.deepEqual(results, [{ ok: true }, { ok: true }, { ok: true }]);
  }

  resetApiRefreshState();
  clearAccessToken();

  // --- refresh failure (401) does not retry forever ---
  {
    setAccessToken('expired');
    setApiRefreshRunner(async () => null);

    await assert.rejects(
      () =>
        apiRequest('/api/secure', {
          fetchImpl: async () => jsonResponse(401, { message: 'Sesión expirada' }),
        }),
      (err: unknown) => err instanceof ApiError && err.code === 'UNAUTHORIZED',
    );
  }

  resetApiRefreshState();
  clearAccessToken();

  // --- skipAuthRefresh never triggers runner ---
  {
    let refreshCalls = 0;
    setApiRefreshRunner(async () => {
      refreshCalls += 1;
      return 'x';
    });

    await assert.rejects(
      () =>
        apiRequest('/api/auth/mobile/login', {
          method: 'POST',
          body: { email: 'a@b.com', password: 'x' },
          skipAuth: true,
          skipAuthRefresh: true,
          fetchImpl: async () => jsonResponse(401, { message: 'Credenciales inválidas' }),
        }),
      (err: unknown) => err instanceof ApiError && err.message === 'Credenciales inválidas',
    );
    assert.equal(refreshCalls, 0);
  }

  resetApiRefreshState();
  clearAccessToken();
  console.log('api/client.refresh: all assertions passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
