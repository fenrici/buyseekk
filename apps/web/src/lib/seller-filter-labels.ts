import type { SellerFilterState } from '@buyseekk/shared';
import {
  CAR_CONDITION_NEW,
  formatCarConditionLabel,
  formatCarYearMinLabel,
  formatMaxMileageLabel,
  formatMaxSqmLabel,
  formatMinSqmLabel,
  formatUsAreaDisplay,
  mileagePresetLabel,
  usStateLabel,
} from '@buyseekk/shared';
import type { User } from '@/lib/types';

export type SavedSearchItem = {
  id: string;
  name: string;
  category: 'AUTOS' | 'INMOBILIARIA' | null;
  filters: SellerFilterState;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Genera chips con etiquetas legibles para la barra compacta. */
export function buildSellerFilterChips(
  state: SellerFilterState,
  lockedCategory: string | null | undefined,
  t: (key: string, vars?: Record<string, string | number>) => string,
  locale: User['locale'] = 'ES',
) {
  const chips: { key: keyof SellerFilterState; label: string }[] = [];
  if (!lockedCategory && state.category) {
    chips.push({
      key: 'category',
      label: state.category === 'AUTOS' ? t('seller.autos') : t('seller.realEstate'),
    });
  }
  if (state.operation) {
    chips.push({
      key: 'operation',
      label: state.operation === 'ALQUILER' ? t('request.rent') : t('request.buy'),
    });
  }
  if (state.state) {
    chips.push({ key: 'state', label: usStateLabel(state.state) });
  }
  if (state.location) {
    chips.push({ key: 'location', label: formatUsAreaDisplay(state.location) });
  }
  if (state.zone) chips.push({ key: 'zone', label: state.zone });
  const cat = lockedCategory || state.category;
  if (cat !== 'AUTOS') {
    if (state.bedrooms) chips.push({ key: 'bedrooms', label: `${state.bedrooms} ${t('seller.filterBedroomsShort')}` });
    if (state.minSqm) {
      chips.push({
        key: 'minSqm',
        label: formatMinSqmLabel(parseInt(state.minSqm, 10), locale) ?? state.minSqm,
      });
    }
    if (state.maxSqm) {
      chips.push({
        key: 'maxSqm',
        label: formatMaxSqmLabel(parseInt(state.maxSqm, 10), locale) ?? state.maxSqm,
      });
    }
  }
  if (cat !== 'INMOBILIARIA') {
    if (state.carBrand) chips.push({ key: 'carBrand', label: state.carBrand });
    if (state.carModel) chips.push({ key: 'carModel', label: state.carModel });
    if (state.carColor) chips.push({ key: 'carColor', label: state.carColor });
    if (state.carYearMin) {
      const year = parseInt(state.carYearMin, 10);
      chips.push({
        key: 'carYearMin',
        label: formatCarYearMinLabel(year, locale) ?? state.carYearMin,
      });
    }
    if (state.carCondition === CAR_CONDITION_NEW) {
      chips.push({ key: 'carCondition', label: formatCarConditionLabel(locale) });
    } else if (state.maxMileage) {
      const mileage = parseInt(state.maxMileage, 10);
      chips.push({
        key: 'maxMileage',
        label: formatMaxMileageLabel(mileage, locale) ?? mileagePresetLabel(mileage, locale),
      });
    }
  }
  return chips;
}

/** Resumen legible para modal de guardar búsqueda. */
export function summarizeSellerFilters(
  state: SellerFilterState,
  lockedCategory: string | null | undefined,
  t: (key: string, vars?: Record<string, string | number>) => string,
  locale: User['locale'] = 'ES',
) {
  return buildSellerFilterChips(state, lockedCategory, t, locale).map((c) => c.label);
}
