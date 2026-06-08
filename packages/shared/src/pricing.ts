import type { Currency, Locale } from './types';

export interface PriceComparison {
  budget: number;
  offerPrice: number;
  diff: number;
  status: 'under' | 'at' | 'over';
  label: string;
}

export function defaultLocaleForCountry(country: 'AR' | 'US'): Locale {
  return country === 'US' ? 'en' : 'es';
}

export function defaultCurrencyForCountry(country: 'AR' | 'US'): Currency {
  return country === 'US' ? 'USD' : 'ARS';
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
