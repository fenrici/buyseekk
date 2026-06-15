import type { Country } from './types';
import { allUsAreaLocations, neighborhoodsForUsArea, parseUsAreaLocation } from './us-locations';

export const CITIES_BY_COUNTRY: Record<Country, string[]> = {
  AR: ['Buenos Aires', 'Palermo, CABA', 'Belgrano, CABA', 'Córdoba', 'Rosario', 'Mendoza'],
  US: allUsAreaLocations(),
};

/** Zonas populares por ciudad — usadas en filtros de autos e inmuebles */
export const ZONES_BY_COUNTRY_CITY: Record<Country, Record<string, string[]>> = {
  AR: {
    'Buenos Aires': ['Palermo', 'Belgrano', 'Recoleta', 'Caballito', 'Nuñez'],
    'Palermo, CABA': ['Palermo Soho', 'Palermo Hollywood', 'Palermo Viejo'],
    'Belgrano, CABA': ['Belgrano R', 'Belgrano C', 'Barrio Chino'],
    Córdoba: ['Nueva Córdoba', 'Alta Córdoba', 'Argüello'],
    Rosario: ['Centro', 'Pichincha', 'Fisherton'],
    Mendoza: ['Godoy Cruz', 'Luján de Cuyo', 'Maipú'],
  },
  US: {
    'Miami, FL': ['Brickell', 'Wynwood', 'Little Havana', 'Edgewater', 'Design District'],
    'Miami Beach, FL': ['South Beach', 'Mid-Beach', 'North Beach'],
    'Orlando, FL': ['Downtown', 'Winter Park', 'Lake Nona'],
    'Tampa, FL': ['Hyde Park', 'Ybor City', 'Westshore'],
    'Dallas, TX': ['Uptown', 'Deep Ellum', 'Preston Hollow'],
    'Austin, TX': ['Downtown', 'South Congress', 'East Austin'],
    'Houston, TX': ['Montrose', 'River Oaks', 'The Heights'],
    'Los Angeles, CA': ['Beverly Hills', 'Hollywood', 'Santa Monica', 'West Hollywood'],
    'San Diego, CA': ['La Jolla', 'Gaslamp', 'Pacific Beach'],
    'San Francisco, CA': ['SOMA', 'Marina', 'Pacific Heights'],
    'New York, NY': ['Chelsea', 'Upper East Side', 'Williamsburg', 'Riverdale'],
  },
};

export function citiesForCountry(country: Country): string[] {
  return CITIES_BY_COUNTRY[country] ?? [];
}

export function zonesForCountryAndCity(country: Country, city: string): string[] {
  if (country === 'US') {
    const parsed = parseUsAreaLocation(city);
    if (!parsed) return [];
    return [...neighborhoodsForUsArea(parsed.state, parsed.area)];
  }
  return ZONES_BY_COUNTRY_CITY[country]?.[city] ?? [];
}

export const BEDROOM_OPTIONS = [1, 2, 3, 4, 5, 6] as const;

export const SQM_PRESETS = [40, 60, 80, 100, 120, 150, 200, 250, 300] as const;
