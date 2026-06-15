export type MoneyInputLocale = 'en-US' | 'es-AR';

export function moneyInputLocale(currency: 'USD' | 'ARS'): MoneyInputLocale {
  return currency === 'ARS' ? 'es-AR' : 'en-US';
}

export function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, '');
}

export function formatMoneyInputDigits(digits: string, locale: MoneyInputLocale = 'en-US'): string {
  if (!digits) return '';
  const n = Number.parseInt(digits, 10);
  if (Number.isNaN(n)) return '';
  return n.toLocaleString(locale);
}

export function parseMoneyInput(value: string): number {
  const digits = digitsOnly(value);
  if (!digits) return Number.NaN;
  return Number.parseInt(digits, 10);
}
