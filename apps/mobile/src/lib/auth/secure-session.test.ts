import assert from 'node:assert/strict';
import {
  REFRESH_TOKEN_KEY,
  clearRefreshToken,
  createMemorySecureStore,
  getRefreshToken,
  resetSecureStoreAdapter,
  setRefreshToken,
  setSecureStoreAdapter,
} from './secure-session';

async function main() {
  const memory = createMemorySecureStore();
  setSecureStoreAdapter(memory);

  await setRefreshToken('refresh-abc');
  assert.equal(await getRefreshToken(), 'refresh-abc');
  assert.equal(memory.store.get(REFRESH_TOKEN_KEY), 'refresh-abc');

  await setRefreshToken('refresh-rotated');
  assert.equal(await getRefreshToken(), 'refresh-rotated');

  await clearRefreshToken();
  assert.equal(await getRefreshToken(), null);
  assert.equal(memory.store.has(REFRESH_TOKEN_KEY), false);

  resetSecureStoreAdapter();
  console.log('auth/secure-session: all assertions passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
