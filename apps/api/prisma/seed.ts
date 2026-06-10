import {
  PrismaClient,
  UserRole,
  SellerType,
  Country,
  Currency,
  Locale,
  RequestCategory,
  OperationType,
  Prisma,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
  console.error(
    'Seed bloqueado en producción. Seteá ALLOW_PRODUCTION_SEED=true solo si sabés lo que hacés.',
  );
  process.exit(1);
}

const prisma = new PrismaClient();

type DemoRequest = Omit<Prisma.RequestCreateManyInput, 'userId'> & { title: string };

const DEMO_REQUESTS: DemoRequest[] = [
  // ── US · Autos ──────────────────────────────────────────
  {
    title: '[Demo] Ferrari 488 GTB — Brickell',
    category: RequestCategory.AUTOS,
    operation: OperationType.COMPRA,
    requirements: 'Rosso corsa, coupé, impecable, menos de 15.000 km.',
    budget: 240000,
    negotiable: false,
    currency: Currency.USD,
    location: 'Miami, FL',
    zone: 'Brickell',
    country: Country.US,
    imageUrls: ['/images/ferrari-488.jpg'],
    carBrand: 'Ferrari',
    carModel: '488 GTB',
    carColor: 'Rosso Corsa',
    maxMileage: 15000,
  },
  {
    title: '[Demo] Porsche 911 Carrera — Wynwood',
    category: RequestCategory.AUTOS,
    operation: OperationType.COMPRA,
    requirements: 'Interior negro o gris, llantas deportivas, service al día.',
    budget: 180000,
    currency: Currency.USD,
    location: 'Miami, FL',
    zone: 'Wynwood',
    country: Country.US,
    imageUrls: ['/images/porsche-carrera.jpg'],
    carBrand: 'Porsche',
    carModel: '911 Carrera',
    carColor: 'Negro',
    maxMileage: 40000,
  },
  {
    title: '[Demo] Porsche 911 GT3 — South Beach',
    category: RequestCategory.AUTOS,
    operation: OperationType.COMPRA,
    requirements: 'GT3 o GT3 RS, bajo kilometraje, track-ready.',
    budget: 320000,
    currency: Currency.USD,
    location: 'Miami Beach, FL',
    zone: 'South Beach',
    country: Country.US,
    imageUrls: ['/images/porsche-gt3.jpg'],
    carBrand: 'Porsche',
    carModel: '911 GT3',
    carColor: 'Blanco',
    maxMileage: 20000,
  },
  {
    title: '[Demo] Tesla Model S — Beverly Hills',
    category: RequestCategory.AUTOS,
    operation: OperationType.COMPRA,
    requirements: 'Plaid o Long Range, autopilot, interior claro.',
    budget: 95000,
    currency: Currency.USD,
    location: 'Los Angeles, CA',
    zone: 'Beverly Hills',
    country: Country.US,
    imageUrls: ['/images/tesla-models.jpg'],
    carBrand: 'Tesla',
    carModel: 'Model S',
    carColor: 'Blanco',
    maxMileage: 50000,
  },
  {
    title: '[Demo] BMW Serie 3 — Chelsea',
    category: RequestCategory.AUTOS,
    operation: OperationType.COMPRA,
    requirements: 'Automático, service al día, color oscuro.',
    budget: 45000,
    currency: Currency.USD,
    location: 'New York, NY',
    zone: 'Chelsea',
    country: Country.US,
    imageUrls: ['/images/bmw-serie3.jpg'],
    carBrand: 'BMW',
    carModel: 'Serie 3',
    carColor: 'Negro',
    maxMileage: 60000,
  },
  {
    title: '[Demo] Ford Mustang — Design District',
    category: RequestCategory.AUTOS,
    operation: OperationType.COMPRA,
    requirements: 'V8, automático, pocos km, rojo o negro.',
    budget: 55000,
    currency: Currency.USD,
    location: 'Miami, FL',
    zone: 'Design District',
    country: Country.US,
    imageUrls: ['/images/ford-mustang.jpg'],
    carBrand: 'Ford',
    carModel: 'Mustang',
    carColor: 'Rojo',
    maxMileage: 35000,
  },
  // ── US · Inmuebles ──────────────────────────────────────
  {
    title: '[Demo] Penthouse vista al mar — South Beach',
    category: RequestCategory.INMOBILIARIA,
    operation: OperationType.COMPRA,
    requirements: '3 habitaciones, vista directa al océano, balcón amplio, 150m²+.',
    budget: 850000,
    negotiable: false,
    currency: Currency.USD,
    location: 'Miami Beach, FL',
    zone: 'South Beach',
    country: Country.US,
    bedrooms: 3,
    minSqm: 150,
    imageUrls: ['/images/penthouse-ocean.jpg'],
  },
  {
    title: '[Demo] Apartamento Brickell — compra',
    category: RequestCategory.INMOBILIARIA,
    operation: OperationType.COMPRA,
    requirements: '2-3 dormitorios, amenities de lujo, cochera.',
    budget: 620000,
    currency: Currency.USD,
    location: 'Miami, FL',
    zone: 'Brickell',
    country: Country.US,
    bedrooms: 2,
    minSqm: 90,
    maxSqm: 130,
    imageUrls: ['/images/apt-brickell.jpg'],
  },
  {
    title: '[Demo] Loft Williamsburg — alquiler',
    category: RequestCategory.INMOBILIARIA,
    operation: OperationType.ALQUILER,
    requirements: 'Loft industrial, 1-2 ambientes, amoblado, hasta USD 4.500/mes.',
    budget: 4500,
    currency: Currency.USD,
    budgetPeriod: '/mes',
    location: 'New York, NY',
    zone: 'Williamsburg',
    country: Country.US,
    bedrooms: 1,
    maxSqm: 80,
    imageUrls: ['/images/loft-manhattan.jpg'],
  },
  {
    title: '[Demo] Casa moderna — Santa Monica',
    category: RequestCategory.INMOBILIARIA,
    operation: OperationType.COMPRA,
    requirements: '4 habitaciones, jardín, cerca de la playa, 200m²+.',
    budget: 1200000,
    currency: Currency.USD,
    location: 'Los Angeles, CA',
    zone: 'Santa Monica',
    country: Country.US,
    bedrooms: 4,
    minSqm: 200,
    imageUrls: ['/images/casa-moderna.jpg'],
  },
  // ── AR · Autos ──────────────────────────────────────────
  {
    title: '[Demo] Toyota Hilux 4x4 — Palermo',
    category: RequestCategory.AUTOS,
    operation: OperationType.COMPRA,
    requirements: 'Doble cabina, 4x4, menos de 80.000 km, service al día.',
    budget: 45000,
    currency: Currency.USD,
    location: 'Buenos Aires',
    zone: 'Palermo',
    country: Country.AR,
    imageUrls: ['/images/ford-mustang.jpg'],
    carBrand: 'Toyota',
    carModel: 'Hilux',
    carColor: 'Blanco',
    maxMileage: 80000,
  },
  {
    title: '[Demo] BMW Serie 3 — Recoleta',
    category: RequestCategory.AUTOS,
    operation: OperationType.COMPRA,
    requirements: 'Sedán, automático, color oscuro, hasta 60.000 km.',
    budget: 38000,
    negotiable: false,
    currency: Currency.USD,
    location: 'Buenos Aires',
    zone: 'Recoleta',
    country: Country.AR,
    imageUrls: ['/images/bmw-serie3.jpg'],
    carBrand: 'BMW',
    carModel: 'Serie 3',
    carColor: 'Gris',
    maxMileage: 60000,
  },
  // ── AR · Inmuebles ──────────────────────────────────────
  {
    title: '[Demo] Depto 3 ambientes — Palermo Soho',
    category: RequestCategory.INMOBILIARIA,
    operation: OperationType.COMPRA,
    requirements: 'Balcón, luminoso, cochera opcional, hasta 90m².',
    budget: 180000,
    currency: Currency.USD,
    location: 'Palermo, CABA',
    zone: 'Palermo Soho',
    country: Country.AR,
    bedrooms: 3,
    maxSqm: 90,
    imageUrls: ['/images/dept-palermo.jpg'],
  },
  {
    title: '[Demo] Alquiler 2 ambientes — Palermo Hollywood',
    category: RequestCategory.INMOBILIARIA,
    operation: OperationType.ALQUILER,
    requirements: '2 ambientes, amoblado, hasta USD 1.200/mes.',
    budget: 1200,
    currency: Currency.USD,
    budgetPeriod: '/mes',
    location: 'Palermo, CABA',
    zone: 'Palermo Hollywood',
    country: Country.AR,
    bedrooms: 2,
    maxSqm: 60,
    imageUrls: ['/images/dept-palermo.jpg'],
  },
  {
    title: '[Demo] Depto Belgrano R — compra',
    category: RequestCategory.INMOBILIARIA,
    operation: OperationType.COMPRA,
    requirements: '3 ambientes, terraza, vista abierta, hasta 110m².',
    budget: 210000,
    currency: Currency.USD,
    location: 'Belgrano, CABA',
    zone: 'Belgrano R',
    country: Country.AR,
    bedrooms: 3,
    maxSqm: 110,
    imageUrls: ['/images/apt-miami-beach.jpg'],
  },
];

async function upsertDemoRequest(userId: string, data: DemoRequest) {
  const { title, ...fields } = data;
  const existing = await prisma.request.findFirst({ where: { title, userId } });
  if (existing) {
    await prisma.request.update({ where: { id: existing.id }, data: { ...fields, active: true } });
    return existing.id;
  }
  const created = await prisma.request.create({ data: { ...fields, title, userId } });
  return created.id;
}

async function main() {
  const passwordHash = await bcrypt.hash('demo1234', 10);

  const buyerAR = await prisma.user.upsert({
    where: { email: 'comprador@buyseekk.com' },
    update: {},
    create: {
      email: 'comprador@buyseekk.com',
      passwordHash,
      name: 'Carlos M.',
      role: UserRole.BUYER,
      country: Country.AR,
      locale: Locale.ES,
      currency: Currency.USD,
    },
  });

  const buyerUS = await prisma.user.upsert({
    where: { email: 'comprador.us@buyseekk.com' },
    update: {},
    create: {
      email: 'comprador.us@buyseekk.com',
      passwordHash,
      name: 'James R.',
      role: UserRole.BUYER,
      country: Country.US,
      locale: Locale.EN,
      currency: Currency.USD,
    },
  });

  const seller = await prisma.user.upsert({
    where: { email: 'vendedor@buyseekk.com' },
    update: {
      sellerType: SellerType.BUSINESS,
      sellerCategory: RequestCategory.AUTOS,
    },
    create: {
      email: 'vendedor@buyseekk.com',
      passwordHash,
      name: 'Luxury Motors Miami',
      role: UserRole.SELLER,
      sellerType: SellerType.BUSINESS,
      sellerCategory: RequestCategory.AUTOS,
      country: Country.US,
      locale: Locale.EN,
      currency: Currency.USD,
    },
  });

  await prisma.request.updateMany({
    where: { title: { not: { startsWith: '[Demo]' } }, active: true },
    data: { active: false },
  });

  for (const demo of DEMO_REQUESTS) {
    const userId = demo.country === Country.US ? buyerUS.id : buyerAR.id;
    await upsertDemoRequest(userId, demo);
  }

  const ferrari = await prisma.request.findFirst({
    where: { title: '[Demo] Ferrari 488 GTB — Brickell' },
  });
  if (ferrari) {
    const existingOffer = await prisma.offer.findFirst({
      where: { requestId: ferrari.id, sellerId: seller.id },
    });
    if (!existingOffer) {
      await prisma.offer.create({
        data: {
          requestId: ferrari.id,
          sellerId: seller.id,
          price: 235000,
          currency: Currency.USD,
          message: 'Ferrari 488 GTB 2019 rosso corsa, 12.000 km, service oficial.',
          imageUrls: ['/images/ferrari-488.jpg'],
          requestTitle: ferrari.title,
          requestBudget: ferrari.budget,
          requestRequirements: ferrari.requirements,
          requestLocation: ferrari.location,
        },
      });
    }
  }

  console.log('Seed OK');
  console.log('  comprador@buyseekk.com / demo1234 (AR)');
  console.log('  comprador.us@buyseekk.com / demo1234 (US)');
  console.log('  vendedor@buyseekk.com / demo1234 (US seller)');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
