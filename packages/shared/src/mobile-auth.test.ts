import assert from 'node:assert/strict';
import type {
  MobileLoginResponse,
  MobileLogoutResponse,
  MobileRefreshResponse,
  RefreshClientType,
} from './mobile-auth';

const iosLogin: MobileLoginResponse = {
  user: { id: 'u1' },
  token: 'access',
  refreshToken: 'refresh',
};

const refresh: MobileRefreshResponse = iosLogin;
const logout: MobileLogoutResponse = { ok: true };

const clientTypes: RefreshClientType[] = ['WEB', 'IOS', 'ANDROID'];
assert.equal(clientTypes.length, 3);
assert.equal(iosLogin.refreshToken.length > 0, true);
assert.deepEqual(refresh, iosLogin);
assert.deepEqual(logout, { ok: true });

console.log('mobile-auth: all assertions passed');
