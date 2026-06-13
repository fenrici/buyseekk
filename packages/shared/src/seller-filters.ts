/** Estado de filtros del panel vendedor (Explorar solicitudes). */
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
