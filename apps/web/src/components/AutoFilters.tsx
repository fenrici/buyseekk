'use client';

import { CAR_BRAND_LIST, CAR_COLORS, MILEAGE_PRESETS, modelsForBrand } from '@buyseekk/shared';
import { useT } from '@/lib/i18n';

export type AutoFilterValues = {
  carBrand: string;
  carModel: string;
  carColor: string;
  maxMileage: string;
};

export function AutoFilters({
  values,
  onChange,
  visible,
  compact = false,
}: {
  values: AutoFilterValues;
  onChange: (next: AutoFilterValues) => void;
  visible: boolean;
  compact?: boolean;
}) {
  const t = useT();
  if (!visible) return null;

  const models = values.carBrand ? modelsForBrand(values.carBrand) : [];

  function set(field: keyof AutoFilterValues, value: string) {
    const next = { ...values, [field]: value };
    if (field === 'carBrand') next.carModel = '';
    onChange(next);
  }

  return (
    <div className={`card seller-filter-advanced ${compact ? 'mt-0' : 'mt-4'} p-4`}>
      <p className="text-sm font-bold text-slate-700">{t('seller.filterAutos')}</p>
      <div className={`mt-3 grid gap-3 ${compact ? 'grid-cols-1' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
        <label className="block">
          <span className="text-xs font-semibold text-slate-500">{t('seller.brand')}</span>
          <select
            className="input mt-1 w-full"
            value={values.carBrand}
            onChange={(e) => set('carBrand', e.target.value)}
          >
            <option value="">{t('seller.allBrands')}</option>
            {CAR_BRAND_LIST.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-500">{t('seller.model')}</span>
          <select
            className="input mt-1 w-full"
            value={values.carModel}
            onChange={(e) => set('carModel', e.target.value)}
            disabled={!values.carBrand}
          >
            <option value="">{t('seller.allModels')}</option>
            {models.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-500">{t('seller.color')}</span>
          <select
            className="input mt-1 w-full"
            value={values.carColor}
            onChange={(e) => set('carColor', e.target.value)}
          >
            <option value="">{t('seller.allColors')}</option>
            {CAR_COLORS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-500">{t('seller.maxMileage')}</span>
          <select
            className="input mt-1 w-full"
            value={values.maxMileage}
            onChange={(e) => set('maxMileage', e.target.value)}
          >
            <option value="">{t('seller.anyMileage')}</option>
            {MILEAGE_PRESETS.map((m) => (
              <option key={m} value={String(m)}>
                ≤ {m.toLocaleString()} {t('seller.miles')}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
