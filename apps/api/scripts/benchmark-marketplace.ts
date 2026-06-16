/**
 * Local marketplace seller load benchmark.
 * Requires PostgreSQL (DATABASE_URL) and NODE_ENV !== production.
 *
 * Usage: npm run benchmark:marketplace
 */
import { Country, Currency, Locale, OperationType, RequestCategory, UserRole } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { INestApplication } from '@nestjs/common';
import { createTestApp, registerUser } from '../test/helpers';
import { PrismaService } from '../src/prisma/prisma.service';

const TARGET_REQUESTS = 10_000;
const WARMUP = 2;
const ITERATIONS = 10;
const PASS_MS = 500;

const BRANDS = ['BMW', 'Mercedes-Benz', 'Audi', 'Porsche', 'Ferrari', 'Lamborghini'];
const LOCATIONS = ['Miami, FL', 'Miami Beach, FL', 'Coral Gables, FL', 'Fort Lauderdale, FL'];

async function ensureBenchmarkData(prisma: PrismaService) {
  const visibleCount = await prisma.request.count({
    where: { active: true, country: Country.US, hiddenByModeration: false },
  });

  if (visibleCount >= TARGET_REQUESTS) {
    console.log(`[benchmark] ${visibleCount} requests already present — skipping seed.`);
    return;
  }

  console.log(`[benchmark] Seeding up to ${TARGET_REQUESTS} requests (have ${visibleCount})...`);

  let buyer = await prisma.user.findFirst({
    where: { email: { startsWith: 'bench-buyer@' } },
  });
  if (!buyer) {
    buyer = await prisma.user.create({
      data: {
        email: 'bench-buyer@benchmark.local',
        passwordHash: 'bench',
        name: 'Bench Buyer',
        role: UserRole.BUYER,
        country: Country.US,
        locale: Locale.EN,
        currency: Currency.USD,
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });
  }

  const batchSize = 500;
  let created = visibleCount;
  const now = new Date();

  while (created < TARGET_REQUESTS) {
    const take = Math.min(batchSize, TARGET_REQUESTS - created);
    const rows = Array.from({ length: take }, (_, i) => {
      const n = created + i;
      return {
        userId: buyer!.id,
        category: RequestCategory.AUTOS,
        operation: OperationType.COMPRA,
        title: `Bench request ${n}`,
        requirements: `Benchmark autos request ${n} in Miami metro.`,
        budget: 80_000 + (n % 50_000),
        currency: Currency.USD,
        location: LOCATIONS[n % LOCATIONS.length]!,
        country: Country.US,
        carBrand: BRANDS[n % BRANDS.length]!,
        carModel: 'Series benchmark',
        carYearMin: 2015 + (n % 8),
        maxMileage: 10_000 + (n % 80_000),
        active: true,
        lastBuyerActivityAt: now,
        lastActivityAt: now,
      };
    });
    await prisma.request.createMany({ data: rows });
    created += take;
    if (created % 2000 === 0 || created >= TARGET_REQUESTS) {
      console.log(`[benchmark]   ${created}/${TARGET_REQUESTS}`);
    }
  }
}

function percentile(sorted: number[], p: number) {
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx] ?? 0;
}

async function measure(
  app: INestApplication<App>,
  token: string,
  label: string,
  path: string,
) {
  const times: number[] = [];

  for (let i = 0; i < WARMUP + ITERATIONS; i += 1) {
    const start = performance.now();
    const res = await request(app.getHttpServer())
      .get(path)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const elapsed = performance.now() - start;

    if (i >= WARMUP) {
      times.push(elapsed);
    }
    if (i === WARMUP) {
      console.log(`[benchmark] ${label} sample total=${res.body.total}`);
    }
  }

  times.sort((a, b) => a - b);
  const avg = times.reduce((s, t) => s + t, 0) / times.length;
  const p50 = percentile(times, 50);
  const p95 = percentile(times, 95);
  const ok = p95 <= PASS_MS;

  console.log(
    `[benchmark] ${label}: avg=${avg.toFixed(0)}ms p50=${p50.toFixed(0)}ms p95=${p95.toFixed(0)}ms ${ok ? 'OK' : 'SLOW'}`,
  );
  return { label, avg, p50, p95, ok };
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('Benchmark blocked in production.');
    process.exit(1);
  }

  const app = await createTestApp();
  const prisma = app.get(PrismaService);

  try {
    await ensureBenchmarkData(prisma);

    const seller = await registerUser(app, {
      email: `bench-seller-${Date.now()}@benchmark.local`,
      password: 'benchpass123',
      name: 'Bench Seller',
      role: 'SELLER',
      country: 'US',
    });

    const scenarios = [
      { label: 'no filters', path: '/api/requests?page=1&limit=20' },
      { label: 'category=AUTOS', path: '/api/requests?category=AUTOS&page=1&limit=20' },
      { label: 'carBrand=BMW', path: '/api/requests?carBrand=BMW&page=1&limit=20' },
      { label: 'location=Miami', path: '/api/requests?location=Miami&page=1&limit=20' },
    ];

    console.log(`[benchmark] ${ITERATIONS} timed requests per scenario (threshold p95<=${PASS_MS}ms)`);
    const results = [];
    for (const s of scenarios) {
      results.push(await measure(app, seller.token, s.label, s.path));
    }

    const allOk = results.every((r) => r.ok);
    console.log(allOk ? '[benchmark] All scenarios within threshold.' : '[benchmark] Some scenarios exceeded threshold.');
    process.exit(allOk ? 0 : 1);
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
