'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatMoney } from '../api';
import { useAuth } from '@/providers/AuthProvider';
import { en, es, Locale } from './translations';

export type { Locale } from './translations';

const LOCALE_KEY = 'buyseekk_locale';
const LOCALE_EVENT = 'buyseekk:locale';

export function getStoredLocale(): Locale | null {
  if (typeof window === 'undefined') return null;
  const v = localStorage.getItem(LOCALE_KEY);
  return v === 'EN' || v === 'ES' ? v : null;
}

export function setStoredLocale(locale: Locale) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCALE_KEY, locale);
}

export function clearStoredLocale() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LOCALE_KEY);
  window.dispatchEvent(new CustomEvent(LOCALE_EVENT, { detail: 'ES' as Locale }));
}

export function setGuestLocale(locale: Locale) {
  setStoredLocale(locale);
  window.dispatchEvent(new CustomEvent(LOCALE_EVENT, { detail: locale }));
}

function get(obj: Record<string, unknown>, path: string): string {
  const val = path.split('.').reduce<unknown>((o, k) => {
    if (o && typeof o === 'object') return (o as Record<string, unknown>)[k];
    return undefined;
  }, obj);
  return typeof val === 'string' ? val : path;
}

export function translate(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  const dict = locale === 'EN' ? en : es;
  let text = get(dict as unknown as Record<string, unknown>, key);
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }
  return text;
}

export function guessLocale(): Locale {
  return getStoredLocale() ?? 'ES';
}

export function useLocale(): Locale {
  const { user } = useAuth();
  const [guestLocale, setGuestLocaleState] = useState<Locale>('ES');

  useEffect(() => {
    if (!user) setGuestLocaleState(getStoredLocale() ?? 'ES');
  }, [user]);

  useEffect(() => {
    const onChange = (e: Event) => setGuestLocaleState((e as CustomEvent<Locale>).detail);
    window.addEventListener(LOCALE_EVENT, onChange);
    return () => window.removeEventListener(LOCALE_EVENT, onChange);
  }, []);

  if (user?.locale) return user.locale;
  return guestLocale;
}

export function useT() {
  const locale = useLocale();
  return useMemo(
    () => (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale],
  );
}

export function comparisonLabel(
  locale: Locale,
  status: 'under' | 'at' | 'over',
  diff: number,
  currency: string,
) {
  if (status === 'at') return translate(locale, 'compare.at');
  const abs = Math.abs(diff);
  const amount = formatMoney(abs, currency).replace(/ USD$| ARS$/, '').trim();
  const suffix = translate(locale, `compare.${status}`);
  return `${amount} ${suffix}`;
}

export function dateLocale(locale: Locale) {
  return locale === 'EN' ? 'en-US' : 'es-AR';
}

/** "hace 2 horas" / "2 hours ago" a partir de una fecha ISO. */
export function timeAgo(locale: Locale, iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return translate(locale, 'common.justNow');

  const rtf = new Intl.RelativeTimeFormat(dateLocale(locale), { numeric: 'auto' });
  if (minutes < 60) return rtf.format(-minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (hours < 24) return rtf.format(-hours, 'hour');
  const days = Math.round(hours / 24);
  if (days < 30) return rtf.format(-days, 'day');
  const months = Math.round(days / 30);
  if (months < 12) return rtf.format(-months, 'month');
  return rtf.format(-Math.round(months / 12), 'year');
}

export function operationLabel(locale: Locale, operation: string) {
  return operation === 'ALQUILER' ? translate(locale, 'request.rent') : translate(locale, 'request.buy');
}

export function offerStatusLabel(locale: Locale, status: string) {
  const map: Record<string, string> = {
    PENDIENTE: translate(locale, 'common.statusPENDING'),
    ACEPTADA: translate(locale, 'common.statusACCEPTED'),
    RECHAZADA: translate(locale, 'common.statusREJECTED'),
  };
  return map[status] ?? status;
}
