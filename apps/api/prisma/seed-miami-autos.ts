/**
 * Carga 35 solicitudes demo de autos en Miami sin tocar el resto de la base.
 *
 * Uso local:  npm run prisma:seed:miami -w @buyseekk/api
 * Producción: ALLOW_PRODUCTION_SEED=true npm run prisma:seed:miami -w @buyseekk/api
 */
import { PrismaClient } from '@prisma/client';
import { seedMiamiAutos } from '../src/demo/miami-auto-seed';

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
  console.error(
    'Bloqueado en producción. Seteá ALLOW_PRODUCTION_SEED=true para cargar las 35 solicitudes de Miami.',
  );
  process.exit(1);
}

const prisma = new PrismaClient();

seedMiamiAutos(prisma)
  .then((result) => {
    console.log(
      `Miami autos seed OK — ${result.total} solicitudes (${result.created} nuevas, ${result.updated} actualizadas).`,
    );
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
