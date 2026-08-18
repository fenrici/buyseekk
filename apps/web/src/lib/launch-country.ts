import {
  defaultRegisterMarket,
  parseLaunchCountry,
  showRegisterMarketSelectors,
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
  return defaultRegisterMarket(LAUNCH_COUNTRY).country;
}

export function getDefaultRegisterCurrency(): 'ARS' | 'USD' {
  return defaultRegisterMarket(LAUNCH_COUNTRY).currency;
}

export function effectiveCountry(userCountry?: Country): Country {
  return LAUNCH_COUNTRY ?? userCountry ?? 'US';
}

export function showCountrySelectors(): boolean {
  return showRegisterMarketSelectors(LAUNCH_COUNTRY);
}

export function showCurrencySelectors(): boolean {
  return showRegisterMarketSelectors(LAUNCH_COUNTRY);
}

export function isUsLaunch(): boolean {
  return LAUNCH_COUNTRY === 'US';
}
