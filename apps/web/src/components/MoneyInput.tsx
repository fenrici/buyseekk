'use client';

import {
  digitsOnly,
  formatMoneyInputDigits,
  type MoneyInputLocale,
} from '@/lib/money-input';

type Props = {
  value: string;
  onChange: (digits: string) => void;
  locale?: MoneyInputLocale;
  className?: string;
  placeholder?: string;
  required?: boolean;
  id?: string;
  inputMode?: 'numeric' | 'decimal';
};

export function MoneyInput({
  value,
  onChange,
  locale = 'en-US',
  className = 'input w-full',
  placeholder,
  required,
  id,
  inputMode = 'numeric',
}: Props) {
  return (
    <input
      id={id}
      className={className}
      type="text"
      inputMode={inputMode}
      autoComplete="off"
      placeholder={placeholder}
      value={formatMoneyInputDigits(value, locale)}
      onChange={(e) => onChange(digitsOnly(e.target.value))}
      required={required}
    />
  );
}
