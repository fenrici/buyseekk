import {
  PrismaClient,
  UserRole,
  UserMode,
  SellerType,
  Country,
  Currency,
  Locale,
  RequestCategory,
  OperationType,
  OfferStatus,
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
    carYearMin: 2018,
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
    carYearMin: 2016,
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
    carYearMin: 2019,
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
    carYearMin: 2020,
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
    carYearMin: 2017,
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
    carYearMin: 2018,
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
    carYearMin: 2015,
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
    carYearMin: 2016,
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

/** 7 días + 12 h sin actividad del comprador → Pendiente de confirmación */
function pendingBuyerActivityAt() {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const HOUR_MS = 60 * 60 * 1000;
  return new Date(Date.now() - 7 * DAY_MS - 12 * HOUR_MS);
}

const PENDING_DEMO_REQUESTS: DemoRequest[] = [
  {
    title: '[Demo] Pendiente — VW Golf Recoleta',
    category: RequestCategory.AUTOS,
    operation: OperationType.COMPRA,
    requirements: 'Golf 1.4 TSI, automático, hasta 70.000 km, service al día.',
    budget: 22000,
    currency: Currency.USD,
    location: 'Buenos Aires',
    zone: 'Recoleta',
    country: Country.AR,
    imageUrls: ['/images/bmw-serie3.jpg'],
    carBrand: 'Volkswagen',
    carModel: 'Golf',
    carColor: 'Gris',
    carYearMin: 2016,
    maxMileage: 70000,
  },
  {
    title: '[Demo] Pendiente — Monoambiente Palermo',
    category: RequestCategory.INMOBILIARIA,
    operation: OperationType.ALQUILER,
    requirements: 'Monoambiente luminoso, amoblado, hasta USD 900/mes.',
    budget: 900,
    currency: Currency.USD,
    budgetPeriod: '/mes',
    location: 'Palermo, CABA',
    zone: 'Palermo Soho',
    country: Country.AR,
    bedrooms: 1,
    maxSqm: 45,
    imageUrls: ['/images/dept-palermo.jpg'],
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

async function upsertPendingDemoRequest(userId: string, data: DemoRequest) {
  const { title, ...fields } = data;
  const staleAt = pendingBuyerActivityAt();
  const createdAt = new Date(staleAt.getTime() - 2 * 24 * 60 * 60 * 1000);
  const existing = await prisma.request.findFirst({ where: { title, userId } });
  const lifecycle = {
    active: true,
    lastBuyerActivityAt: staleAt,
    lastActivityAt: staleAt,
    pausedAt: null,
    createdAt,
  };
  if (existing) {
    await prisma.request.update({ where: { id: existing.id }, data: { ...fields, ...lifecycle } });
    return existing.id;
  }
  const created = await prisma.request.create({
    data: { ...fields, title, userId, ...lifecycle },
  });
  return created.id;
}

type DemoOfferSeed = {
  requestTitle: string;
  sellerEmail: string;
  price: number;
  message: string;
  imageUrls: string[];
};

const CARLOS_DEMO_OFFERS: DemoOfferSeed[] = [
  {
    requestTitle: '[Demo] BMW Serie 3 — Recoleta',
    sellerEmail: 'vendedor.ar@buyseekk.com',
    price: 36200,
    message:
      'BMW Serie 3 2018 gris oscuro, 48.000 km, service oficial en concesionario. Interior cuero, cámara trasera y sensores. Entrega inmediata en CABA.',
    imageUrls: ['/images/bmw-serie3.jpg', '/images/ford-mustang.jpg'],
  },
  {
    requestTitle: '[Demo] BMW Serie 3 — Recoleta',
    sellerEmail: 'autosur.ar@buyseekk.com',
    price: 37500,
    message:
      'Serie 3 2017 automático, color gris, único dueño. Historial de service completo, neumáticos nuevos y detalle estético reciente.',
    imageUrls: ['/images/bmw-serie3.jpg'],
  },
  {
    requestTitle: '[Demo] BMW Serie 3 — Recoleta',
    sellerEmail: 'elite.ar@buyseekk.com',
    price: 39200,
    message:
      'BMW 320i 2019 con paquete M, 35.000 km. Excelente estado general, ideal para ciudad.',
    imageUrls: ['/images/bmw-serie3.jpg'],
  },
  {
    requestTitle: '[Demo] Toyota Hilux 4x4 — Palermo',
    sellerEmail: 'vendedor.ar@buyseekk.com',
    price: 42800,
    message:
      'Hilux 4x4 2016 blanca, 72.000 km, doble cabina. Service al día, gomas nuevas, lista para usar.',
    imageUrls: ['/images/ford-mustang.jpg'],
  },
  {
    requestTitle: '[Demo] Toyota Hilux 4x4 — Palermo',
    sellerEmail: 'autosur.ar@buyseekk.com',
    price: 44100,
    message:
      'Hilux SR 2017 4x4, 65.000 km, caja automática. Mantenimiento en Toyota oficial, sin choques.',
    imageUrls: ['/images/ford-mustang.jpg', '/images/bmw-serie3.jpg'],
  },
  {
    requestTitle: '[Demo] Depto 3 ambientes — Palermo Soho',
    sellerEmail: 'inmo.ar@buyseekk.com',
    price: 175000,
    message:
      'Departamento 3 ambientes con balcón al contrafrente, 82 m², luminoso. Cochera opcional, expensas moderadas, listo para escriturar.',
    imageUrls: ['/images/dept-palermo.jpg', '/images/apt-miami-beach.jpg'],
  },
];

async function upsertDemoSeller(data: {
  email: string;
  name: string;
  businessName: string;
  sellerCategory: RequestCategory;
  country: Country;
  locale: Locale;
  passwordHash: string;
}) {
  return prisma.user.upsert({
    where: { email: data.email },
    update: {
      emailVerified: true,
      emailVerifiedAt: new Date(),
      role: UserRole.BOTH,
      activeMode: UserMode.SELLER,
      sellerType: SellerType.BUSINESS,
      sellerCategory: data.sellerCategory,
      businessName: data.businessName,
    },
    create: {
      email: data.email,
      passwordHash: data.passwordHash,
      name: data.name,
      businessName: data.businessName,
      role: UserRole.BOTH,
      activeMode: UserMode.SELLER,
      sellerType: SellerType.BUSINESS,
      sellerCategory: data.sellerCategory,
      country: data.country,
      locale: data.locale,
      currency: Currency.USD,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });
}

async function upsertDemoOffer(seed: DemoOfferSeed, sellerId: string) {
  const request = await prisma.request.findFirst({ where: { title: seed.requestTitle } });
  if (!request) return;

  const payload = {
    price: seed.price,
    currency: request.currency,
    message: seed.message,
    imageUrls: seed.imageUrls,
    status: OfferStatus.PENDIENTE,
    requestTitle: request.title,
    requestBudget: request.budget,
    requestBudgetPeriod: request.budgetPeriod,
    requestRequirements: request.requirements,
    requestLocation: request.location,
  };

  await prisma.offer.upsert({
    where: { requestId_sellerId: { requestId: request.id, sellerId } },
    update: payload,
    create: { requestId: request.id, sellerId, ...payload },
  });
}

async function main() {
  const passwordHash = await bcrypt.hash('demo1234', 10);

  const buyerAR = await prisma.user.upsert({
    where: { email: 'comprador@buyseekk.com' },
    update: { emailVerified: true, emailVerifiedAt: new Date() },
    create: {
      email: 'comprador@buyseekk.com',
      passwordHash,
      name: 'Carlos M.',
      role: UserRole.BUYER,
      country: Country.AR,
      locale: Locale.ES,
      currency: Currency.USD,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@buyseekk.com' },
    update: {
      role: UserRole.ADMIN,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      blocked: false,
    },
    create: {
      email: 'admin@buyseekk.com',
      passwordHash,
      name: 'Admin Buyseek',
      role: UserRole.ADMIN,
      country: Country.AR,
      locale: Locale.ES,
      currency: Currency.USD,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  const buyerUS = await prisma.user.upsert({
    where: { email: 'comprador.us@buyseekk.com' },
    update: { emailVerified: true, emailVerifiedAt: new Date() },
    create: {
      email: 'comprador.us@buyseekk.com',
      passwordHash,
      name: 'James R.',
      role: UserRole.BUYER,
      country: Country.US,
      locale: Locale.EN,
      currency: Currency.USD,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  const seller = await prisma.user.upsert({
    where: { email: 'vendedor@buyseekk.com' },
    update: {
      emailVerified: true,
      emailVerifiedAt: new Date(),
      role: UserRole.BOTH,
      activeMode: UserMode.SELLER,
      sellerType: SellerType.BUSINESS,
      sellerCategory: RequestCategory.AUTOS,
    },
    create: {
      email: 'vendedor@buyseekk.com',
      passwordHash,
      name: 'Luxury Motors Miami',
      role: UserRole.BOTH,
      activeMode: UserMode.SELLER,
      sellerType: SellerType.BUSINESS,
      sellerCategory: RequestCategory.AUTOS,
      country: Country.US,
      locale: Locale.EN,
      currency: Currency.USD,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  const sellerAR = await upsertDemoSeller({
    email: 'vendedor.ar@buyseekk.com',
    name: 'Martín López',
    businessName: 'Automotores Palermo',
    sellerCategory: RequestCategory.AUTOS,
    country: Country.AR,
    locale: Locale.ES,
    passwordHash,
  });

  const sellerAR2 = await upsertDemoSeller({
    email: 'autosur.ar@buyseekk.com',
    name: 'Laura Vega',
    businessName: 'AutoSur Recoleta',
    sellerCategory: RequestCategory.AUTOS,
    country: Country.AR,
    locale: Locale.ES,
    passwordHash,
  });

  const sellerAR3 = await upsertDemoSeller({
    email: 'elite.ar@buyseekk.com',
    name: 'Diego Fernández',
    businessName: 'Elite Motors BA',
    sellerCategory: RequestCategory.AUTOS,
    country: Country.AR,
    locale: Locale.ES,
    passwordHash,
  });

  const sellerInmoAR = await upsertDemoSeller({
    email: 'inmo.ar@buyseekk.com',
    name: 'Valentina Ruiz',
    businessName: 'Palermo Propiedades',
    sellerCategory: RequestCategory.INMOBILIARIA,
    country: Country.AR,
    locale: Locale.ES,
    passwordHash,
  });

  const sellerByEmail: Record<string, string> = {
    'vendedor.ar@buyseekk.com': sellerAR.id,
    'autosur.ar@buyseekk.com': sellerAR2.id,
    'elite.ar@buyseekk.com': sellerAR3.id,
    'inmo.ar@buyseekk.com': sellerInmoAR.id,
  };

  await prisma.request.updateMany({
    where: { title: { not: { startsWith: '[Demo]' } }, active: true },
    data: { active: false },
  });

  for (const demo of DEMO_REQUESTS) {
    const userId = demo.country === Country.US ? buyerUS.id : buyerAR.id;
    await upsertDemoRequest(userId, demo);
  }

  for (const demo of PENDING_DEMO_REQUESTS) {
    await upsertPendingDemoRequest(buyerAR.id, demo);
  }

  const ferrari = await prisma.request.findFirst({
    where: { title: '[Demo] Ferrari 488 GTB — Brickell' },
  });
  if (ferrari) {
    await upsertDemoOffer(
      {
        requestTitle: '[Demo] Ferrari 488 GTB — Brickell',
        sellerEmail: 'vendedor@buyseekk.com',
        price: 235000,
        message: 'Ferrari 488 GTB 2019 rosso corsa, 12.000 km, service oficial.',
        imageUrls: ['/images/ferrari-488.jpg'],
      },
      seller.id,
    );
  }

  for (const demoOffer of CARLOS_DEMO_OFFERS) {
    const sellerId = sellerByEmail[demoOffer.sellerEmail];
    if (sellerId) await upsertDemoOffer(demoOffer, sellerId);
  }

  console.log('Seed OK');
  console.log('  comprador@buyseekk.com / demo1234 (AR) — 2 solicitudes en Pendiente de confirmación');
  console.log('  comprador.us@buyseekk.com / demo1234 (US)');
  console.log('  vendedor@buyseekk.com / demo1234 (US seller)');
  console.log('  admin@buyseekk.com / demo1234 (ADMIN)');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
