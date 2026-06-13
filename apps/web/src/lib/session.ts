import { API_URL, clearToken, getRefreshToken } from './api';
import { clearStoredLocale } from './i18n';

export async function logoutSession() {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // Best-effort server revocation; always clear local session.
    }
  }
  clearToken();
  clearStoredLocale();
  window.location.href = '/';
}
