import { isUsLaunch } from '@/lib/launch-country';
import { parseUsCityState, usStateLabel } from '@buyseekk/shared';

export function formatProfileLocation(
  city: string | null | undefined,
  country: 'AR' | 'US',
  t: (key: string) => string,
): string | null {
  if (!city?.trim()) return null;

  if (isUsLaunch() || country === 'US') {
    const parsed = parseUsCityState(city);
    if (parsed) {
      return `${parsed.city} · ${usStateLabel(parsed.state)}`;
    }
    return city;
  }

  const countryLabel = country === 'AR' ? t('auth.countryAR') : t('auth.countryUS');
  return `${city}, ${countryLabel}`;
}
