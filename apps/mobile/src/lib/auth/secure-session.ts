/** Versioned SecureStore key — refresh only. */
export const REFRESH_TOKEN_KEY = 'buyseek.refreshToken.v1';

export type SecureStoreAdapter = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
};

function getExpoSecureStore(): typeof import('expo-secure-store') {
  // Lazy require so Node unit tests can run with a memory adapter.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-secure-store');
}

const expoAdapter: SecureStoreAdapter = {
  getItemAsync: (key) => getExpoSecureStore().getItemAsync(key),
  setItemAsync: (key, value) => getExpoSecureStore().setItemAsync(key, value),
  deleteItemAsync: (key) => getExpoSecureStore().deleteItemAsync(key),
};

let adapter: SecureStoreAdapter = expoAdapter;

/** Test-only: swap SecureStore implementation. */
export function setSecureStoreAdapter(next: SecureStoreAdapter): void {
  adapter = next;
}

export function resetSecureStoreAdapter(): void {
  adapter = expoAdapter;
}

export async function getRefreshToken(): Promise<string | null> {
  return adapter.getItemAsync(REFRESH_TOKEN_KEY);
}

/** Atomically replace the persisted refresh token after rotation. */
export async function setRefreshToken(token: string): Promise<void> {
  await adapter.setItemAsync(REFRESH_TOKEN_KEY, token);
}

export async function clearRefreshToken(): Promise<void> {
  await adapter.deleteItemAsync(REFRESH_TOKEN_KEY);
}

export function createMemorySecureStore(): SecureStoreAdapter & {
  store: Map<string, string>;
} {
  const store = new Map<string, string>();
  return {
    store,
    async getItemAsync(key) {
      return store.has(key) ? store.get(key)! : null;
    },
    async setItemAsync(key, value) {
      store.set(key, value);
    },
    async deleteItemAsync(key) {
      store.delete(key);
    },
  };
}
