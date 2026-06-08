export const MAX_ACTIVE_REQUESTS = 5;
export const MAX_IMAGES_PER_ENTITY = 5;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export type CountryCode = 'AR' | 'US';
export type CurrencyCode = 'ARS' | 'USD';

export function defaultLocaleForCountry(country: CountryCode): 'es' | 'en' {
  return country === 'US' ? 'en' : 'es';
}

export function defaultCurrencyForCountry(country: CountryCode): CurrencyCode {
  return country === 'US' ? 'USD' : 'ARS';
}

export function comparePrices(budget: number, offerPrice: number, currency: CurrencyCode) {
  const diff = offerPrice - budget;
  const abs = Math.abs(diff);
  const fmt = (n: number) =>
    currency === 'ARS'
      ? `$${n.toLocaleString('es-AR')} ARS`
      : `$${n.toLocaleString('en-US')} USD`;

  if (diff < 0) {
    return { budget, offerPrice, diff, status: 'under' as const, label: `${fmt(abs)} bajo presupuesto` };
  }
  if (diff === 0) {
    return { budget, offerPrice, diff: 0, status: 'at' as const, label: 'Igual al presupuesto' };
  }
  return { budget, offerPrice, diff, status: 'over' as const, label: `${fmt(abs)} sobre presupuesto` };
}
