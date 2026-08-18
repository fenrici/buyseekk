import { INestApplication } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { OFFER_HIGHLIGHTS_POOL_LIMIT } from '@buyseekk/shared';
import { NotificationsService } from '../src/notifications/notifications.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { authHeader, createTestApp, ownedTestImageUrl, registerUser, resetDatabase } from './helpers';

describe('DB performance guards (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const runId = Date.now();
  const password = 'testpass123';

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('lifecycle scan skips recently active requests', async () => {
    const notifications = app.get(NotificationsService);
    const buyer = await registerUser(app, {
      email: `perf-life-${runId}@test.buyseekk.com`,
      password,
      name: 'Buyer',
      role: 'BUYER',
      country: 'US',
    });

    await request(app.getHttpServer())
      .post('/api/requests')
      .set(authHeader(buyer.token))
      .send({
        category: 'AUTOS',
        requirements: 'Solicitud reciente sin alertas de lifecycle todavía.',
        budget: 120000,
        currency: 'USD',
        location: 'Miami, FL',
        country: 'US',
        carBrand: 'Ferrari',
        carModel: '488 GTB',
        carColor: 'Rosso Corsa',
        carYearMin: 2018,
        maxMileage: 10000,
      })
      .expect(201);

    await notifications.scanRequestLifecycle();

    const rows = await prisma.notification.findMany({
      where: {
        userId: buyer.user.id,
        type: { in: [NotificationType.REQUEST_EXPIRING, NotificationType.REQUEST_INACTIVE] },
      },
    });
    expect(rows).toHaveLength(0);
  });

  it('received highlights returns at most three items even with many pending offers', async () => {
    const buyer = await registerUser(app, {
      email: `perf-hl-${runId}@test.buyseekk.com`,
      password,
      name: 'Buyer',
      role: 'BUYER',
      country: 'US',
    });
    const req = await request(app.getHttpServer())
      .post('/api/requests')
      .set(authHeader(buyer.token))
      .send({
        category: 'AUTOS',
        requirements: 'Solicitud con varias ofertas pendientes para highlights.',
        budget: 200000,
        currency: 'USD',
        location: 'Miami, FL',
        country: 'US',
        carBrand: 'Ferrari',
        carModel: '488 GTB',
        carColor: 'Rosso Corsa',
        carYearMin: 2018,
        maxMileage: 12000,
      })
      .expect(201);

    const pool = OFFER_HIGHLIGHTS_POOL_LIMIT + 5;
    for (let i = 0; i < pool; i++) {
      const seller = await prisma.user.create({
        data: {
          email: `perf-hl-s-${runId}-${i}@test.buyseekk.com`,
          passwordHash: 'test',
          name: `Seller ${i}`,
          role: 'SELLER',
          country: 'US',
          locale: 'EN',
          currency: 'USD',
          emailVerified: true,
        },
      });
      await prisma.offer.create({
        data: {
          requestId: req.body.id,
          sellerId: seller.id,
          price: 190000 + i,
          currency: 'USD',
          message: `Oferta número ${i} con fotos incluidas.`,
          imageUrls: [ownedTestImageUrl(seller.id)],
          requestTitle: req.body.title,
          requestBudget: 200000,
          requestRequirements: req.body.requirements,
          requestLocation: 'Miami, FL',
        },
      });
    }

    const res = await request(app.getHttpServer())
      .get('/api/offers/received/highlights')
      .set(authHeader(buyer.token))
      .expect(200);

    expect(res.body.highlights.length).toBeLessThanOrEqual(3);
    expect(await prisma.offer.count({ where: { requestId: req.body.id, status: 'PENDIENTE' } })).toBe(
      pool,
    );
  });

  it('exposes liveness without hitting the database', async () => {
    const res = await request(app.getHttpServer()).get('/api/health/live').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });
});
