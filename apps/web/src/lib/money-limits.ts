import { formatMoney } from '@/lib/api';
import { isValidMoneyAmount, maxAmountFor, type Currency } from '@buyseekk/shared';

export function budgetLimitErrorKey(
  amount: number,
  currency: Currency,
  isRent = false,
): string | null {
  if (isValidMoneyAmount(amount, currency, isRent)) return null;
  return 'request.budgetMax';
}

export function budgetMaxLabel(currency: Currency, isRent = false): string {
  const max = maxAmountFor(currency, isRent);
  const period = isRent ? '/mes' : '';
  return formatMoney(max, currency, period);
}
