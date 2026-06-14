import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { authHeader, createTestApp, registerUser, resetDatabase } from './helpers';

describe('Community auto-moderation (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const runId = Date.now();
  const password = 'testpass123';
  let seq = 0;
  const alphaVariant = () => {
    seq += 1;
    return ['alfa', 'beta', 'gama', 'delta', 'epsilon', 'zeta', 'eta', 'theta'][seq % 8] + 'xyz';
  };

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
      email: `mod-admin-${runId}-${Math.random()}@test.buyseekk.com`,
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
        requirements: `Busco un auto familiar en buen estado variante ${variant}`,
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

  /** Crea N reportantes elegibles (verificados) y sus reportes directamente en DB. */
  async function seedReports(
    count: number,
    target: { offerId?: string; reportedUserId?: string },
    keyPrefix: string,
  ) {
    const users = Array.from({ length: count }, (_, i) => ({
      id: `${keyPrefix}-${runId}-${i}`,
      email: `${keyPrefix}-${runId}-${i}@test.buyseekk.com`,
      passwordHash: 'seed',
      name: `Reporter ${i}`,
      country: 'US' as const,
      locale: 'EN' as const,
      currency: 'USD' as const,
      emailVerified: true,
    }));
    await prisma.user.createMany({ data: users });
    await prisma.report.createMany({
      data: users.map((u) => ({
        reporterId: u.id,
        offerId: target.offerId ?? null,
        reportedUserId: target.reportedUserId ?? null,
        reason: 'SPAM' as const,
        weight: 1,
      })),
    });
  }

  async function buyerRequestAndSellerOffer() {
    const buyer = await registerUser(app, {
      email: `mod-buyer-${runId}-${Math.random()}@test.buyseekk.com`,
      password,
      name: 'Buyer',
      role: 'BUYER',
      country: 'US',
    });
    const seller = await registerUser(app, {
      email: `mod-seller-${runId}-${Math.random()}@test.buyseekk.com`,
      password,
      name: 'Seller',
      role: 'SELLER',
      country: 'US',
    });
    const reqRes = await createRequest(buyer.token, alphaVariant()).expect(201);
    const offerRes = await request(app.getHttpServer())
      .post('/api/offers')
      .set(authHeader(seller.token))
      .send({
        requestId: reqRes.body.id,
        price: 18000,
        currency: 'USD',
        message: 'Tengo el auto ideal para tu familia disponible ya mismo.',
        imageUrls: ['/api/uploads/test.jpg'],
      })
      .expect(201);
    return { buyer, seller, requestId: reqRes.body.id, offerId: offerRes.body.id };
  }

  it('rejects a duplicate report on the same content (409)', async () => {
    const { offerId, seller } = await buyerRequestAndSellerOffer();
    const reporter = await registerUser(app, {
      email: `dup-rep-${runId}@test.buyseekk.com`,
      password,
      name: 'Dup',
      role: 'BUYER',
      country: 'US',
    });

    await request(app.getHttpServer())
      .post('/api/reports')
      .set(authHeader(reporter.token))
      .send({ reason: 'SPAM', offerId, reportedUserId: seller.user.id })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/reports')
      .set(authHeader(reporter.token))
      .send({ reason: 'SCAM', offerId, reportedUserId: seller.user.id })
      .expect(409);
  });

  it('does not count reports from unverified reporters (weight 0)', async () => {
    const { offerId } = await buyerRequestAndSellerOffer();
    const reporter = await registerUser(
      app,
      {
        email: `unverif-${runId}@test.buyseekk.com`,
        password,
        name: 'Unverified',
        role: 'BUYER',
        country: 'US',
      },
      { verify: false },
    );

    const res = await request(app.getHttpServer())
      .post('/api/reports')
      .set(authHeader(reporter.token))
      .send({ reason: 'SPAM', offerId })
      .expect(201);

    const stored = await prisma.report.findUnique({ where: { id: res.body.id } });
    expect(stored?.weight).toBe(0);
  });

  it('auto-hides an offer once it reaches 15 unique reports', async () => {
    const { buyer, offerId, seller } = await buyerRequestAndSellerOffer();

    // 14 reportes únicos previos (no alcanzan el umbral de 15).
    await seedReports(14, { offerId, reportedUserId: seller.user.id }, 'hide-rep');

    const before = await prisma.offer.findUnique({ where: { id: offerId } });
    expect(before?.hiddenByModeration).toBe(false);

    // El reporte #15 (vía API) cruza el umbral y oculta la oferta.
    const reporter = await registerUser(app, {
      email: `hide-trigger-${runId}@test.buyseekk.com`,
      password,
      name: 'Trigger',
      role: 'BUYER',
      country: 'US',
    });
    await request(app.getHttpServer())
      .post('/api/reports')
      .set(authHeader(reporter.token))
      .send({ reason: 'SCAM', offerId, reportedUserId: seller.user.id })
      .expect(201);

    const after = await prisma.offer.findUnique({ where: { id: offerId } });
    expect(after?.hiddenByModeration).toBe(true);
    expect(after?.moderationReviewRequired).toBe(true);

    const log = await prisma.securityLog.findFirst({ where: { event: 'AUTO_HIDE_OFFER' } });
    expect(log).not.toBeNull();

    // La oferta oculta ya no aparece en las recibidas del comprador.
    const received = await request(app.getHttpServer())
      .get('/api/offers/received')
      .set(authHeader(buyer.token))
      .expect(200);
    const ids = (received.body.items ?? received.body).map((o: { id: string }) => o.id);
    expect(ids).not.toContain(offerId);
  });

  it('auto-suspends a user once they reach 25 unique reports, and admin can lift it', async () => {
    const admin = await createAdmin();
    const { seller } = await buyerRequestAndSellerOffer();

    await seedReports(24, { reportedUserId: seller.user.id }, 'susp-rep');

    const before = await prisma.user.findUnique({ where: { id: seller.user.id } });
    expect(before?.suspended).toBe(false);

    const reporter = await registerUser(app, {
      email: `susp-trigger-${runId}@test.buyseekk.com`,
      password,
      name: 'Trigger',
      role: 'BUYER',
      country: 'US',
    });
    await request(app.getHttpServer())
      .post('/api/reports')
      .set(authHeader(reporter.token))
      .send({ reason: 'SCAM', reportedUserId: seller.user.id })
      .expect(201);

    const suspended = await prisma.user.findUnique({ where: { id: seller.user.id } });
    expect(suspended?.suspended).toBe(true);

    // Un usuario suspendido no puede enviar ofertas.
    const buyer2 = await registerUser(app, {
      email: `susp-buyer2-${runId}@test.buyseekk.com`,
      password,
      name: 'Buyer2',
      role: 'BUYER',
      country: 'US',
    });
    const reqRes = await createRequest(buyer2.token, 'susp-check').expect(201);
    await request(app.getHttpServer())
      .post('/api/offers')
      .set(authHeader(seller.token))
      .send({
        requestId: reqRes.body.id,
        price: 17000,
        currency: 'USD',
        message: 'Intento ofertar estando suspendido, no debería poder hacerlo.',
        imageUrls: ['/api/uploads/test.jpg'],
      })
      .expect(403);

    // El admin levanta la suspensión.
    await request(app.getHttpServer())
      .patch(`/api/admin/users/${seller.user.id}/unsuspend`)
      .set(authHeader(admin.token))
      .expect(200);

    const restored = await prisma.user.findUnique({ where: { id: seller.user.id } });
    expect(restored?.suspended).toBe(false);
  });

  it('lets an admin restore a hidden offer', async () => {
    const admin = await createAdmin();
    const { offerId, seller } = await buyerRequestAndSellerOffer();
    await seedReports(15, { offerId, reportedUserId: seller.user.id }, 'restore-rep');
    await prisma.offer.update({
      where: { id: offerId },
      data: { hiddenByModeration: true, moderationReviewRequired: true },
    });

    await request(app.getHttpServer())
      .patch(`/api/admin/offers/${offerId}/restore`)
      .set(authHeader(admin.token))
      .expect(200);

    const offer = await prisma.offer.findUnique({ where: { id: offerId } });
    expect(offer?.hiddenByModeration).toBe(false);
    expect(offer?.moderationReviewRequired).toBe(false);

    const dashboard = await request(app.getHttpServer())
      .get('/api/admin/moderation')
      .set(authHeader(admin.token))
      .expect(200);
    expect(dashboard.body).toHaveProperty('hiddenOffers');
    expect(dashboard.body).toHaveProperty('topReportedUsers');
  });
});
