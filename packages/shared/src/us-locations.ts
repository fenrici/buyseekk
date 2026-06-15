/**
 * US launch location model: State → Area → Neighborhood (real estate only).
 * Autos use State + Area; selecting an area matches the full metro (see US_AREA_EXPANSION).
 */

export const US_STATE_CODES = ['FL', 'TX', 'CA', 'NY', 'AZ', 'NV', 'GA', 'NC'] as const;
export type UsStateCode = (typeof US_STATE_CODES)[number];

export const US_STATE_LABELS: Record<UsStateCode, string> = {
  FL: 'Florida',
  TX: 'Texas',
  CA: 'California',
  NY: 'New York',
  AZ: 'Arizona',
  NV: 'Nevada',
  GA: 'Georgia',
  NC: 'North Carolina',
};

export const US_AREAS_BY_STATE: Record<UsStateCode, readonly string[]> = {
  FL: ['Miami', 'Orlando', 'Tampa', 'Jacksonville', 'Palm Beach', 'Southwest Florida'],
  TX: ['Dallas', 'Houston', 'Austin', 'San Antonio'],
  CA: ['Los Angeles', 'San Diego', 'San Francisco', 'Sacramento'],
  NY: ['New York City', 'Buffalo', 'Albany'],
  AZ: ['Phoenix', 'Scottsdale'],
  NV: ['Las Vegas'],
  GA: ['Atlanta'],
  NC: ['Charlotte', 'Raleigh'],
};

/** Canonical storage key: "{area}, {ST}" */
export function formatUsAreaLocation(state: UsStateCode, area: string): string {
  return `${area}, ${state}`;
}

export function parseUsAreaLocation(
  value: string | null | undefined,
): { state: UsStateCode; area: string } | null {
  if (!value?.trim()) return null;
  const match = value.trim().match(/^(.+?),\s*([A-Z]{2})$/);
  if (!match) return null;
  const state = match[2] as UsStateCode;
  if (!US_STATE_CODES.includes(state)) return null;
  return { state, area: match[1].trim() };
}

/** @deprecated Use parseUsAreaLocation — kept for profile city field compat */
export function parseUsCityState(value: string | null | undefined) {
  const parsed = parseUsAreaLocation(value);
  if (!parsed) return null;
  return { city: parsed.area, state: parsed.state };
}

export function formatUsCityState(city: string, state: string): string {
  return formatUsAreaLocation(state as UsStateCode, city);
}

export function usStateLabel(state: string): string {
  return US_STATE_LABELS[state as UsStateCode] ?? state;
}

export function areasForUsState(state: UsStateCode): readonly string[] {
  return US_AREAS_BY_STATE[state] ?? [];
}

/** Neighborhoods for real estate — keyed by canonical area location */
export const US_NEIGHBORHOODS_BY_AREA: Record<string, readonly string[]> = {
  'Miami, FL': [
    'Brickell',
    'Downtown Miami',
    'Edgewater',
    'Wynwood',
    'Coconut Grove',
    'Coral Gables',
    'Key Biscayne',
    'Sunny Isles Beach',
    'Aventura',
    'Bal Harbour',
    'Miami Beach',
    'South Beach',
    'Doral',
    'Kendall',
    'Pinecrest',
  ],
};

export function neighborhoodsForUsArea(state: UsStateCode, area: string): readonly string[] {
  return US_NEIGHBORHOODS_BY_AREA[formatUsAreaLocation(state, area)] ?? [];
}

/**
 * Legacy and granular location strings that belong to a metro area.
 * Filter by "Miami, FL" matches all of these for autos.
 */
export const US_AREA_EXPANSION: Record<string, readonly string[]> = {
  'Miami, FL': [
    'Miami, FL',
    'Miami Beach, FL',
    'Miami',
    'Miami Beach',
    'Brickell',
    'Doral',
    'Coral Gables',
    'Aventura',
    'Hialeah',
    'Kendall',
    'Homestead',
    'Fort Lauderdale, FL',
    'Fort Lauderdale',
    'Hollywood, FL',
    'Hollywood',
    'Pembroke Pines, FL',
    'Pembroke Pines',
    'Sunny Isles Beach, FL',
    'Sunny Isles Beach',
  ],
};

/** All canonical area locations for dropdowns (flat list). */
export function allUsAreaLocations(): string[] {
  const out: string[] = [];
  for (const state of US_STATE_CODES) {
    for (const area of US_AREAS_BY_STATE[state]) {
      out.push(formatUsAreaLocation(state, area));
    }
  }
  return out;
}

export function isUsAreaLocation(location: string): boolean {
  return parseUsAreaLocation(location) !== null;
}

/** Map legacy/granular location to canonical area key. */
export function normalizeUsAreaLocation(location: string): string {
  const parsed = parseUsAreaLocation(location);
  if (parsed) return formatUsAreaLocation(parsed.state, parsed.area);

  for (const [canonical, aliases] of Object.entries(US_AREA_EXPANSION)) {
    if (aliases.includes(location)) return canonical;
  }

  return location;
}

/** Prisma `in` values when filtering by area (includes legacy locations). */
export function expandUsAreaFilter(filterLocation: string): string[] {
  const canonical = normalizeUsAreaLocation(filterLocation);
  const expanded = US_AREA_EXPANSION[canonical];
  if (expanded) return [...new Set([canonical, ...expanded])];
  return [canonical];
}

export function locationMatchesUsAreaFilter(
  requestLocation: string,
  filterLocation: string,
): boolean {
  if (!filterLocation) return true;
  const expanded = expandUsAreaFilter(filterLocation);
  if (expanded.includes(requestLocation)) return true;
  return normalizeUsAreaLocation(requestLocation) === normalizeUsAreaLocation(filterLocation);
}

export function isValidUsAreaLocation(location: string): boolean {
  const parsed = parseUsAreaLocation(location);
  if (!parsed) return false;
  return US_AREAS_BY_STATE[parsed.state]?.includes(parsed.area) ?? false;
}

export function isValidUsNeighborhood(state: UsStateCode, area: string, neighborhood: string): boolean {
  const list = neighborhoodsForUsArea(state, area);
  return list.includes(neighborhood);
}

/** Display: "Miami · Florida" */
export function formatUsAreaDisplay(location: string): string {
  const parsed = parseUsAreaLocation(location);
  if (!parsed) return location;
  return `${parsed.area} · ${usStateLabel(parsed.state)}`;
}

/** @deprecated */
export function citiesForUsState(state: UsStateCode): string[] {
  return [...areasForUsState(state)];
}
