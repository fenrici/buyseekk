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
    <div className="explore-pills mt-2">
      <button
        type="button"
        onClick={() => onChange('')}
        className={`explore-pill ${value === '' ? 'active' : ''}`}
        aria-pressed={value === ''}
      >
        {t('seller.allZones')}
      </button>
      {zones.map((z) => (
        <button
          key={z}
          type="button"
          onClick={() => onChange(z)}
          className={`explore-pill ${value === z ? 'active' : ''}`}
          aria-pressed={value === z}
        >
          {z}
        </button>
      ))}
    </div>
  );
}
