import { API_URL, clearToken } from './api';
import { clearStoredLocale } from './i18n';

export async function logoutSession() {
  try {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    // Best-effort server revocation; always clear local session.
  }
  clearToken();
  clearStoredLocale();
  window.location.href = '/';
}
