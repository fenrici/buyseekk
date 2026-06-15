import type { Country } from './types';
import { defaultCurrencyForCountry } from './pricing';

const VALID_COUNTRIES: Country[] = ['AR', 'US'];

/** Explicit values that re-enable multi-country mode (dev / future AR launch). */
const MULTI_COUNTRY_MODES = new Set(['MULTI', 'ALL', 'OFF', '*']);

/**
 * Parse LAUNCH_COUNTRY / NEXT_PUBLIC_LAUNCH_COUNTRY.
 * Default: US (single-market launch). Set MULTI to allow AR + US.
 */
export function parseLaunchCountry(raw?: string | null): Country | null {
  if (!raw?.trim()) return 'US';
  const value = raw.trim().toUpperCase();
  if (MULTI_COUNTRY_MODES.has(value)) return null;
  const country = value as Country;
  return VALID_COUNTRIES.includes(country) ? country : 'US';
}

export function isSingleCountryLaunch(launchCountry: Country | null): boolean {
  return launchCountry !== null;
}

export function effectiveCountry(
  launchCountry: Country | null,
  fallback: Country = 'US',
): Country {
  return launchCountry ?? fallback;
}

export function effectiveCurrencyForLaunch(launchCountry: Country | null, fallback: Country): string {
  return defaultCurrencyForCountry(effectiveCountry(launchCountry, fallback));
}
