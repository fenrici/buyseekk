export type Country = 'AR' | 'US';
export type Currency = 'ARS' | 'USD';
export type Locale = 'es' | 'en';
export type UserRole = 'BUYER' | 'SELLER' | 'BOTH';
export type RequestCategory = 'AUTOS' | 'INMOBILIARIA';
export type OperationType = 'COMPRA' | 'ALQUILER';
export type OfferStatus = 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA';

export const MAX_ACTIVE_REQUESTS = 5;

export function defaultLocaleForCountry(country: Country): Locale {
  return country === 'US' ? 'en' : 'es';
}

export function defaultCurrencyForCountry(country: Country): Currency {
  return country === 'US' ? 'USD' : 'ARS';
}

export interface PriceComparison {
  budget: number;
  offerPrice: number;
  diff: number;
  status: 'under' | 'at' | 'over';
  label: string;
}

export function comparePrices(budget: number, offerPrice: number, currency: Currency): PriceComparison {
  const diff = offerPrice - budget;
  const abs = Math.abs(diff);
  const fmt = (n: number) =>
    currency === 'ARS'
      ? `$${n.toLocaleString('es-AR')} ARS`
      : `$${n.toLocaleString('en-US')} USD`;

  if (diff < 0) {
    return { budget, offerPrice, diff, status: 'under', label: `${fmt(abs)} bajo presupuesto` };
  }
  if (diff === 0) {
    return { budget, offerPrice, diff: 0, status: 'at', label: 'Igual al presupuesto' };
  }
  return { budget, offerPrice, diff, status: 'over', label: `${fmt(abs)} sobre presupuesto` };
}
