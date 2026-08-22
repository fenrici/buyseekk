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

/** Copy natural para listado buyer: diferencia vs presupuesto. */
export function formatBudgetDifferenceLabel(
  budget: number | null | undefined,
  offerPrice: number,
  currency: Currency | string,
  locale: 'ES' | 'EN' = 'ES',
): string | null {
  if (budget == null || !Number.isFinite(budget) || budget < 1) return null;
  if (!Number.isFinite(offerPrice)) return null;

  const cur = currency === 'ARS' ? 'ARS' : 'USD';
  const comparison = comparePrices(budget, offerPrice, cur);
  const abs = Math.abs(comparison.diff);
  const amount =
    cur === 'ARS'
      ? `$${abs.toLocaleString('es-AR')} ARS`
      : `US$${abs.toLocaleString('en-US')}`;

  if (locale === 'EN') {
    if (comparison.status === 'at') return 'Within your budget';
    if (comparison.status === 'under') return `${amount} below your budget`;
    return `${amount} above your budget`;
  }

  if (comparison.status === 'at') return 'Dentro de tu presupuesto';
  if (comparison.status === 'under') return `${amount} por debajo de tu presupuesto`;
  return `${amount} por encima de tu presupuesto`;
}
