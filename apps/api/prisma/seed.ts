import { PrismaClient, UserRole, Country, Currency, Locale, RequestCategory, OperationType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('demo1234', 10);

  const buyer = await prisma.user.upsert({
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

  const seller = await prisma.user.upsert({
    where: { email: 'vendedor@buyseekk.com' },
    update: {},
    create: {
      email: 'vendedor@buyseekk.com',
      passwordHash,
      name: 'Luxury Motors Miami',
      role: UserRole.SELLER,
      country: Country.US,
      locale: Locale.EN,
      currency: Currency.USD,
    },
  });

  const existing = await prisma.request.count();
  if (existing === 0) {
    const ferrari = await prisma.request.create({
      data: {
        userId: buyer.id,
        category: RequestCategory.AUTOS,
        operation: OperationType.COMPRA,
        title: 'Busco Ferrari 488 GTB 2019+',
        requirements: 'Color rosso corsa, coupé, impecable estado, menos de 15.000 km.',
        budget: 240000,
        currency: Currency.USD,
        location: 'Miami, FL',
        country: Country.US,
        imageUrls: ['/images/ferrari-488.jpg'],
      },
    });

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

    await prisma.request.create({
      data: {
        userId: buyer.id,
        category: RequestCategory.INMOBILIARIA,
        operation: OperationType.COMPRA,
        title: 'Busco Apartamento en Miami Beach',
        requirements: '2-3 dormitorios, vista al mar, mínimo 120m².',
        budget: 850000,
        currency: Currency.USD,
        location: 'Miami Beach, FL',
        country: Country.US,
        imageUrls: ['/images/apt-miami-beach.jpg'],
      },
    });
  }

  console.log('Seed OK');
  console.log('  comprador@buyseekk.com / demo1234');
  console.log('  vendedor@buyseekk.com / demo1234');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
