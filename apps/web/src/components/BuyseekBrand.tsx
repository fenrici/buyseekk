'use client';

type Props = {
  /** Display cache: show integrated superscript + for Plus members. */
  plus?: boolean;
  variant?: 'portal' | 'light';
  className?: string;
};

/** Buyseek wordmark with optional premium superscript + (display only). */
export function BuyseekBrand({ plus = false, variant = 'portal', className }: Props) {
  const plusMark = plus ? (
    <span className="brand-plus-mark" aria-hidden>
      +
    </span>
  ) : null;

  if (variant === 'light') {
    return (
      <span
        className={`buyseek-brand buyseek-brand--light${plus ? ' buyseek-brand--plus' : ''}${className ? ` ${className}` : ''}`}
      >
        <span className="buyseek-brand__icon" aria-hidden>
          ⇄
        </span>{' '}
        Buyseek{plusMark}
      </span>
    );
  }

  return (
    <span
      className={`portal-logo-text${plus ? ' portal-logo-text--plus' : ''}${className ? ` ${className}` : ''}`}
    >
      Buyseek{plusMark}
    </span>
  );
}
