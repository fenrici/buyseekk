'use client';

import {
  CAR_BRAND_LIST,
  CAR_COLOR_NO_PREFERENCE,
  CAR_CONDITION_NEW,
  carColorOptions,
  carMileagePreferenceValue,
  carYearPresets,
  formatCarConditionLabel,
  MILEAGE_PRESETS,
  mileagePresetLabel,
  modelsForBrand,
  parseCarMileagePreference,
} from '@buyseekk/shared';
import { useLocale, useT } from '@/lib/i18n';

export type AutoFilterValues = {
  carBrand: string;
  carModel: string;
  carColor: string;
  carYearMin: string;
  carCondition: string;
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
  const locale = useLocale();
  if (!visible) return null;

  const models = values.carBrand ? modelsForBrand(values.carBrand) : [];
  const mileagePreference = carMileagePreferenceValue(values.carCondition, values.maxMileage ? parseInt(values.maxMileage, 10) : null);

  function set(field: keyof AutoFilterValues, value: string) {
    const next = { ...values, [field]: value };
    if (field === 'carBrand') next.carModel = '';
    onChange(next);
  }

  function setMileagePreference(value: string) {
    const parsed = parseCarMileagePreference(value);
    onChange({
      ...values,
      carCondition: parsed.carCondition ?? '',
      maxMileage: parsed.maxMileage != null ? String(parsed.maxMileage) : '',
    });
  }

  return (
    <div className={`card seller-filter-advanced ${compact ? 'mt-0' : 'mt-4'} p-4`}>
      <p className="text-sm font-bold text-slate-700">{t('seller.filterAutos')}</p>
      <div className={`mt-3 grid gap-3 ${compact ? 'grid-cols-1' : 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'}`}>
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
            {carColorOptions()
              .filter((c) => c !== CAR_COLOR_NO_PREFERENCE)
              .map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-500">{t('request.carYearFrom')}</span>
          <select
            className="input mt-1 w-full"
            value={values.carYearMin}
            onChange={(e) => set('carYearMin', e.target.value)}
          >
            <option value="">{t('seller.anyYear')}</option>
            {carYearPresets().map((y) => (
              <option key={y} value={String(y)}>{t('request.yearOrNewer', { year: String(y) })}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-500">{t('seller.maxMileage')}</span>
          <select
            className="input mt-1 w-full"
            value={mileagePreference}
            onChange={(e) => setMileagePreference(e.target.value)}
          >
            <option value="">{t('seller.anyMileage')}</option>
            <option value={CAR_CONDITION_NEW}>{formatCarConditionLabel(locale)}</option>
            {MILEAGE_PRESETS.map((m) => (
              <option key={m} value={String(m)}>
                {mileagePresetLabel(m, locale)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
