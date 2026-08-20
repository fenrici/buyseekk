import type { CarCondition } from './types';

export const CAR_COLORS = [
  'Negro',
  'Blanco',
  'Rojo',
  'Rosso Corsa',
  'Azul',
  'Gris',
  'Plateado',
  'Verde',
  'Amarillo',
  'Naranja',
  'Beige',
  'Marrón',
  'Otro',
] as const;

/** Buyer accepts any color — does not restrict seller matching. */
export const CAR_COLOR_NO_PREFERENCE = 'Sin preferencia';

/** Stored enum value for new-car preference (distinct from max mileage). */
export const CAR_CONDITION_NEW = 'NEW' as const;

/** Stored when buyer has no max mileage preference. */
export const MILEAGE_NO_PREFERENCE = null;

export const MILEAGE_PRESETS = [5_000, 10_000, 25_000, 50_000, 75_000, 100_000] as const;

export function carColorOptions(): readonly string[] {
  return [CAR_COLOR_NO_PREFERENCE, ...CAR_COLORS];
}

export function isCarColorNoPreference(color: string | null | undefined): boolean {
  return color === CAR_COLOR_NO_PREFERENCE;
}

export function isCarConditionNew(carCondition: CarCondition | string | null | undefined): boolean {
  return carCondition === CAR_CONDITION_NEW;
}

export function isMileageNoPreference(maxMileage: number | null | undefined): boolean {
  return maxMileage == null;
}

export function isValidMileagePreset(maxMileage: number): boolean {
  return (MILEAGE_PRESETS as readonly number[]).includes(maxMileage);
}

export function isValidMileageValue(maxMileage: number): boolean {
  return Number.isInteger(maxMileage) && maxMileage >= 5_000 && maxMileage <= 100_000;
}

export function mileagePresetLabel(
  value: number,
  locale: 'ES' | 'EN' = 'ES',
): string {
  const prefix = locale === 'EN' ? 'Up to' : 'Hasta';
  return `${prefix} ${value.toLocaleString(locale === 'EN' ? 'en-US' : 'es-AR')} mi`;
}

export function formatCarConditionLabel(locale: 'ES' | 'EN' = 'ES'): string {
  return locale === 'EN' ? 'New' : 'Nuevo';
}

/** Unified create/filter value: NUEVO | preset mileage | empty (sin preferencia). */
export function carMileagePreferenceValue(
  carCondition: CarCondition | string | null | undefined,
  maxMileage: number | null | undefined,
): string {
  if (isCarConditionNew(carCondition)) return CAR_CONDITION_NEW;
  if (maxMileage != null) return String(maxMileage);
  return '';
}

export function parseCarMileagePreference(value: string): {
  carCondition: CarCondition | null;
  maxMileage: number | null;
} {
  if (value === CAR_CONDITION_NEW) {
    return { carCondition: CAR_CONDITION_NEW, maxMileage: null };
  }
  if (!value.trim()) {
    return { carCondition: null, maxMileage: null };
  }
  const maxMileage = parseInt(value, 10);
  if (Number.isNaN(maxMileage) || !isValidMileagePreset(maxMileage)) {
    return { carCondition: null, maxMileage: null };
  }
  return { carCondition: null, maxMileage };
}

export function isValidAutoMileagePreference(
  carCondition: CarCondition | string | null | undefined,
  maxMileage: number | null | undefined,
): boolean {
  const wantsNew = isCarConditionNew(carCondition);
  const hasMileage = maxMileage != null;
  if (wantsNew && hasMileage) return false;
  if (carCondition != null && !wantsNew) return false;
  if (hasMileage && !isValidMileageValue(maxMileage!)) return false;
  return true;
}
export const CAR_BRANDS: Record<string, string[]> = {
  Ferrari: [
    '296 GTB', '296 GTS', '308', '328', '348', '360 Modena', '430', '458 Italia', '458 Speciale',
    '488 GTB', '488 Pista', '488 Spider', '512 TR', '550 Maranello', '575M', '599 GTB',
    '612 Scaglietti', '812 Superfast', '812 GTS', 'California', 'California T', 'Daytona SP3',
    'Enzo', 'F12 Berlinetta', 'F12tdf', 'F355', 'F40', 'F50', 'FF', 'F8 Tributo', 'F8 Spider',
    'GTC4Lusso', 'LaFerrari', 'Mondial', 'Portofino', 'Portofino M', 'Purosangue', 'Roma',
    'Roma Spider', 'SF90 Stradale', 'SF90 Spider', 'Testarossa', 'Otro',
  ],
  Porsche: [
    '911 Carrera', '911 Carrera S', '911 Carrera 4', '911 Carrera 4S', '911 Targa 4',
    '911 Turbo', '911 Turbo S', '911 GT3', '911 GT3 RS', '911 GT2 RS', '911 Dakar',
    '718 Boxster', '718 Boxster S', '718 Cayman', '718 Cayman S', '718 Spyder', '718 GT4',
    'Boxster', 'Cayman', 'Cayenne', 'Cayenne S', 'Cayenne Coupe', 'Cayenne Turbo',
    'Macan', 'Macan S', 'Macan GTS', 'Macan Turbo', 'Panamera', 'Panamera 4',
    'Panamera Turbo', 'Panamera Sport Turismo', 'Taycan', 'Taycan 4S', 'Taycan Turbo',
    'Taycan Turbo S', 'Taycan Cross Turismo', 'Otro',
  ],
  Lamborghini: [
    'Aventador', 'Aventador S', 'Aventador SVJ', 'Countach', 'Diablo', 'Gallardo',
    'Huracán', 'Huracán EVO', 'Huracán STO', 'Huracán Tecnica', 'Murciélago',
    'Revuelto', 'Urus', 'Urus S', 'Urus Performante', 'Otro',
  ],
  'Mercedes-Benz': [
    'Clase A', 'Clase B', 'Clase C', 'Clase E', 'Clase S', 'CLA', 'CLS', 'GLA', 'GLB',
    'GLC', 'GLC Coupe', 'GLE', 'GLE Coupe', 'GLS', 'G-Class', 'AMG GT', 'AMG GT 4-Door',
    'EQA', 'EQB', 'EQC', 'EQE', 'EQS', 'SL', 'SLC', 'Sprinter', 'Vito', 'Otro',
  ],
  BMW: [
    'Serie 1', 'Serie 2', 'Serie 3', 'Serie 4', 'Serie 5', 'Serie 6', 'Serie 7', 'Serie 8',
    'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'XM', 'Z4', 'i3', 'i4', 'i5', 'i7', 'iX',
    'iX1', 'iX3', 'M2', 'M3', 'M4', 'M5', 'M8', 'Otro',
  ],
  Audi: [
    'A1', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'Q2', 'Q3', 'Q4 e-tron', 'Q5', 'Q7', 'Q8',
    'e-tron', 'e-tron GT', 'RS3', 'RS4', 'RS5', 'RS6', 'RS7', 'RS Q8', 'R8', 'TT', 'S3',
    'S4', 'S5', 'S6', 'S7', 'S8', 'SQ5', 'SQ7', 'SQ8', 'Otro',
  ],
  Tesla: [
    'Model 3', 'Model 3 Performance', 'Model S', 'Model S Plaid', 'Model X', 'Model X Plaid',
    'Model Y', 'Model Y Performance', 'Cybertruck', 'Roadster', 'Otro',
  ],
  Ford: [
    'Bronco', 'Bronco Sport', 'EcoSport', 'Edge', 'Escape', 'Expedition', 'Explorer',
    'F-150', 'F-150 Lightning', 'F-250', 'F-350', 'Fiesta', 'Focus', 'Fusion', 'Maverick',
    'Mustang', 'Mustang Mach-E', 'Ranger', 'Transit', 'Otro',
  ],
  Chevrolet: [
    'Blazer', 'Bolt EUV', 'Bolt EV', 'Camaro', 'Colorado', 'Corvette', 'Corvette Stingray',
    'Corvette Z06', 'Cruze', 'Equinox', 'Malibu', 'Silverado', 'Silverado EV', 'Suburban',
    'Tahoe', 'Trailblazer', 'Traverse', 'Trax', 'Otro',
  ],
  Toyota: [
    '4Runner', '86', 'Avalon', 'Camry', 'C-HR', 'Corolla', 'Corolla Cross', 'GR86', 'GR Corolla',
    'GR Supra', 'Highlander', 'Hilux', 'Land Cruiser', 'Prius', 'RAV4', 'Sequoia', 'Sienna',
    'Supra', 'Tacoma', 'Tundra', 'Venza', 'Yaris', 'Otro',
  ],
  Honda: [
    'Accord', 'Civic', 'Civic Type R', 'Clarity', 'CR-V', 'Element', 'Fit', 'HR-V', 'Insight',
    'Odyssey', 'Passport', 'Pilot', 'Prelude', 'Prologue', 'Ridgeline', 'Otro',
  ],
  Nissan: [
    '370Z', 'Altima', 'Armada', 'Ariya', 'Frontier', 'GT-R', 'Kicks', 'Leaf', 'Maxima',
    'Murano', 'Pathfinder', 'Rogue', 'Sentra', 'Titan', 'Versa', 'Z', 'Otro',
  ],
  Jeep: [
    'Cherokee', 'Compass', 'Gladiator', 'Grand Cherokee', 'Grand Cherokee L', 'Grand Wagoneer',
    'Renegade', 'Wagoneer', 'Wrangler', 'Wrangler 4xe', 'Otro',
  ],
  'Land Rover': [
    'Defender', 'Defender 90', 'Defender 110', 'Discovery', 'Discovery Sport', 'Evoque',
    'Freelander', 'Range Rover', 'Range Rover Evoque', 'Range Rover Sport', 'Range Rover Velar',
    'Otro',
  ],
  Volvo: [
    'C40 Recharge', 'EX30', 'EX90', 'S60', 'S90', 'V60', 'V90', 'XC40', 'XC40 Recharge',
    'XC60', 'XC90', 'Otro',
  ],
  Lexus: [
    'CT', 'ES', 'GS', 'GX', 'IS', 'LC', 'LS', 'LX', 'NX', 'RC', 'RC F', 'RX', 'RZ', 'TX',
    'UX', 'Otro',
  ],
  Cadillac: [
    'CT4', 'CT4-V', 'CT5', 'CT5-V', 'Escalade', 'Escalade ESV', 'Escalade IQ', 'Lyriq',
    'XT4', 'XT5', 'XT6', 'XTS', 'Otro',
  ],
  Dodge: [
    'Challenger', 'Charger', 'Durango', 'Hornet', 'Journey', 'Ram 1500', 'Viper', 'Otro',
  ],
  Maserati: [
    'Ghibli', 'GranCabrio', 'GranTurismo', 'Grecale', 'Levante', 'MC20', 'MC20 Cielo',
    'Quattroporte', 'Otro',
  ],
  'Alfa Romeo': [
    '4C', 'Giulia', 'Giulietta', 'Stelvio', 'Tonale', 'Otro',
  ],
  Bentley: [
    'Arnage', 'Azure', 'Bentayga', 'Brooklands', 'Continental GT', 'Continental GTC',
    'Flying Spur', 'Mulsanne', 'Otro',
  ],
  'Aston Martin': [
    'DB7', 'DB9', 'DB11', 'DB12', 'DBS', 'DBX', 'DBX707', 'Rapide', 'V8 Vantage',
    'V12 Vantage', 'Vantage', 'Vanquish', 'Virage', 'Otro',
  ],
  McLaren: [
    '540C', '570S', '570GT', '600LT', '620R', '650S', '675LT', '720S', '750S', '765LT',
    'Artura', 'GT', 'MP4-12C', 'P1', 'Senna', 'Otro',
  ],
  Volkswagen: [
    'Amarok', 'Arteon', 'Atlas', 'Atlas Cross Sport', 'Beetle', 'Golf', 'Golf GTI',
    'Golf R', 'ID.4', 'ID.Buzz', 'Jetta', 'Passat', 'Polo', 'Taos', 'Tiguan', 'Touareg',
    'Otro',
  ],
  Hyundai: [
    'Accent', 'Elantra', 'Ioniq 5', 'Ioniq 6', 'Kona', 'Kona Electric', 'Palisade', 'Santa Cruz',
    'Santa Fe', 'Sonata', 'Tucson', 'Venue', 'Otro',
  ],
  Kia: [
    'Carnival', 'EV6', 'EV9', 'Forte', 'K5', 'Niro', 'Rio', 'Seltos', 'Sorento', 'Soul',
    'Sportage', 'Stinger', 'Telluride', 'Otro',
  ],
  Subaru: [
    'Ascent', 'BRZ', 'Crosstrek', 'Forester', 'Impreza', 'Legacy', 'Outback', 'Solterra',
    'WRX', 'Otro',
  ],
  RAM: ['1500', '1500 TRX', '2500', '3500', 'ProMaster', 'Otro'],
  Mini: [
    'Cooper', 'Cooper S', 'Cooper SE', 'Countryman', 'Clubman', 'Convertible', 'Otro',
  ],
};

export const CAR_BRAND_LIST = Object.keys(CAR_BRANDS).sort();


export const CAR_YEAR_MIN = 1990;

export function carYearPresets(): number[] {
  const current = new Date().getFullYear();
  return Array.from({ length: current - CAR_YEAR_MIN + 1 }, (_, i) => current - i);
}

export function isValidCarYear(year: number) {
  const current = new Date().getFullYear();
  return Number.isInteger(year) && year >= CAR_YEAR_MIN && year <= current;
}

export function modelsForBrand(brand: string): string[] {
  return CAR_BRANDS[brand] ?? [];
}

export function isValidBrand(brand: string) {
  return brand in CAR_BRANDS;
}

export function isValidModel(brand: string, model: string) {
  return modelsForBrand(brand).includes(model);
}

export function isValidColor(color: string) {
  return carColorOptions().includes(color);
}
