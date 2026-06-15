import type { SellerFilterState } from '@buyseekk/shared';
import { formatUsAreaDisplay } from '@buyseekk/shared';

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
  if (state.location) {
    chips.push({ key: 'location', label: formatUsAreaDisplay(state.location) });
  }
  if (state.zone) chips.push({ key: 'zone', label: state.zone });
  const cat = lockedCategory || state.category;
  if (cat !== 'AUTOS') {
    if (state.bedrooms) chips.push({ key: 'bedrooms', label: `${state.bedrooms} ${t('seller.filterBedroomsShort')}` });
    if (state.minSqm) chips.push({ key: 'minSqm', label: `≥ ${state.minSqm} m²` });
    if (state.maxSqm) chips.push({ key: 'maxSqm', label: `≤ ${state.maxSqm} m²` });
  }
  if (cat !== 'INMOBILIARIA') {
    if (state.carBrand) chips.push({ key: 'carBrand', label: state.carBrand });
    if (state.carModel) chips.push({ key: 'carModel', label: state.carModel });
    if (state.carColor) chips.push({ key: 'carColor', label: state.carColor });
    if (state.carYearMin) chips.push({ key: 'carYearMin', label: `≥ ${state.carYearMin}` });
    if (state.maxMileage) chips.push({ key: 'maxMileage', label: `≤ ${state.maxMileage} km` });
  }
  return chips;
}

/** Resumen legible para modal de guardar búsqueda. */
export function summarizeSellerFilters(
  state: SellerFilterState,
  lockedCategory: string | null | undefined,
  t: (key: string, vars?: Record<string, string | number>) => string,
) {
  return buildSellerFilterChips(state, lockedCategory, t).map((c) => c.label);
}
