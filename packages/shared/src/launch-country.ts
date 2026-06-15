import type { Country } from './types';
import { defaultCurrencyForCountry } from './pricing';

const VALID_COUNTRIES: Country[] = ['AR', 'US'];

/** Parse LAUNCH_COUNTRY / NEXT_PUBLIC_LAUNCH_COUNTRY (e.g. US). Null = multi-country mode. */
export function parseLaunchCountry(raw?: string | null): Country | null {
  if (!raw?.trim()) return null;
  const value = raw.trim().toUpperCase() as Country;
  return VALID_COUNTRIES.includes(value) ? value : null;
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
