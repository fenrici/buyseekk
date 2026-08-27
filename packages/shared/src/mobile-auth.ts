/** Refresh session client — metadata only, not used for authorization. */
export type RefreshClientType = 'WEB' | 'IOS' | 'ANDROID';

/** Native app login/refresh payload (opaque refresh for SecureStore). */
export type MobileLoginResponse = {
  user: Record<string, unknown>;
  token: string;
  refreshToken: string;
};

export type MobileRefreshResponse = MobileLoginResponse;

/** Same shape as login — register also returns an initial session. */
export type MobileRegisterResponse = MobileLoginResponse;

export type MobileLogoutResponse = {
  ok: true;
};
