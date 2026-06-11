type Props = {
  message: string;
  className?: string;
};

/** Muestra una alerta por línea cuando hay varias validaciones (separadas por \\n). */
export function ValidationAlerts({ message, className = '' }: Props) {
  const items = message.split('\n').map((line) => line.trim()).filter(Boolean);
  if (!items.length) return null;

  return (
    <div className={`space-y-2 ${className}`.trim()}>
      {items.map((text, i) => (
        <p key={i} className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {text}
        </p>
      ))}
    </div>
  );
}
