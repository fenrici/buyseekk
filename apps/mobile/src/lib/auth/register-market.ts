import { defaultRegisterMarket, parseLaunchCountry } from '@buyseekk/shared';

/**
 * Register market defaults — mirrors web launch-country helpers.
 * Uses EXPO_PUBLIC_LAUNCH_COUNTRY when set (same semantics as NEXT_PUBLIC_LAUNCH_COUNTRY).
 */
export function getRegisterMarket(): { country: 'AR' | 'US'; currency: 'ARS' | 'USD' } {
  const launch = parseLaunchCountry(process.env.EXPO_PUBLIC_LAUNCH_COUNTRY);
  return defaultRegisterMarket(launch);
}
