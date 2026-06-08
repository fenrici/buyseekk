'use client';

import { zonesForCountryAndCity } from '@buyseekk/shared';
import { User } from '@/lib/types';
import { useT } from '@/lib/i18n';

export function ZoneChips({
  country,
  city,
  value,
  onChange,
}: {
  country: User['country'];
  city: string;
  value: string;
  onChange: (zone: string) => void;
}) {
  const t = useT();

  if (!city) {
    return (
      <p className="mt-2 text-sm text-slate-400">{t('seller.pickCityForZones')}</p>
    );
  }

  const zones = zonesForCountryAndCity(country, city);

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onChange('')}
        className={`rounded-full px-4 py-2 text-sm font-semibold ${value === '' ? 'bg-amber-600 text-white' : 'border bg-white'}`}
      >
        {t('seller.allZones')}
      </button>
      {zones.map((z) => (
        <button
          key={z}
          type="button"
          onClick={() => onChange(z)}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${value === z ? 'bg-amber-600 text-white' : 'border bg-white'}`}
        >
          {z}
        </button>
      ))}
    </div>
  );
}
