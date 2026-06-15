import {
  defaultCurrencyForCountry,
  parseLaunchCountry,
  type Country,
} from '@buyseekk/shared';

/** Fixed launch market. Default US. Null only when LAUNCH_COUNTRY=MULTI. */
export const LAUNCH_COUNTRY: Country | null = parseLaunchCountry(
  process.env.NEXT_PUBLIC_LAUNCH_COUNTRY,
);

export function isSingleCountryLaunch(): boolean {
  return LAUNCH_COUNTRY !== null;
}

export function getDefaultRegisterCountry(): Country {
  return LAUNCH_COUNTRY ?? 'US';
}

export function getDefaultRegisterCurrency(): 'ARS' | 'USD' {
  return defaultCurrencyForCountry(getDefaultRegisterCountry());
}

export function effectiveCountry(userCountry?: Country): Country {
  return LAUNCH_COUNTRY ?? userCountry ?? 'US';
}

export function showCountrySelectors(): boolean {
  return !isSingleCountryLaunch();
}

export function showCurrencySelectors(): boolean {
  return !isSingleCountryLaunch();
}

export function isUsLaunch(): boolean {
  return LAUNCH_COUNTRY === 'US';
}
