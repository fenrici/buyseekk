import type { Country } from './types';

export const CITIES_BY_COUNTRY: Record<Country, string[]> = {
  AR: ['Buenos Aires', 'Palermo, CABA', 'Belgrano, CABA', 'Córdoba', 'Rosario', 'Mendoza'],
  US: ['Miami, FL', 'Miami Beach, FL', 'New York, NY', 'Los Angeles, CA', 'Houston, TX', 'Chicago, IL'],
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
    'New York, NY': ['Chelsea', 'Upper East Side', 'Williamsburg', 'Riverdale'],
    'Los Angeles, CA': ['Beverly Hills', 'Hollywood', 'Santa Monica', 'West Hollywood'],
    'Houston, TX': ['Montrose', 'River Oaks', 'The Heights'],
    'Chicago, IL': ['Wicker Park', 'Lincoln Park', 'Lakeview'],
  },
};

export function citiesForCountry(country: Country): string[] {
  return CITIES_BY_COUNTRY[country] ?? [];
}

export function zonesForCountryAndCity(country: Country, city: string): string[] {
  return ZONES_BY_COUNTRY_CITY[country]?.[city] ?? [];
}

export const BEDROOM_OPTIONS = [1, 2, 3, 4, 5, 6] as const;

export const SQM_PRESETS = [40, 60, 80, 100, 120, 150, 200, 250, 300] as const;
