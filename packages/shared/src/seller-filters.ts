/** Estado de filtros del panel vendedor (Explorar solicitudes). */
import {
  locationMatchesUsAreaFilter,
} from './us-locations';

export type SellerFilterState = {
  category: string;
  operation: string;
  location: string;
  zone: string;
  bedrooms: string;
  minSqm: string;
  maxSqm: string;
  carBrand: string;
  carModel: string;
  carColor: string;
  carYearMin: string;
  maxMileage: string;
};

export const EMPTY_SELLER_FILTERS: SellerFilterState = {
  category: '',
  operation: '',
  location: '',
  zone: '',
  bedrooms: '',
  minSqm: '',
  maxSqm: '',
  carBrand: '',
  carModel: '',
  carColor: '',
  carYearMin: '',
  maxMileage: '',
};

export type SellerFilterChip = {
  key: keyof SellerFilterState;
  label: string;
};

function effectiveCategory(state: SellerFilterState, lockedCategory?: string | null) {
  return lockedCategory || state.category;
}

/** Cuenta filtros activos (excluye categoría bloqueada por perfil de vendedor). */
export function countActiveSellerFilters(
  state: SellerFilterState,
  lockedCategory?: string | null,
): number {
  let n = 0;
  if (!lockedCategory && state.category) n++;
  if (state.operation) n++;
  if (state.location) n++;
  if (state.zone) n++;
  const cat = effectiveCategory(state, lockedCategory);
  if (cat !== 'AUTOS') {
    if (state.bedrooms) n++;
    if (state.minSqm) n++;
    if (state.maxSqm) n++;
  }
  if (cat !== 'INMOBILIARIA') {
    if (state.carBrand) n++;
    if (state.carModel) n++;
    if (state.carColor) n++;
    if (state.carYearMin) n++;
    if (state.maxMileage) n++;
  }
  return n;
}

export function clearSellerFilter(state: SellerFilterState, key: keyof SellerFilterState): SellerFilterState {
  const next = { ...state, [key]: '' };
  if (key === 'location') next.zone = '';
  if (key === 'carBrand') next.carModel = '';
  return next;
}

export function clearAllSellerFilters(lockedCategory?: string | null): SellerFilterState {
  return lockedCategory ? { ...EMPTY_SELLER_FILTERS, category: lockedCategory } : { ...EMPTY_SELLER_FILTERS };
}

export function sellerFiltersEqual(a: SellerFilterState, b: SellerFilterState): boolean {
  return (Object.keys(EMPTY_SELLER_FILTERS) as (keyof SellerFilterState)[]).every((k) => a[k] === b[k]);
}

/** Convierte estado a query params para GET /requests (vendedor). */
export function sellerFiltersToSearchParams(
  state: SellerFilterState,
  lockedCategory?: string | null,
  page = 1,
): URLSearchParams {
  const params = new URLSearchParams();
  params.set('page', String(page));
  const cat = effectiveCategory(state, lockedCategory);
  if (!lockedCategory && state.category) params.set('category', state.category);
  if (state.operation) params.set('operation', state.operation);
  if (state.location) params.set('location', state.location);
  if (state.zone) params.set('zone', state.zone);
  if (cat !== 'AUTOS') {
    if (state.bedrooms) params.set('bedrooms', state.bedrooms);
    if (state.minSqm) params.set('minSqm', state.minSqm);
    if (state.maxSqm) params.set('maxSqm', state.maxSqm);
  }
  if (cat !== 'INMOBILIARIA') {
    if (state.carBrand) params.set('carBrand', state.carBrand);
    if (state.carModel) params.set('carModel', state.carModel);
    if (state.carColor) params.set('carColor', state.carColor);
    if (state.carYearMin) params.set('carYearMin', state.carYearMin);
    if (state.maxMileage) params.set('maxMileage', state.maxMileage);
  }
  return params;
}

export function parseSellerFiltersJson(raw: unknown): SellerFilterState | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const next = { ...EMPTY_SELLER_FILTERS };
  for (const key of Object.keys(EMPTY_SELLER_FILTERS) as (keyof SellerFilterState)[]) {
    const v = o[key];
    if (typeof v === 'string') next[key] = v;
    else if (typeof v === 'number') next[key] = String(v);
  }
  return next;
}

/** Campos de una solicitud usados para comparar con filtros guardados del vendedor. */
export type MatchableRequest = {
  category: string;
  country: string;
  operation: string;
  location: string;
  zone: string | null;
  bedrooms: number | null;
  minSqm: number | null;
  maxSqm: number | null;
  carBrand: string | null;
  carModel: string | null;
  carColor: string | null;
  carYearMin: number | null;
  maxMileage: number | null;
};

/**
 * Compara una solicitud contra filtros de SavedSearch.
 * Filtros vacíos se ignoran; la categoría puede venir del registro SavedSearch.
 * Replica la lógica de listForSeller en el API.
 */
export function requestMatchesSellerFilters(
  request: MatchableRequest,
  filters: SellerFilterState,
  opts: { sellerCountry: string; savedCategory?: string | null },
): boolean {
  if (request.country !== opts.sellerCountry) return false;
  if (countActiveSellerFilters(filters, opts.savedCategory) === 0) return false;

  const category = opts.savedCategory || filters.category || null;
  if (category && request.category !== category) return false;

  if (filters.operation && request.operation !== filters.operation) return false;
  if (filters.location) {
    if (opts.sellerCountry === 'US') {
      if (!locationMatchesUsAreaFilter(request.location, filters.location)) return false;
    } else if (request.location !== filters.location) {
      return false;
    }
  }
  if (filters.zone && request.zone !== filters.zone) return false;

  const cat = category || request.category;

  if (cat !== 'INMOBILIARIA' && request.category === 'AUTOS') {
    if (filters.carBrand && request.carBrand !== filters.carBrand) return false;
    if (filters.carModel && request.carModel !== filters.carModel) return false;
    if (filters.carColor && request.carColor !== filters.carColor) return false;

    if (filters.carYearMin) {
      const year = parseInt(filters.carYearMin, 10);
      if (!isNaN(year) && request.carYearMin != null && request.carYearMin > year) return false;
    }
    if (filters.maxMileage) {
      const mileage = parseInt(filters.maxMileage, 10);
      if (!isNaN(mileage) && request.maxMileage != null && request.maxMileage > mileage) return false;
    }
  }

  if (cat !== 'AUTOS' && request.category === 'INMOBILIARIA') {
    if (filters.bedrooms) {
      const bedrooms = parseInt(filters.bedrooms, 10);
      if (!isNaN(bedrooms) && request.bedrooms !== bedrooms) return false;
    }
    if (filters.minSqm) {
      const minSqm = parseInt(filters.minSqm, 10);
      if (!isNaN(minSqm) && request.minSqm != null && request.minSqm > minSqm) return false;
    }
    if (filters.maxSqm) {
      const maxSqm = parseInt(filters.maxSqm, 10);
      if (!isNaN(maxSqm) && request.maxSqm != null && request.maxSqm < maxSqm) return false;
    }
  }

  return true;
}
