import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { generateSecureToken, hashToken } from '../src/auth/token.util';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  authHeader,
  createTestApp,
  registerUser,
  resetDatabase,
} from './helpers';

describe('Notifications (e2e)', () => {
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

  it('creates NEW_OFFER notification for buyer when seller sends offer', async () => {
    const buyer = await registerUser(app, {
      email: `notif-buyer-${runId}@test.buyseekk.com`,
      password,
      name: 'Buyer',
      role: 'BUYER',
      country: 'US',
    });
    const seller = await registerUser(app, {
      email: `notif-seller-${runId}@test.buyseekk.com`,
      password,
      name: 'Seller',
      role: 'SELLER',
      country: 'US',
    });

    const requestRes = await request(app.getHttpServer())
      .post('/api/requests')
      .set(authHeader(buyer.token))
      .send({
        category: 'AUTOS',
        operation: 'COMPRA',
        requirements: 'Busco Ferrari rojo impecable bajo km para notificaciones',
        budget: 50000,
        currency: 'USD',
        location: 'Miami, FL',
        zone: 'Brickell',
        country: 'US',
        carBrand: 'Ferrari',
        carModel: '488 GTB',
        carColor: 'Rosso Corsa',
        carYearMin: 2018,
        maxMileage: 15000,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/offers')
      .set(authHeader(seller.token))
      .send({
        requestId: requestRes.body.id,
        price: 48000,
        currency: 'USD',
        message: 'Oferta con notificación automática incluida.',
        imageUrls: ['/api/uploads/test.jpg'],
      })
      .expect(201);

    const countRes = await request(app.getHttpServer())
      .get('/api/notifications/unread-count')
      .set(authHeader(buyer.token))
      .expect(200);
    expect(countRes.body.count).toBeGreaterThanOrEqual(1);

    const listRes = await request(app.getHttpServer())
      .get('/api/notifications/recent')
      .set(authHeader(buyer.token))
      .expect(200);
    expect(listRes.body[0].type).toBe('NEW_OFFER');

    await request(app.getHttpServer())
      .patch('/api/notifications/read-all')
      .set(authHeader(buyer.token))
      .expect(200);

    const afterRead = await request(app.getHttpServer())
      .get('/api/notifications/unread-count')
      .set(authHeader(buyer.token))
      .expect(200);
    expect(afterRead.body.count).toBe(0);
  });

  it('creates EMAIL_VERIFIED notification on verify-email', async () => {
    const user = await registerUser(
      app,
      {
        email: `notif-verify-${runId}@test.buyseekk.com`,
        password,
        name: 'Verify User',
        role: 'BUYER',
        country: 'US',
      },
      { verify: false },
    );

    const plain = generateSecureToken();
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.user.id,
        tokenHash: hashToken(plain),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    await request(app.getHttpServer())
      .post('/api/auth/verify-email')
      .send({ token: plain })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get('/api/notifications')
      .set(authHeader(user.token))
      .expect(200);
    expect(res.body.items.some((n: { type: string }) => n.type === 'EMAIL_VERIFIED')).toBe(true);
  });
});
