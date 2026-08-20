/**
 * US request location model: State → City/Market → Area.
 * Area lists live in US_AREAS_BY_CITY. Empty/null request zone means any area in the city.
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

/**
 * Full city catalogs for profile / future expansion.
 * Request create/edit/filters use US_REQUEST_LAUNCH_* only.
 */
export const US_AREAS_BY_STATE: Record<UsStateCode, readonly string[]> = {
  FL: [
    'Miami',
    'Fort Lauderdale',
    'West Palm Beach',
    'Orlando',
    'Tampa',
    'St. Petersburg',
    'Naples',
    'Fort Myers',
    'Sarasota',
    'Jacksonville',
  ],
  TX: ['Dallas', 'Houston', 'Austin', 'San Antonio'],
  CA: ['Los Angeles', 'San Diego', 'San Francisco', 'Sacramento'],
  NY: ['New York City', 'Buffalo', 'Albany'],
  AZ: ['Phoenix', 'Scottsdale'],
  NV: ['Las Vegas'],
  GA: ['Atlanta'],
  NC: ['Charlotte', 'Raleigh'],
};

/**
 * Launch config for request location (buyer create/edit + seller filters).
 * UI and API validation use only these — extend when new markets go live.
 */
export const US_REQUEST_LAUNCH_STATE_CODES = ['FL'] as const satisfies readonly UsStateCode[];
export type UsRequestLaunchStateCode = (typeof US_REQUEST_LAUNCH_STATE_CODES)[number];

/** Canonical Florida launch markets (exact location keys: "{Market}, FL"). */
export const US_REQUEST_LAUNCH_MARKETS_BY_STATE: Record<UsRequestLaunchStateCode, readonly string[]> = {
  FL: [
    'Miami',
    'Fort Lauderdale',
    'West Palm Beach',
    'Orlando',
    'Tampa',
    'St. Petersburg',
    'Naples',
    'Fort Myers',
    'Sarasota',
    'Jacksonville',
  ],
};

export function launchStatesForUsRequests(): readonly UsRequestLaunchStateCode[] {
  return US_REQUEST_LAUNCH_STATE_CODES;
}

export function isLaunchUsRequestState(state: string | null | undefined): state is UsRequestLaunchStateCode {
  return !!state && (US_REQUEST_LAUNCH_STATE_CODES as readonly string[]).includes(state);
}

export function launchMarketsForUsState(state: string): readonly string[] {
  if (!isLaunchUsRequestState(state)) return [];
  return US_REQUEST_LAUNCH_MARKETS_BY_STATE[state];
}

export function launchCityLocationsForUsState(state: string): string[] {
  return launchMarketsForUsState(state).map((city) =>
    formatUsAreaLocation(state as UsStateCode, city),
  );
}

export function allLaunchUsRequestLocations(): string[] {
  const out: string[] = [];
  for (const state of US_REQUEST_LAUNCH_STATE_CODES) {
    out.push(...launchCityLocationsForUsState(state));
  }
  return out;
}

export function isLaunchUsRequestLocation(location: string): boolean {
  const parsed = parseUsAreaLocation(location);
  if (!parsed || !isLaunchUsRequestState(parsed.state)) return false;
  return launchMarketsForUsState(parsed.state).includes(parsed.area);
}

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

/**
 * Request areas (zona) by city/market. Easy to extend: add a key "{City}, {ST}".
 * "Cualquier zona" is not listed — it is represented as a null/empty zone.
 */
export const US_AREAS_BY_CITY: Record<string, readonly string[]> = {
  'Miami, FL': [
    'Brickell',
    'Downtown Miami',
    'Edgewater',
    'Wynwood',
    'Design District',
    'Coconut Grove',
    'Coral Gables',
    'Doral',
    'Kendall',
    'Miami Beach',
    'Aventura',
    'Sunny Isles',
    'North Miami',
    'Key Biscayne',
  ],
  'Fort Lauderdale, FL': [
    'Downtown Fort Lauderdale',
    'Las Olas',
    'Victoria Park',
    'Coral Ridge',
    'Rio Vista',
    'Harbor Beach',
    'Galt Ocean Mile',
    'Sailboat Bend',
    'Flagler Village',
    'Wilton Manors',
  ],
  'West Palm Beach, FL': [
    'Downtown West Palm Beach',
    'CityPlace',
    'Flamingo Park',
    'El Cid',
    'Northwood',
    'Palm Beach Gardens',
    'Jupiter',
    'Boca Raton',
    'Delray Beach',
    'Boynton Beach',
  ],
  'Orlando, FL': [
    'Downtown Orlando',
    'Winter Park',
    'Lake Nona',
    'Baldwin Park',
    'College Park',
    'Thornton Park',
    'Dr. Phillips',
    'Windermere',
    'Kissimmee',
    'Celebration',
  ],
  'Tampa, FL': [
    'Downtown Tampa',
    'Hyde Park',
    'South Tampa',
    'Ybor City',
    'Westshore',
    'Channelside',
    'Davis Islands',
    'Seminole Heights',
    'Carrollwood',
    'Wesley Chapel',
  ],
  'St. Petersburg, FL': [
    'Downtown St. Petersburg',
    'Snell Isle',
    'Old Northeast',
    'Historic Kenwood',
    'Jungle Prada',
    'Shore Acres',
    'Gulfport',
    'Treasure Island',
    'Madeira Beach',
    'Clearwater',
  ],
  'Naples, FL': [
    'Downtown Naples',
    'Old Naples',
    'Port Royal',
    'Pelican Bay',
    'Park Shore',
    'Aqualane Shores',
    'North Naples',
    'East Naples',
    'Marco Island',
    'Vanderbilt Beach',
  ],
  'Fort Myers, FL': [
    'Downtown Fort Myers',
    'Cape Coral',
    'Fort Myers Beach',
    'McGregor',
    'Gateway',
    'Estero',
    'Bonita Springs',
    'Sanibel',
    'Lehigh Acres',
    'Iona',
  ],
  'Sarasota, FL': [
    'Downtown Sarasota',
    'Siesta Key',
    'Lido Key',
    'Bird Key',
    'West of Trail',
    'Palmer Ranch',
    'Lakewood Ranch',
    'Osprey',
    'Venice',
    'Bradenton',
  ],
  'Jacksonville, FL': [
    'Downtown Jacksonville',
    'Riverside',
    'Avondale',
    'San Marco',
    'Beaches',
    'Mandarin',
    'Southside',
    'Arlington',
    'St. Johns Town Center',
    'Ponte Vedra',
  ],
};

/** @deprecated Use US_AREAS_BY_CITY */
export const US_NEIGHBORHOODS_BY_AREA = US_AREAS_BY_CITY;

export function neighborhoodsForUsArea(state: UsStateCode, area: string): readonly string[] {
  return US_AREAS_BY_CITY[formatUsAreaLocation(state, area)] ?? [];
}

export function cityLocationsForUsState(state: UsStateCode): string[] {
  return areasForUsState(state).map((city) => formatUsAreaLocation(state, city));
}

/** All launch request locations for dropdowns (flat list). */
export function allUsAreaLocations(): string[] {
  return allLaunchUsRequestLocations();
}

export function isUsAreaLocation(location: string): boolean {
  return parseUsAreaLocation(location) !== null;
}

export function isValidUsAreaLocation(location: string): boolean {
  return isLaunchUsRequestLocation(location);
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
