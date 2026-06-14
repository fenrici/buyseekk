import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { authHeader, createTestApp, registerUser, resetDatabase } from './helpers';

describe('Admin panel (e2e)', () => {
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

  async function createAdmin() {
    const admin = await registerUser(app, {
      email: `admin-${runId}-${Math.random()}@test.buyseekk.com`,
      password,
      name: 'Admin',
      role: 'BUYER',
      country: 'US',
    });
    await prisma.user.update({ where: { id: admin.user.id }, data: { role: 'ADMIN' } });
    return admin;
  }

  function createRequest(token: string, variant = 'a') {
    return request(app.getHttpServer())
      .post('/api/requests')
      .set(authHeader(token))
      .send({
        category: 'AUTOS',
        operation: 'COMPRA',
        requirements: `Busco un auto familiar en buen estado para la familia variante ${variant}`,
        budget: 20000,
        currency: 'USD',
        location: 'Miami, FL',
        zone: 'Brickell',
        country: 'US',
        carBrand: 'Toyota',
        carModel: 'Corolla',
        carColor: 'Blanco',
        carYearMin: 2018,
        maxMileage: 60000,
      });
  }

  it('blocks a normal user from accessing /admin endpoints (403)', async () => {
    const buyer = await registerUser(app, {
      email: `norm-${runId}@test.buyseekk.com`,
      password,
      name: 'Buyer',
      role: 'BUYER',
      country: 'US',
    });

    await request(app.getHttpServer())
      .get('/api/admin/overview')
      .set(authHeader(buyer.token))
      .expect(403);
  });

  it('lets an admin read the overview', async () => {
    const admin = await createAdmin();

    const res = await request(app.getHttpServer())
      .get('/api/admin/overview')
      .set(authHeader(admin.token))
      .expect(200);

    expect(res.body).toHaveProperty('totalUsers');
    expect(res.body).toHaveProperty('pendingReports');
    expect(res.body).toHaveProperty('blockedUsers');
    expect(typeof res.body.totalUsers).toBe('number');
  });

  it('lets an admin block a user, and a blocked user cannot publish, offer or edit profile', async () => {
    const admin = await createAdmin();
    const buyer = await registerUser(app, {
      email: `blk-buyer-${runId}@test.buyseekk.com`,
      password,
      name: 'Blocked Buyer',
      role: 'BUYER',
      country: 'US',
    });
    const seller = await registerUser(app, {
      email: `blk-seller-${runId}@test.buyseekk.com`,
      password,
      name: 'Blocked Seller',
      role: 'SELLER',
      country: 'US',
    });

    // A request to offer on (published by an unblocked buyer).
    const reqRes = await createRequest(buyer.token, 'inicial').expect(201);

    // Block both users.
    await request(app.getHttpServer())
      .patch(`/api/admin/users/${buyer.user.id}/block`)
      .set(authHeader(admin.token))
      .send({ reason: 'abuso' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/admin/users/${seller.user.id}/block`)
      .set(authHeader(admin.token))
      .send({})
      .expect(200);

    const blockedBuyer = await prisma.user.findUnique({ where: { id: buyer.user.id } });
    expect(blockedBuyer?.blocked).toBe(true);
    expect(blockedBuyer?.blockedReason).toBe('abuso');

    // Blocked buyer cannot publish.
    await createRequest(buyer.token, 'bloqueado').expect(403);

    // Blocked buyer cannot edit profile.
    await request(app.getHttpServer())
      .patch('/api/users/me')
      .set(authHeader(buyer.token))
      .send({ name: 'Hacked' })
      .expect(403);

    // Blocked seller cannot send offers.
    await request(app.getHttpServer())
      .post('/api/offers')
      .set(authHeader(seller.token))
      .send({
        requestId: reqRes.body.id,
        price: 18000,
        currency: 'USD',
        message: 'Tengo el auto ideal para tu familia disponible.',
        imageUrls: ['/api/uploads/test.jpg'],
      })
      .expect(403);

    // Unblock buyer -> can publish again.
    await request(app.getHttpServer())
      .patch(`/api/admin/users/${buyer.user.id}/unblock`)
      .set(authHeader(admin.token))
      .expect(200);

    await createRequest(buyer.token, 'reactivado').expect(201);
  });

  it('forbids an admin from acting as buyer or seller (publish, offer, chat)', async () => {
    const admin = await createAdmin();
    const buyer = await registerUser(app, {
      email: `mkt-buyer-${runId}@test.buyseekk.com`,
      password,
      name: 'Buyer',
      role: 'BUYER',
      country: 'US',
    });

    const reqRes = await createRequest(buyer.token, 'mkt').expect(201);

    // Admin cannot publish a request.
    await createRequest(admin.token, 'admintry').expect(403);

    // Admin cannot send offers.
    await request(app.getHttpServer())
      .post('/api/offers')
      .set(authHeader(admin.token))
      .send({
        requestId: reqRes.body.id,
        price: 15000,
        currency: 'USD',
        message: 'Un admin no debería poder ofertar en el marketplace nunca.',
        imageUrls: ['/api/uploads/test.jpg'],
      })
      .expect(403);

    // Admin cannot use normal chats.
    await request(app.getHttpServer())
      .get('/api/chats')
      .set(authHeader(admin.token))
      .expect(403);

    // Admin cannot browse the seller marketplace.
    await request(app.getHttpServer())
      .get('/api/requests')
      .set(authHeader(admin.token))
      .expect(403);
  });

  it('lets a user create a report and an admin list it', async () => {
    const admin = await createAdmin();
    const reporter = await registerUser(app, {
      email: `rep-${runId}@test.buyseekk.com`,
      password,
      name: 'Reporter',
      role: 'BUYER',
      country: 'US',
    });
    const reported = await registerUser(app, {
      email: `bad-${runId}@test.buyseekk.com`,
      password,
      name: 'Bad Actor',
      role: 'SELLER',
      country: 'US',
    });

    const created = await request(app.getHttpServer())
      .post('/api/reports')
      .set(authHeader(reporter.token))
      .send({ reason: 'SCAM', details: 'Pidió pago por fuera de la plataforma', reportedUserId: reported.user.id })
      .expect(201);

    expect(created.body.status).toBe('PENDING');

    const list = await request(app.getHttpServer())
      .get('/api/admin/reports')
      .set(authHeader(admin.token))
      .expect(200);

    expect(list.body.items.length).toBeGreaterThanOrEqual(1);
    expect(list.body.items[0].reason).toBe('SCAM');

    // Admin can change report status.
    await request(app.getHttpServer())
      .patch(`/api/admin/reports/${created.body.id}/status`)
      .set(authHeader(admin.token))
      .send({ status: 'RESOLVED' })
      .expect(200);

    // Overview now reflects no pending reports.
    const overview = await request(app.getHttpServer())
      .get('/api/admin/overview')
      .set(authHeader(admin.token))
      .expect(200);
    expect(overview.body.pendingReports).toBe(0);
  });
});
