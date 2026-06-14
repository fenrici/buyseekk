import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { authHeader, createTestApp, registerUser, resetDatabase } from './helpers';

describe('Admin pagination (e2e)', () => {
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
      email: `admin-pg-${runId}-${Math.random()}@test.buyseekk.com`,
      password,
      name: 'Admin',
      role: 'BUYER',
      country: 'US',
    });
    await prisma.user.update({ where: { id: admin.user.id }, data: { role: 'ADMIN' } });
    return admin;
  }

  function seedUsers(count: number, country: 'AR' | 'US' = 'US') {
    return prisma.user.createMany({
      data: Array.from({ length: count }, (_, i) => ({
        email: `seed-${country}-${runId}-${i}-${Math.random()}@test.buyseekk.com`,
        passwordHash: 'x',
        name: `Seed User ${i}`,
        country,
        locale: 'EN' as const,
        currency: 'USD' as const,
      })),
    });
  }

  async function seedRequests(userId: string, count: number) {
    const ids: string[] = [];
    for (let i = 0; i < count; i += 1) {
      const r = await prisma.request.create({
        data: {
          userId,
          category: 'AUTOS',
          title: `Solicitud ${i}`,
          requirements: `Busco algo bueno numero ${i}`,
          budget: 10000 + i,
          currency: 'USD',
          location: 'Miami',
          country: 'US',
        },
        select: { id: true },
      });
      ids.push(r.id);
    }
    return ids;
  }

  function meta(body: { meta?: Record<string, unknown> }) {
    return body.meta as {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }

  it('paginates users with the standard { items, meta } envelope', async () => {
    const admin = await createAdmin();
    await seedUsers(30);

    const page1 = await request(app.getHttpServer())
      .get('/api/admin/users?page=1&limit=10')
      .set(authHeader(admin.token))
      .expect(200);

    expect(page1.body.items).toHaveLength(10);
    const m1 = meta(page1.body);
    expect(m1.total).toBe(31); // 30 seeded + admin
    expect(m1.page).toBe(1);
    expect(m1.limit).toBe(10);
    expect(m1.totalPages).toBe(4);
    expect(m1.hasNextPage).toBe(true);
    expect(m1.hasPrevPage).toBe(false);

    const page2 = await request(app.getHttpServer())
      .get('/api/admin/users?page=2&limit=10')
      .set(authHeader(admin.token))
      .expect(200);
    expect(page2.body.items).toHaveLength(10);
    expect(meta(page2.body).hasPrevPage).toBe(true);

    const lastPage = await request(app.getHttpServer())
      .get('/api/admin/users?page=4&limit=10')
      .set(authHeader(admin.token))
      .expect(200);
    expect(lastPage.body.items).toHaveLength(1);
    expect(meta(lastPage.body).hasNextPage).toBe(false);
  });

  it('uses default limit 25 when no limit is provided', async () => {
    const admin = await createAdmin();
    await seedUsers(40);

    const res = await request(app.getHttpServer())
      .get('/api/admin/users')
      .set(authHeader(admin.token))
      .expect(200);

    expect(res.body.items).toHaveLength(25);
    expect(meta(res.body).limit).toBe(25);
  });

  it('caps the limit at 100', async () => {
    const admin = await createAdmin();
    await seedUsers(5);

    const res = await request(app.getHttpServer())
      .get('/api/admin/users?limit=500')
      .set(authHeader(admin.token))
      .expect(200);

    expect(meta(res.body).limit).toBe(100);
  });

  it('paginates requests', async () => {
    const admin = await createAdmin();
    const buyer = await registerUser(app, {
      email: `pg-buyer-${runId}@test.buyseekk.com`,
      password,
      name: 'Buyer',
      role: 'BUYER',
      country: 'US',
    });
    await seedRequests(buyer.user.id, 12);

    const res = await request(app.getHttpServer())
      .get('/api/admin/requests?page=1&limit=5')
      .set(authHeader(admin.token))
      .expect(200);

    expect(res.body.items).toHaveLength(5);
    const m = meta(res.body);
    expect(m.total).toBe(12);
    expect(m.totalPages).toBe(3);
    expect(m.hasNextPage).toBe(true);
  });

  it('paginates offers', async () => {
    const admin = await createAdmin();
    const buyer = await registerUser(app, {
      email: `pg-obuyer-${runId}@test.buyseekk.com`,
      password,
      name: 'Buyer',
      role: 'BUYER',
      country: 'US',
    });
    const seller = await registerUser(app, {
      email: `pg-oseller-${runId}@test.buyseekk.com`,
      password,
      name: 'Seller',
      role: 'SELLER',
      country: 'US',
    });
    const reqIds = await seedRequests(buyer.user.id, 8);
    await prisma.offer.createMany({
      data: reqIds.map((requestId, i) => ({
        requestId,
        sellerId: seller.user.id,
        price: 9000 + i,
        currency: 'USD' as const,
        message: `Oferta numero ${i} para tu solicitud`,
        requestTitle: `Solicitud ${i}`,
        requestBudget: 10000,
        requestRequirements: `Busco algo bueno numero ${i}`,
        requestLocation: 'Miami',
      })),
    });

    const res = await request(app.getHttpServer())
      .get('/api/admin/offers?page=1&limit=3')
      .set(authHeader(admin.token))
      .expect(200);

    expect(res.body.items).toHaveLength(3);
    const m = meta(res.body);
    expect(m.total).toBe(8);
    expect(m.totalPages).toBe(3);
  });

  it('paginates reports', async () => {
    const admin = await createAdmin();
    const reporter = await registerUser(app, {
      email: `pg-reporter-${runId}@test.buyseekk.com`,
      password,
      name: 'Reporter',
      role: 'BUYER',
      country: 'US',
    });
    await prisma.report.createMany({
      data: Array.from({ length: 9 }, () => ({
        reporterId: reporter.user.id,
        reason: 'SPAM' as const,
        details: 'reporte de prueba',
      })),
    });

    const res = await request(app.getHttpServer())
      .get('/api/admin/reports?page=1&limit=4')
      .set(authHeader(admin.token))
      .expect(200);

    expect(res.body.items).toHaveLength(4);
    const m = meta(res.body);
    expect(m.total).toBe(9);
    expect(m.totalPages).toBe(3);
  });

  it('paginates security logs', async () => {
    const admin = await createAdmin();
    await prisma.securityLog.createMany({
      data: Array.from({ length: 14 }, () => ({ event: 'LOGIN_SUCCESS' as const })),
    });

    const res = await request(app.getHttpServer())
      .get('/api/admin/security-logs?page=1&limit=5')
      .set(authHeader(admin.token))
      .expect(200);

    expect(res.body.items).toHaveLength(5);
    expect(meta(res.body).total).toBeGreaterThanOrEqual(14);
  });

  it('keeps filters working together with pagination', async () => {
    const admin = await createAdmin();
    await seedUsers(8, 'AR');
    await seedUsers(5, 'US');

    const page1 = await request(app.getHttpServer())
      .get('/api/admin/users?country=AR&page=1&limit=5')
      .set(authHeader(admin.token))
      .expect(200);

    expect(page1.body.items).toHaveLength(5);
    const m = meta(page1.body);
    expect(m.total).toBe(8); // only AR users, admin is US
    expect(m.totalPages).toBe(2);
    expect(m.hasNextPage).toBe(true);
    expect(page1.body.items.every((u: { country: string }) => u.country === 'AR')).toBe(true);

    const page2 = await request(app.getHttpServer())
      .get('/api/admin/users?country=AR&page=2&limit=5')
      .set(authHeader(admin.token))
      .expect(200);
    expect(page2.body.items).toHaveLength(3);
    expect(meta(page2.body).hasNextPage).toBe(false);
  });

  it('forbids a non-admin user from paginated admin endpoints (403)', async () => {
    const buyer = await registerUser(app, {
      email: `pg-norm-${runId}@test.buyseekk.com`,
      password,
      name: 'Buyer',
      role: 'BUYER',
      country: 'US',
    });

    await request(app.getHttpServer())
      .get('/api/admin/users?page=1&limit=10')
      .set(authHeader(buyer.token))
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/admin/requests?page=1&limit=10')
      .set(authHeader(buyer.token))
      .expect(403);
  });
});
