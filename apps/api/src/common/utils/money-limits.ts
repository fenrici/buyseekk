import { BadRequestException } from '@nestjs/common';
import { Currency, isValidMoneyAmount, maxAmountFor } from '@buyseekk/shared';

function formatMax(currency: Currency, max: number) {
  return currency === 'ARS'
    ? `$${max.toLocaleString('es-AR')} ARS`
    : `$${max.toLocaleString('en-US')} USD`;
}

export function assertValidMoneyAmount(
  amount: number,
  currency: Currency,
  fieldLabel: string,
  isRent = false,
) {
  if (!isValidMoneyAmount(amount, currency, isRent)) {
    const max = maxAmountFor(currency, isRent);
    const period = isRent ? ' (por mes)' : '';
    throw new BadRequestException(
      `El monto de ${fieldLabel} debe estar entre 1 y ${formatMax(currency, max)}${period}.`,
    );
  }
}
