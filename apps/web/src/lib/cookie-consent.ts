export const COOKIE_CONSENT_KEY = 'buyseekk_cookie_consent';
export const COOKIE_CONSENT_EVENT = 'buyseekk:cookie-consent';

export type CookieConsentValue = 'accepted' | 'essential';

export function getCookieConsent(): CookieConsentValue | null {
  if (typeof window === 'undefined') return null;
  const value = localStorage.getItem(COOKIE_CONSENT_KEY);
  return value === 'accepted' || value === 'essential' ? value : null;
}

export function setCookieConsent(value: CookieConsentValue) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(COOKIE_CONSENT_KEY, value);
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: value }));
}

export function hasAnalyticsConsent(): boolean {
  return getCookieConsent() === 'accepted';
}
