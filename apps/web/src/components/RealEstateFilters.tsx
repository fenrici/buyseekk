'use client';

import { BEDROOM_OPTIONS, SQM_PRESETS } from '@buyseekk/shared';
import { useT } from '@/lib/i18n';

export type RealEstateFilterValues = {
  bedrooms: string;
  minSqm: string;
  maxSqm: string;
};

export function RealEstateFilters({
  values,
  onChange,
  visible,
  compact = false,
}: {
  values: RealEstateFilterValues;
  onChange: (next: RealEstateFilterValues) => void;
  visible: boolean;
  compact?: boolean;
}) {
  const t = useT();
  if (!visible) return null;

  function set(field: keyof RealEstateFilterValues, value: string) {
    onChange({ ...values, [field]: value });
  }

  return (
    <div className={`card seller-filter-advanced ${compact ? 'mt-0' : 'mt-4'} p-4`}>
      <p className="text-sm font-bold text-slate-700">{t('seller.filterRealEstate')}</p>
      <div className={`mt-3 grid gap-3 ${compact ? 'grid-cols-1' : 'sm:grid-cols-3'}`}>
        <label className="block">
          <span className="text-xs font-semibold text-slate-500">{t('request.bedrooms')}</span>
          <select
            className="input mt-1 w-full"
            value={values.bedrooms}
            onChange={(e) => set('bedrooms', e.target.value)}
          >
            <option value="">{t('seller.allBedrooms')}</option>
            {BEDROOM_OPTIONS.map((n) => (
              <option key={n} value={String(n)}>
                {n} {t('request.bedroomsShort')}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-500">{t('seller.myMinSqm')}</span>
          <select
            className="input mt-1 w-full"
            value={values.minSqm}
            onChange={(e) => set('minSqm', e.target.value)}
          >
            <option value="">{t('seller.anySqm')}</option>
            {SQM_PRESETS.map((n) => (
              <option key={n} value={String(n)}>
                ≥ {n} m²
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-500">{t('seller.myMaxSqm')}</span>
          <select
            className="input mt-1 w-full"
            value={values.maxSqm}
            onChange={(e) => set('maxSqm', e.target.value)}
          >
            <option value="">{t('seller.anySqm')}</option>
            {SQM_PRESETS.map((n) => (
              <option key={n} value={String(n)}>
                ≤ {n} m²
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
