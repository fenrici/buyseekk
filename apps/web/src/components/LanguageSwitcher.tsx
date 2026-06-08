'use client';

import { Locale, setGuestLocale, useLocale } from '@/lib/i18n';
import { useAuth } from '@/providers/AuthProvider';

const OPTIONS: { value: Locale; label: string }[] = [
  { value: 'ES', label: 'ES' },
  { value: 'EN', label: 'EN' },
];

export function LanguageSwitcher() {
  const { user, loading } = useAuth();
  const locale = useLocale();

  if (loading || user) return null;

  return (
    <div
      className="flex rounded-lg border border-[var(--border)] bg-white p-0.5 text-xs font-bold"
      role="group"
      aria-label="Language"
    >
      {OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => setGuestLocale(value)}
          className={`rounded-md px-2.5 py-1.5 transition ${
            locale === value
              ? 'bg-[var(--primary)] text-white'
              : 'text-[var(--text-muted)] hover:text-[var(--text)]'
          }`}
          aria-pressed={locale === value}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
