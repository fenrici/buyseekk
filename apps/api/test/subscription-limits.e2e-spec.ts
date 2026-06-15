import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { FREE_DAILY_OFFER_LIMIT, FREE_MAX_SMART_ALERTS, SUBSCRIPTION_LIMIT_MESSAGES } from '@buyseekk/shared';
import { PrismaService } from '../src/prisma/prisma.service';
import { authHeader, createTestApp, registerUser, resetDatabase } from './helpers';

describe('Subscription plan limits (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const runId = Date.now();
  const password = 'testpass123';
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

  function startOfUtcDay(now = new Date()) {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }

  it('blocks FREE user after daily offer limit', async () => {
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

    const dayStart = startOfUtcDay();
    for (let i = 0; i < FREE_DAILY_OFFER_LIMIT; i++) {
      await prisma.offer.create({
        data: {
          requestId: requestIds[i],
          sellerId: seller.user.id,
          price: 28000 + i,
          currency: 'USD',
          message: `Oferta número ${i + 1} en excelente estado.`,
          imageUrls: ['/api/uploads/e2e-test.jpg'],
          requestTitle: `Auto test ${i}`,
          requestBudget: 30000 + i,
          requestRequirements: `Busco auto variante ${i}`,
          requestLocation: 'Miami, FL',
          createdAt: dayStart,
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
        imageUrls: ['/api/uploads/e2e-test.jpg'],
      })
      .expect(400);

    expect(blocked.body.message).toBe(SUBSCRIPTION_LIMIT_MESSAGES.dailyOffers);
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

  it('allows PLUS user beyond FREE limits', async () => {
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

    await prisma.user.update({
      where: { id: seller.user.id },
      data: { subscriptionPlan: 'PLUS' },
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

    const dayStart = startOfUtcDay();
    for (let i = 0; i < FREE_DAILY_OFFER_LIMIT; i++) {
      await prisma.offer.create({
        data: {
          requestId: requestIds[i],
          sellerId: seller.user.id,
          price: 35000 + i,
          currency: 'USD',
          message: `Oferta Plus número ${i + 1}.`,
          imageUrls: ['/api/uploads/e2e-test.jpg'],
          requestTitle: `Plus auto ${i}`,
          requestBudget: 40000 + i,
          requestRequirements: `Plus busca auto ${i}`,
          requestLocation: 'Miami, FL',
          createdAt: dayStart,
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
        imageUrls: ['/api/uploads/e2e-test.jpg'],
      })
      .expect(201);
  });
});
