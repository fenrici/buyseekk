import type { Currency } from './types';

/** Compra — tope por moneda. */
export const MAX_BUDGET_USD = 25_000_000;
export const MAX_BUDGET_ARS = 25_000_000_000;

/** Alquiler mensual — tope por moneda. */
export const MAX_RENT_BUDGET_USD = 100_000;
export const MAX_RENT_BUDGET_ARS = 100_000_000;

export function maxAmountFor(currency: Currency, isRent = false): number {
  if (isRent) {
    return currency === 'USD' ? MAX_RENT_BUDGET_USD : MAX_RENT_BUDGET_ARS;
  }
  return currency === 'USD' ? MAX_BUDGET_USD : MAX_BUDGET_ARS;
}

export function isValidMoneyAmount(
  amount: number,
  currency: Currency,
  isRent = false,
): boolean {
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount < 1) return false;
  return amount <= maxAmountFor(currency, isRent);
}
