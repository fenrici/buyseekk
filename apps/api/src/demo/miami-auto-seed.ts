import { Country, Currency, Locale, PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  MIAMI_AUTO_DEMO_BUYER_EMAIL,
  MIAMI_AUTO_DEMO_REQUESTS,
} from './miami-auto-demo-data';

export type MiamiAutoSeedResult = {
  created: number;
  updated: number;
  total: number;
};

export async function seedMiamiAutos(prisma: PrismaClient): Promise<MiamiAutoSeedResult> {
  const passwordHash = await bcrypt.hash('demo1234', 10);

  const buyerUS = await prisma.user.upsert({
    where: { email: MIAMI_AUTO_DEMO_BUYER_EMAIL },
    update: { emailVerified: true, emailVerifiedAt: new Date() },
    create: {
      email: MIAMI_AUTO_DEMO_BUYER_EMAIL,
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

  let created = 0;
  let updated = 0;

  for (const demo of MIAMI_AUTO_DEMO_REQUESTS) {
    const { title, ...fields } = demo;
    const existing = await prisma.request.findFirst({
      where: { title, userId: buyerUS.id },
    });
    if (existing) {
      await prisma.request.update({
        where: { id: existing.id },
        data: { ...fields, active: true, hiddenByModeration: false },
      });
      updated += 1;
    } else {
      await prisma.request.create({
        data: { ...fields, title, userId: buyerUS.id },
      });
      created += 1;
    }
  }

  return { created, updated, total: MIAMI_AUTO_DEMO_REQUESTS.length };
}

export async function countMiamiAutoDemoRequests(prisma: PrismaClient): Promise<number> {
  return prisma.request.count({
    where: {
      title: { startsWith: '[Demo]' },
      country: Country.US,
      category: 'AUTOS',
      OR: [{ location: { contains: 'Miami' } }, { location: { contains: 'Miami Beach' } }],
    },
  });
}
