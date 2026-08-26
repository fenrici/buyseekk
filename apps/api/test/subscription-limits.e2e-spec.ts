import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { FREE_DAILY_OFFER_LIMIT, FREE_MAX_SMART_ALERTS, SUBSCRIPTION_LIMIT_MESSAGES } from '@buyseekk/shared';
import { PrismaService } from '../src/prisma/prisma.service';
import { authHeader, createTestApp, ownedTestImageUrl, registerUser, resetDatabase } from './helpers';

describe('Subscription plan limits (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const runId = Date.now();
  const password = 'Testpass123';
  let previousUnlock: string | undefined;

  const bmwMiamiFilters = {
    category: 'AUTOS',
    operation: '',
    location: 'Miami, FL',
    zone: '',
    bedrooms: '',
    minSqm: '',
    maxSqm: '',
    carBrand: 'BMW',
    carModel: '',
    carColor: '',
    carYearMin: '',
    maxMileage: '',
  };

  beforeAll(async () => {
    previousUnlock = process.env.PLUS_FEATURES_UNLOCKED;
    process.env.PLUS_FEATURES_UNLOCKED = 'false';
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
    if (previousUnlock === undefined) delete process.env.PLUS_FEATURES_UNLOCKED;
    else process.env.PLUS_FEATURES_UNLOCKED = previousUnlock;
  });

  it('includes subscriptionPlan FREE on /auth/me by default', async () => {
    const seller = await registerUser(app, {
      email: `plan-me-${runId}@test.buyseekk.com`,
      password,
      name: 'Seller Plan',
      role: 'SELLER',
      country: 'US',
    });

    const me = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set(authHeader(seller.token))
      .expect(200);

    expect(me.body.subscriptionPlan).toBe('FREE');
  });

  /** Reloj fijo para tests de límite diario: evita colisión con MAX_OFFERS_PER_HOUR al seedear en UTC midnight. */
  const OFFER_LIMIT_TEST_NOW = new Date('2026-06-15T18:00:00.000Z');

  /** Mismo día UTC que OFFER_LIMIT_TEST_NOW, pero fuera de la ventana horaria de spam. */
  function dailyLimitSeedCreatedAt() {
    return new Date(OFFER_LIMIT_TEST_NOW.getTime() - 2 * 60 * 60 * 1000);
  }

  async function withOfferLimitTestClock<T>(fn: () => Promise<T>): Promise<T> {
    jest.useFakeTimers({ now: OFFER_LIMIT_TEST_NOW, doNotFake: ['nextTick', 'setImmediate'] });
    try {
      return await fn();
    } finally {
      jest.useRealTimers();
    }
  }

  it('blocks FREE user after daily offer limit', async () => {
    await withOfferLimitTestClock(async () => {
    const buyer = await registerUser(app, {
      email: `plan-buyer-offers-${runId}@test.buyseekk.com`,
      password,
      name: 'Buyer Offers',
      role: 'BUYER',
      country: 'US',
    });
    const seller = await registerUser(app, {
      email: `plan-seller-offers-${runId}@test.buyseekk.com`,
      password,
      name: 'Seller Offers',
      role: 'SELLER',
      country: 'US',
    });

    const requestIds: string[] = [];
    for (let i = 0; i < FREE_DAILY_OFFER_LIMIT + 1; i++) {
      const req = await prisma.request.create({
        data: {
          userId: buyer.user.id,
          category: 'AUTOS',
          operation: 'COMPRA',
          title: `Auto test ${i}`,
          requirements: `Busco auto variante ${i}`,
          budget: 30000 + i,
          currency: 'USD',
          location: 'Miami, FL',
          zone: 'Brickell',
          country: 'US',
          carBrand: 'Toyota',
          carModel: 'Corolla',
          carColor: 'Blanco',
          carYearMin: 2018,
          maxMileage: 50000,
        },
      });
      requestIds.push(req.id);
    }

    const seedCreatedAt = dailyLimitSeedCreatedAt();
    for (let i = 0; i < FREE_DAILY_OFFER_LIMIT; i++) {
      await prisma.offer.create({
        data: {
          requestId: requestIds[i],
          sellerId: seller.user.id,
          price: 28000 + i,
          currency: 'USD',
          message: `Oferta número ${i + 1} en excelente estado.`,
          imageUrls: [ownedTestImageUrl(seller.user.id)],
          requestTitle: `Auto test ${i}`,
          requestBudget: 30000 + i,
          requestRequirements: `Busco auto variante ${i}`,
          requestLocation: 'Miami, FL',
          createdAt: seedCreatedAt,
        },
      });
    }

    const blocked = await request(app.getHttpServer())
      .post('/api/offers')
      .set(authHeader(seller.token))
      .send({
        requestId: requestIds[FREE_DAILY_OFFER_LIMIT],
        price: 29000,
        currency: 'USD',
        message: 'Oferta que debería superar el límite diario.',
        imageUrls: [ownedTestImageUrl(seller.user.id)],
      })
      .expect(400);

    expect(blocked.body.message).toBe(SUBSCRIPTION_LIMIT_MESSAGES.dailyOffers);
    });
  });

  it('blocks FREE user after smart alert limit', async () => {
    const seller = await registerUser(app, {
      email: `plan-seller-alerts-${runId}@test.buyseekk.com`,
      password,
      name: 'Seller Alerts',
      role: 'SELLER',
      country: 'US',
    });

    for (let i = 0; i < FREE_MAX_SMART_ALERTS; i++) {
      await request(app.getHttpServer())
        .post('/api/saved-searches')
        .set(authHeader(seller.token))
        .send({
          name: `Alerta ${i + 1}`,
          category: 'AUTOS',
          filters: { ...bmwMiamiFilters, location: `Miami, FL zona ${i}` },
        })
        .expect(201);
    }

    const blocked = await request(app.getHttpServer())
      .post('/api/saved-searches')
      .set(authHeader(seller.token))
      .send({ name: 'Alerta extra', category: 'AUTOS', filters: bmwMiamiFilters })
      .expect(400);

    expect(blocked.body.message).toBe(SUBSCRIPTION_LIMIT_MESSAGES.smartAlerts);
  });

  it('grants Plus via ACTIVE Stripe Subscription without plan cache', async () => {
    const seller = await registerUser(app, {
      email: `plan-sub-active-${runId}@test.buyseekk.com`,
      password,
      name: 'Seller Sub Active',
      role: 'SELLER',
      country: 'US',
    });

    await prisma.subscription.create({
      data: {
        userId: seller.user.id,
        provider: 'STRIPE',
        providerCustomerId: `cus_test_${runId}`,
        providerSubscriptionId: `sub_active_${runId}`,
        providerPriceId: 'price_plus_test',
        status: 'ACTIVE',
        currentPeriodStart: new Date('2026-08-01T00:00:00.000Z'),
        currentPeriodEnd: new Date('2026-09-01T00:00:00.000Z'),
      },
    });

    for (let i = 0; i < FREE_MAX_SMART_ALERTS + 1; i++) {
      await request(app.getHttpServer())
        .post('/api/saved-searches')
        .set(authHeader(seller.token))
        .send({
          name: `Sub alerta ${i + 1}`,
          category: 'AUTOS',
          filters: { ...bmwMiamiFilters, location: `Miami Sub ${i}` },
        })
        .expect(201);
    }
  });

  it('grants Plus while CANCELED but currentPeriodEnd is in the future', async () => {
    const seller = await registerUser(app, {
      email: `plan-sub-canceled-${runId}@test.buyseekk.com`,
      password,
      name: 'Seller Sub Canceled',
      role: 'SELLER',
      country: 'US',
    });

    await prisma.subscription.create({
      data: {
        userId: seller.user.id,
        provider: 'STRIPE',
        providerSubscriptionId: `sub_canceled_${runId}`,
        status: 'CANCELED',
        cancelAtPeriodEnd: true,
        canceledAt: new Date('2026-08-20T00:00:00.000Z'),
        // Far-future period end so wall-clock e2e stays deterministic without faking timers.
        currentPeriodEnd: new Date('2099-01-01T00:00:00.000Z'),
      },
    });

    await request(app.getHttpServer())
      .post('/api/saved-searches')
      .set(authHeader(seller.token))
      .send({
        name: 'Canceled still plus',
        category: 'AUTOS',
        filters: { ...bmwMiamiFilters, carBrand: 'Audi' },
      })
      .expect(201);

    // Create 3 more would hit Free limit without Plus — create up to Free max + 1 total
    for (let i = 0; i < FREE_MAX_SMART_ALERTS; i++) {
      await request(app.getHttpServer())
        .post('/api/saved-searches')
        .set(authHeader(seller.token))
        .send({
          name: `Canceled plus ${i + 2}`,
          category: 'AUTOS',
          filters: { ...bmwMiamiFilters, location: `Naples ${i}` },
        })
        .expect(201);
    }
  });

  it('does not grant Plus when CANCELED period already ended', async () => {
    const seller = await registerUser(app, {
      email: `plan-sub-canceled-past-${runId}@test.buyseekk.com`,
      password,
      name: 'Seller Sub Canceled Past',
      role: 'SELLER',
      country: 'US',
    });

    await prisma.subscription.create({
      data: {
        userId: seller.user.id,
        provider: 'STRIPE',
        providerSubscriptionId: `sub_canceled_past_${runId}`,
        status: 'CANCELED',
        cancelAtPeriodEnd: true,
        canceledAt: new Date('2026-07-01T00:00:00.000Z'),
        currentPeriodEnd: new Date('2020-01-01T00:00:00.000Z'),
      },
    });

    for (let i = 0; i < FREE_MAX_SMART_ALERTS; i++) {
      await request(app.getHttpServer())
        .post('/api/saved-searches')
        .set(authHeader(seller.token))
        .send({
          name: `Canceled past ${i + 1}`,
          category: 'AUTOS',
          filters: { ...bmwMiamiFilters, location: `Past ${i}` },
        })
        .expect(201);
    }

    await request(app.getHttpServer())
      .post('/api/saved-searches')
      .set(authHeader(seller.token))
      .send({
        name: 'Canceled past blocked',
        category: 'AUTOS',
        filters: { ...bmwMiamiFilters, location: 'Past blocked' },
      })
      .expect(400);
  });

  it('does not grant Plus when Subscription is EXPIRED', async () => {
    const seller = await registerUser(app, {
      email: `plan-sub-expired-${runId}@test.buyseekk.com`,
      password,
      name: 'Seller Sub Expired',
      role: 'SELLER',
      country: 'US',
    });

    await prisma.subscription.create({
      data: {
        userId: seller.user.id,
        provider: 'STRIPE',
        providerSubscriptionId: `sub_expired_${runId}`,
        status: 'EXPIRED',
        currentPeriodEnd: new Date('2026-01-01T00:00:00.000Z'),
      },
    });

    for (let i = 0; i < FREE_MAX_SMART_ALERTS; i++) {
      await request(app.getHttpServer())
        .post('/api/saved-searches')
        .set(authHeader(seller.token))
        .send({
          name: `Expired free ${i + 1}`,
          category: 'AUTOS',
          filters: { ...bmwMiamiFilters, location: `Orlando ${i}` },
        })
        .expect(201);
    }

    await request(app.getHttpServer())
      .post('/api/saved-searches')
      .set(authHeader(seller.token))
      .send({
        name: 'Expired blocked',
        category: 'AUTOS',
        filters: { ...bmwMiamiFilters, location: 'Tampa, FL' },
      })
      .expect(400);
  });

  it('does not grant Plus from stale User.subscriptionPlan cache alone', async () => {
    const seller = await registerUser(app, {
      email: `plan-stale-cache-${runId}@test.buyseekk.com`,
      password,
      name: 'Seller Stale Cache',
      role: 'SELLER',
      country: 'US',
    });

    await prisma.user.update({
      where: { id: seller.user.id },
      data: { subscriptionPlan: 'PLUS' },
    });

    for (let i = 0; i < FREE_MAX_SMART_ALERTS; i++) {
      await request(app.getHttpServer())
        .post('/api/saved-searches')
        .set(authHeader(seller.token))
        .send({
          name: `Stale cache ${i + 1}`,
          category: 'AUTOS',
          filters: { ...bmwMiamiFilters, location: `Stale ${i}` },
        })
        .expect(201);
    }

    const blocked = await request(app.getHttpServer())
      .post('/api/saved-searches')
      .set(authHeader(seller.token))
      .send({
        name: 'Stale cache blocked',
        category: 'AUTOS',
        filters: { ...bmwMiamiFilters, location: 'Stale blocked' },
      })
      .expect(400);

    expect(blocked.body.message).toBe(SUBSCRIPTION_LIMIT_MESSAGES.smartAlerts);
  });

  it('does not grant Plus from legacy ENTERPRISE plan cache alone', async () => {
    const seller = await registerUser(app, {
      email: `plan-enterprise-cache-${runId}@test.buyseekk.com`,
      password,
      name: 'Seller Enterprise Cache',
      role: 'SELLER',
      country: 'US',
    });

    await prisma.user.update({
      where: { id: seller.user.id },
      data: { subscriptionPlan: 'ENTERPRISE' },
    });

    for (let i = 0; i < FREE_MAX_SMART_ALERTS; i++) {
      await request(app.getHttpServer())
        .post('/api/saved-searches')
        .set(authHeader(seller.token))
        .send({
          name: `Enterprise cache ${i + 1}`,
          category: 'AUTOS',
          filters: { ...bmwMiamiFilters, location: `Ent ${i}` },
        })
        .expect(201);
    }

    await request(app.getHttpServer())
      .post('/api/saved-searches')
      .set(authHeader(seller.token))
      .send({
        name: 'Enterprise cache blocked',
        category: 'AUTOS',
        filters: { ...bmwMiamiFilters, location: 'Ent blocked' },
      })
      .expect(400);
  });

  it('allows Plus via ACTIVE Subscription beyond FREE limits (not plan cache)', async () => {
    await withOfferLimitTestClock(async () => {
    const buyer = await registerUser(app, {
      email: `plan-buyer-plus-${runId}@test.buyseekk.com`,
      password,
      name: 'Buyer Plus',
      role: 'BUYER',
      country: 'US',
    });
    const seller = await registerUser(app, {
      email: `plan-seller-plus-${runId}@test.buyseekk.com`,
      password,
      name: 'Seller Plus',
      role: 'SELLER',
      country: 'US',
    });

    await prisma.subscription.create({
      data: {
        userId: seller.user.id,
        provider: 'STRIPE',
        providerSubscriptionId: `sub_plus_limits_${runId}`,
        status: 'ACTIVE',
        currentPeriodStart: new Date('2026-06-01T00:00:00.000Z'),
        currentPeriodEnd: new Date('2026-07-01T00:00:00.000Z'),
      },
    });

    for (let i = 0; i < FREE_MAX_SMART_ALERTS + 1; i++) {
      await request(app.getHttpServer())
        .post('/api/saved-searches')
        .set(authHeader(seller.token))
        .send({
          name: `Plus alerta ${i + 1}`,
          category: 'AUTOS',
          filters: { ...bmwMiamiFilters, location: `Miami Plus ${i}` },
        })
        .expect(201);
    }

    const requestIds: string[] = [];
    for (let i = 0; i < FREE_DAILY_OFFER_LIMIT + 1; i++) {
      const req = await prisma.request.create({
        data: {
          userId: buyer.user.id,
          category: 'AUTOS',
          operation: 'COMPRA',
          title: `Plus auto ${i}`,
          requirements: `Plus busca auto ${i}`,
          budget: 40000 + i,
          currency: 'USD',
          location: 'Miami, FL',
          zone: 'Brickell',
          country: 'US',
          carBrand: 'Honda',
          carModel: 'Civic',
          carColor: 'Gris',
          carYearMin: 2019,
          maxMileage: 40000,
        },
      });
      requestIds.push(req.id);
    }

    const seedCreatedAt = dailyLimitSeedCreatedAt();
    for (let i = 0; i < FREE_DAILY_OFFER_LIMIT; i++) {
      await prisma.offer.create({
        data: {
          requestId: requestIds[i],
          sellerId: seller.user.id,
          price: 35000 + i,
          currency: 'USD',
          message: `Oferta Plus número ${i + 1}.`,
          imageUrls: [ownedTestImageUrl(seller.user.id)],
          requestTitle: `Plus auto ${i}`,
          requestBudget: 40000 + i,
          requestRequirements: `Plus busca auto ${i}`,
          requestLocation: 'Miami, FL',
          createdAt: seedCreatedAt,
        },
      });
    }

    await request(app.getHttpServer())
      .post('/api/offers')
      .set(authHeader(seller.token))
      .send({
        requestId: requestIds[FREE_DAILY_OFFER_LIMIT],
        price: 36000,
        currency: 'USD',
        message: 'Oferta Plus 21 sin límite.',
        imageUrls: [ownedTestImageUrl(seller.user.id)],
      })
      .expect(201);
    });
  });

  it('syncPlanCacheFromEntitlements mirrors FREE/PLUS from Subscription rows', async () => {
    const { SubscriptionService } = await import('../src/subscription/subscription.service');
    const service = app.get(SubscriptionService);
    const seller = await registerUser(app, {
      email: `plan-sync-cache-${runId}@test.buyseekk.com`,
      password,
      name: 'Seller Sync Cache',
      role: 'SELLER',
      country: 'US',
    });

    await prisma.user.update({
      where: { id: seller.user.id },
      data: { subscriptionPlan: 'ENTERPRISE' },
    });

    const now = new Date('2026-08-26T15:00:00.000Z');
    const cleared = await service.syncPlanCacheFromEntitlements(seller.user.id, now);
    expect(cleared).toBe('FREE');
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: seller.user.id } })).subscriptionPlan,
    ).toBe('FREE');

    await prisma.subscription.create({
      data: {
        userId: seller.user.id,
        provider: 'STRIPE',
        providerSubscriptionId: `sub_sync_${runId}`,
        status: 'ACTIVE',
        currentPeriodEnd: new Date('2026-09-26T15:00:00.000Z'),
      },
    });

    const plus = await service.syncPlanCacheFromEntitlements(seller.user.id, now);
    expect(plus).toBe('PLUS');
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: seller.user.id } })).subscriptionPlan,
    ).toBe('PLUS');

    const again = await service.syncPlanCacheFromEntitlements(seller.user.id, now);
    expect(again).toBe('PLUS');
  });
});
