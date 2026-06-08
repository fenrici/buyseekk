type Props = {
  value: number;
  max?: number;
  size?: 'sm' | 'md';
  showValue?: boolean;
  interactive?: boolean;
  onChange?: (value: number) => void;
};

export function StarRating({
  value,
  max = 5,
  size = 'sm',
  showValue = true,
  interactive = false,
  onChange,
}: Props) {
  const sizeClass = size === 'md' ? 'text-xl' : 'text-sm';

  return (
    <span className={`inline-flex items-center gap-0.5 ${sizeClass}`}>
      {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onChange?.(star)}
          className={`${interactive ? 'cursor-pointer transition hover:scale-110' : 'cursor-default'} ${
            star <= Math.round(value) ? 'text-amber-400' : 'text-slate-300'
          }`}
        >
          ★
        </button>
      ))}
      {showValue && value > 0 && (
        <span className="ml-1 text-xs font-semibold text-slate-500">{value.toFixed(1)}</span>
      )}
    </span>
  );
}
