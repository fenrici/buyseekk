import { clearToken } from './api';
import { clearStoredLocale } from './i18n';

export function logoutSession() {
  clearToken();
  clearStoredLocale();
  window.location.href = '/';
}
