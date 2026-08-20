import type { AppLocale } from './user-mode';
import {
  formatUsAreaLocation,
  isLaunchUsRequestLocation,
  isLaunchUsRequestState,
  launchCityLocationsForUsState,
  launchMarketsForUsState,
  launchStatesForUsRequests,
  neighborhoodsForUsArea,
  parseUsAreaLocation,
  type UsStateCode,
} from './us-locations';

/** Empty zone on a Request means the buyer accepts any area of the city. */
export const REQUEST_AREA_ANY = '';

export type UsLocationSelection = {
  state: string;
  location: string;
  zone: string;
};

export function isUsStateCode(value: string | null | undefined): value is UsStateCode {
  return isLaunchUsRequestState(value);
}

export function isRequestAreaAny(zone?: string | null): boolean {
  return !zone?.trim();
}

export function stateFromUsLocation(location: string | null | undefined): UsStateCode | null {
  const parsed = parseUsAreaLocation(location);
  return parsed?.state ?? null;
}

export function isValidUsRequestArea(state: UsStateCode, city: string, zone?: string | null): boolean {
  if (isRequestAreaAny(zone)) return true;
  return neighborhoodsForUsArea(state, city).includes(zone!.trim());
}

export function sanitizeUsLocationSelection(
  input: UsLocationSelection,
  opts?: { allowEmpty?: boolean },
): UsLocationSelection {
  const allowEmpty = opts?.allowEmpty ?? false;
  let state = input.state?.trim() ?? '';
  let location = input.location?.trim() ?? '';
  let zone = input.zone?.trim() ?? '';

  const parsedLocation = parseUsAreaLocation(location);
  if (parsedLocation && (!state || state === parsedLocation.state)) {
    state = parsedLocation.state;
  }

  if (state && !isUsStateCode(state)) {
    state = allowEmpty ? '' : 'FL';
  }

  if (state && location) {
    const parsed = parseUsAreaLocation(location);
    if (!parsed || parsed.state !== state || !isLaunchUsRequestLocation(location)) {
      location = '';
      zone = '';
    }
  }

  if (!state) {
    location = '';
    zone = '';
  }

  if (!location) {
    zone = '';
  } else {
    const parsed = parseUsAreaLocation(location);
    if (parsed && zone && !neighborhoodsForUsArea(parsed.state, parsed.area).includes(zone)) {
      zone = '';
    }
  }

  if (!allowEmpty) {
    if (!state) state = launchStatesForUsRequests()[0] ?? 'FL';
    if (!location) {
      const cities = launchMarketsForUsState(state);
      location = formatUsAreaLocation(state as UsStateCode, cities[0] ?? 'Miami');
    }
  }

  return { state, location, zone };
}

export function formatRequestLocationDisplay(
  request: { location: string; zone?: string | null; country?: string | null },
  locale: AppLocale = 'ES',
): string {
  const location = request.location?.trim() || '—';
  const anyLabel = locale === 'EN' ? 'Any area' : 'Cualquier zona';

  if (request.country && request.country !== 'US') {
    return request.zone ? `${location} · ${request.zone}` : location;
  }

  const areaLabel = isRequestAreaAny(request.zone) ? anyLabel : request.zone!.trim();
  return `${location} · ${areaLabel}`;
}

export function requestMatchesUsLocationFilter(
  request: { location: string; zone?: string | null; state?: string | null },
  filter: { state?: string; location?: string; zone?: string },
): boolean {
  const filterState = filter.state?.trim() ?? '';
  const filterLocation = filter.location?.trim() ?? '';
  const filterZone = filter.zone?.trim() ?? '';

  if (filterState) {
    const requestState = request.state?.trim() || stateFromUsLocation(request.location);
    if (requestState !== filterState) return false;
  }

  if (filterLocation && request.location !== filterLocation) {
    return false;
  }

  if (filterZone) {
    if (isRequestAreaAny(request.zone)) return true;
    return request.zone === filterZone;
  }

  return true;
}
