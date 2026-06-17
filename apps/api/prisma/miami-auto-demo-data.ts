import {
  Country,
  Currency,
  OperationType,
  Prisma,
  RequestCategory,
} from '@prisma/client';

export type MiamiAutoDemoRequest = Omit<Prisma.RequestCreateManyInput, 'userId'> & {
  title: string;
};

const IMAGES = [
  '/images/ferrari-488.jpg',
  '/images/porsche-carrera.jpg',
  '/images/porsche-gt3.jpg',
  '/images/ford-mustang.jpg',
  '/images/bmw-serie3.jpg',
  '/images/tesla-models.jpg',
];

const COLORS = ['Negro', 'Blanco', 'Gris', 'Azul', 'Rojo', 'Plateado'];

type Spec = {
  brand: string;
  model: string;
  budget: number;
  year: number;
  mileage: number;
  requirements: string;
};

const SPECS: Spec[] = [
  { brand: 'BMW', model: 'X5', budget: 72000, year: 2020, mileage: 38000, requirements: 'xDrive, premium package, clean Carfax.' },
  { brand: 'BMW', model: 'Serie 3', budget: 42000, year: 2019, mileage: 52000, requirements: '330i or M340i, sport package preferred.' },
  { brand: 'Mercedes-Benz', model: 'Clase C', budget: 48000, year: 2020, mileage: 41000, requirements: 'AMG line, blind spot, one owner.' },
  { brand: 'Mercedes-Benz', model: 'GLE', budget: 68000, year: 2021, mileage: 35000, requirements: 'GLE 450, panoramic roof, low miles.' },
  { brand: 'Audi', model: 'Q5', budget: 44000, year: 2019, mileage: 48000, requirements: 'Prestige trim, quattro, no accidents.' },
  { brand: 'Audi', model: 'A4', budget: 36000, year: 2018, mileage: 55000, requirements: 'Premium Plus, black interior.' },
  { brand: 'Tesla', model: 'Model 3', budget: 38000, year: 2021, mileage: 32000, requirements: 'Long Range, white or black, FSD optional.' },
  { brand: 'Tesla', model: 'Model Y', budget: 45000, year: 2022, mileage: 28000, requirements: 'AWD, heat pump, under 30k miles.' },
  { brand: 'Porsche', model: 'Macan', budget: 52000, year: 2019, mileage: 44000, requirements: 'S or GTS, sport chrono, clean history.' },
  { brand: 'Porsche', model: 'Cayenne', budget: 75000, year: 2020, mileage: 36000, requirements: 'Cayenne S, air suspension, serviced.' },
  { brand: 'Lexus', model: 'RX 350', budget: 46000, year: 2020, mileage: 40000, requirements: 'F Sport or luxury, one owner.' },
  { brand: 'Lexus', model: 'IS 350', budget: 34000, year: 2018, mileage: 58000, requirements: 'F Sport, red or white exterior.' },
  { brand: 'Ford', model: 'Mustang', budget: 42000, year: 2020, mileage: 30000, requirements: 'GT or EcoBoost premium, manual a plus.' },
  { brand: 'Ford', model: 'Explorer', budget: 38000, year: 2019, mileage: 62000, requirements: 'ST or Limited, 3-row, towing package.' },
  { brand: 'Chevrolet', model: 'Corvette', budget: 68000, year: 2019, mileage: 22000, requirements: 'C8 or C7 Z06, garage kept.' },
  { brand: 'Chevrolet', model: 'Tahoe', budget: 52000, year: 2020, mileage: 48000, requirements: 'RST or Premier, captain chairs.' },
  { brand: 'Toyota', model: 'Camry', budget: 28000, year: 2021, mileage: 35000, requirements: 'XSE or TRD, low miles, non-smoker.' },
  { brand: 'Toyota', model: 'RAV4', budget: 32000, year: 2022, mileage: 25000, requirements: 'Hybrid XLE, adaptive cruise.' },
  { brand: 'Honda', model: 'Accord', budget: 27000, year: 2020, mileage: 45000, requirements: 'Sport or Touring, Honda Sensing.' },
  { brand: 'Honda', model: 'CR-V', budget: 30000, year: 2021, mileage: 38000, requirements: 'EX-L, sunroof, clean title.' },
  { brand: 'Jeep', model: 'Wrangler', budget: 40000, year: 2020, mileage: 42000, requirements: 'Unlimited Sahara or Rubicon, hard top.' },
  { brand: 'Jeep', model: 'Grand Cherokee', budget: 44000, year: 2021, mileage: 36000, requirements: 'Limited or Overland, V6 or V8.' },
  { brand: 'Land Rover', model: 'Range Rover Sport', budget: 62000, year: 2019, mileage: 50000, requirements: 'HSE, air ride, service records.' },
  { brand: 'Land Rover', model: 'Defender', budget: 78000, year: 2021, mileage: 28000, requirements: '110 S, off-road package welcome.' },
  { brand: 'Cadillac', model: 'Escalade', budget: 72000, year: 2020, mileage: 45000, requirements: 'Premium Luxury, 3-row, black exterior.' },
  { brand: 'Cadillac', model: 'CT5', budget: 38000, year: 2021, mileage: 32000, requirements: 'V or Premium Luxury, low miles.' },
  { brand: 'Volkswagen', model: 'Tiguan', budget: 26000, year: 2020, mileage: 48000, requirements: 'SEL R-Line, AWD, one owner.' },
  { brand: 'Volkswagen', model: 'Golf GTI', budget: 30000, year: 2019, mileage: 42000, requirements: 'Autobahn or SE, manual preferred.' },
  { brand: 'Nissan', model: 'Altima', budget: 24000, year: 2021, mileage: 40000, requirements: 'SR or Platinum, ProPILOT assist.' },
  { brand: 'Nissan', model: 'Rogue', budget: 28000, year: 2022, mileage: 30000, requirements: 'SL or Platinum, panoramic roof.' },
  { brand: 'Hyundai', model: 'Tucson', budget: 29000, year: 2022, mileage: 28000, requirements: 'Limited AWD, warranty transfer OK.' },
  { brand: 'Hyundai', model: 'Sonata', budget: 25000, year: 2021, mileage: 38000, requirements: 'N Line or Limited, clean history.' },
  { brand: 'Genesis', model: 'GV70', budget: 48000, year: 2022, mileage: 24000, requirements: '3.5T Sport, prestige package.' },
  { brand: 'Genesis', model: 'G80', budget: 52000, year: 2021, mileage: 32000, requirements: '3.3T, full options, CPO preferred.' },
  { brand: 'Ferrari', model: '488 GTB', budget: 245000, year: 2018, mileage: 14000, requirements: 'Rosso or Nero, lift, service current.' },
];

const MIAMI_AREAS: { location: string; zone: string }[] = [
  { location: 'Miami, FL', zone: 'Brickell' },
  { location: 'Miami, FL', zone: 'Wynwood' },
  { location: 'Miami, FL', zone: 'Little Havana' },
  { location: 'Miami, FL', zone: 'Edgewater' },
  { location: 'Miami, FL', zone: 'Design District' },
  { location: 'Miami Beach, FL', zone: 'South Beach' },
  { location: 'Miami Beach, FL', zone: 'Mid-Beach' },
  { location: 'Miami Beach, FL', zone: 'North Beach' },
];

/** 35 solicitudes demo de autos en el área de Miami (visible para vendedores US). */
export const MIAMI_AUTO_DEMO_REQUESTS: MiamiAutoDemoRequest[] = SPECS.map((spec, index) => {
  const area = MIAMI_AREAS[index % MIAMI_AREAS.length]!;
  const color = COLORS[index % COLORS.length]!;
  return {
    title: `[Demo] ${spec.brand} ${spec.model} — ${area.zone}`,
    category: RequestCategory.AUTOS,
    operation: OperationType.COMPRA,
    requirements: spec.requirements,
    budget: spec.budget,
    negotiable: index % 3 !== 0,
    currency: Currency.USD,
    location: area.location,
    zone: area.zone,
    country: Country.US,
    imageUrls: [IMAGES[index % IMAGES.length]!],
    carBrand: spec.brand,
    carModel: spec.model,
    carColor: color,
    carYearMin: spec.year,
    maxMileage: spec.mileage,
  };
});
