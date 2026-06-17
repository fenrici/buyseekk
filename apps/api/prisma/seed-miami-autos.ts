/**
 * Carga 35 solicitudes demo de autos en Miami sin tocar el resto de la base.
 *
 * Uso local:  npm run prisma:seed:miami -w @buyseekk/api
 * Producción: ALLOW_PRODUCTION_SEED=true npm run prisma:seed:miami -w @buyseekk/api
 */
import { PrismaClient, UserRole, Country, Currency, Locale } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { MIAMI_AUTO_DEMO_REQUESTS } from './miami-auto-demo-data';

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
  console.error(
    'Bloqueado en producción. Seteá ALLOW_PRODUCTION_SEED=true para cargar las 35 solicitudes de Miami.',
  );
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('demo1234', 10);

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

  console.log(`Miami autos seed OK — ${MIAMI_AUTO_DEMO_REQUESTS.length} solicitudes (${created} nuevas, ${updated} actualizadas).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
