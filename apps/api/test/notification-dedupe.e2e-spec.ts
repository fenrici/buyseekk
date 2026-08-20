import { INestApplication } from '@nestjs/common';
import { NotificationType, OfferStatus } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { NotificationsService } from '../src/notifications/notifications.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { authHeader, createTestApp, ownedTestImageUrl, registerUser, resetDatabase } from './helpers';

describe('Notification dedupe (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const runId = Date.now();
  const password = 'Testpass123';

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

  it('allows multiple NEW_MESSAGE notifications for the same chat', async () => {
    const notifications = app.get(NotificationsService);
    const user = await prisma.user.create({
      data: {
        email: `dedupe-msg-${runId}@test.buyseekk.com`,
        passwordHash: 'test',
        name: 'Msg User',
        role: 'BUYER',
        country: 'US',
        locale: 'ES',
        currency: 'USD',
        emailVerified: true,
      },
    });

    await notifications.notifyNewMessage(user.id, 'ES', 'chat-1', 'Alice', 'buyer');
    await notifications.notifyNewMessage(user.id, 'ES', 'chat-1', 'Alice', 'buyer');

    const rows = await prisma.notification.findMany({
      where: { userId: user.id, type: NotificationType.NEW_MESSAGE, entityId: 'chat-1' },
    });
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.dedupeKey == null)).toBe(true);
  });

  it('dedupes one-shot offer notifications by entity', async () => {
    const notifications = app.get(NotificationsService);
    const user = await prisma.user.create({
      data: {
        email: `dedupe-offer-${runId}@test.buyseekk.com`,
        passwordHash: 'test',
        name: 'Buyer',
        role: 'BUYER',
        country: 'US',
        locale: 'ES',
        currency: 'USD',
        emailVerified: true,
      },
    });

    await notifications.notifyNewOffer(user.id, 'ES', 'offer-1', 'Ferrari');
    await notifications.notifyNewOffer(user.id, 'ES', 'offer-1', 'Ferrari');

    const rows = await prisma.notification.findMany({
      where: { userId: user.id, type: NotificationType.NEW_OFFER, entityId: 'offer-1' },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].dedupeKey).toBe(`${NotificationType.NEW_OFFER}:offer-1`);
  });

  it('dedupes matching request alerts per seller and request', async () => {
    const notifications = app.get(NotificationsService);
    const user = await prisma.user.create({
      data: {
        email: `dedupe-match-${runId}@test.buyseekk.com`,
        passwordHash: 'test',
        name: 'Seller',
        role: 'SELLER',
        country: 'US',
        locale: 'ES',
        currency: 'USD',
        emailVerified: true,
      },
    });

    await notifications.notifyMatchingRequest(user.id, 'ES', 'req-1', {
      requestTitle: 'Busco BMW',
      location: 'Miami, FL',
      category: 'AUTOS',
    });
    await notifications.notifyMatchingRequest(user.id, 'ES', 'req-1', {
      requestTitle: 'Busco BMW',
      location: 'Miami, FL',
      category: 'AUTOS',
    });

    const rows = await prisma.notification.findMany({
      where: { userId: user.id, type: NotificationType.NEW_MATCHING_REQUEST, entityId: 'req-1' },
    });
    expect(rows).toHaveLength(1);
  });

  it('dedupes deal completed notifications by chat', async () => {
    const notifications = app.get(NotificationsService);
    const user = await prisma.user.create({
      data: {
        email: `dedupe-deal-${runId}@test.buyseekk.com`,
        passwordHash: 'test',
        name: 'Seller',
        role: 'SELLER',
        country: 'US',
        locale: 'ES',
        currency: 'USD',
        emailVerified: true,
      },
    });

    await notifications.notifyDealCompleted(user.id, 'ES', 'chat-1', 'offer-1', 'Ferrari');
    await notifications.notifyDealCompleted(user.id, 'ES', 'chat-1', 'offer-1', 'Ferrari');

    const rows = await prisma.notification.findMany({
      where: { userId: user.id, type: NotificationType.DEAL_COMPLETED, entityId: 'chat-1' },
    });
    expect(rows).toHaveLength(1);
  });

  it('dedupes offer accepted via API flow', async () => {
    const buyer = await registerUser(app, {
      email: `dedupe-buyer-${runId}@test.buyseekk.com`,
      password,
      name: 'Buyer',
      role: 'BUYER',
      country: 'US',
    });
    const seller = await registerUser(app, {
      email: `dedupe-seller-${runId}@test.buyseekk.com`,
      password,
      name: 'Seller',
      role: 'SELLER',
      country: 'US',
    });

    const reqRes = await request(app.getHttpServer())
      .post('/api/requests')
      .set(authHeader(buyer.token))
      .send({
        category: 'AUTOS',
        requirements: 'Busco auto para dedupe de oferta aceptada.',
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

    const offerRes = await request(app.getHttpServer())
      .post('/api/offers')
      .set(authHeader(seller.token))
      .send({
        requestId: reqRes.body.id,
        price: 115000,
        currency: 'USD',
        message: 'Oferta para probar dedupe de aceptación.',
        imageUrls: [ownedTestImageUrl(seller.user.id)],
      })
      .expect(201);

    const notifications = app.get(NotificationsService);
    await notifications.notifyOfferAccepted(seller.user.id, 'ES', offerRes.body.id, reqRes.body.title);
    await notifications.notifyOfferAccepted(seller.user.id, 'ES', offerRes.body.id, reqRes.body.title);

    const rows = await prisma.notification.findMany({
      where: {
        userId: seller.user.id,
        type: NotificationType.OFFER_ACCEPTED,
        entityId: offerRes.body.id,
      },
    });
    expect(rows).toHaveLength(1);
    expect(offerRes.body.status).toBe(OfferStatus.PENDIENTE);
  });
});
