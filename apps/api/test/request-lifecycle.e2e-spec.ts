import { INestApplication } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { NotificationsService } from '../src/notifications/notifications.service';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  authHeader,
  createTestApp,
  registerUser,
  resetDatabase,
  ownedTestImageUrl,
} from './helpers';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

describe('Request lifecycle (e2e)', () => {
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

  async function createBuyer() {
    return registerUser(app, {
      email: `buyer-life-${runId}-${Math.random()}@test.buyseekk.com`,
      password,
      name: 'Buyer Life',
      role: 'BUYER',
      country: 'US',
    });
  }

  async function createSeller() {
    return registerUser(app, {
      email: `seller-life-${runId}-${Math.random()}@test.buyseekk.com`,
      password,
      name: 'Seller Life',
      role: 'SELLER',
      country: 'US',
    });
  }

  async function createRequest(token: string, unique = Math.random().toString(36).slice(2, 10)) {
    const res = await request(app.getHttpServer())
      .post('/api/requests')
      .set(authHeader(token))
      .send({
        category: 'AUTOS',
        requirements: `Busco deportivo para lifecycle e2e. Caso ${unique}.`,
        budget: 180000,
        currency: 'USD',
        location: 'Miami, FL',
        country: 'US',
        carBrand: 'Ferrari',
        carModel: '488 GTB',
        carColor: 'Rosso Corsa',
        carYearMin: 2018,
        maxMileage: 15000,
      })
      .expect(201);
    return res.body as { id: string; status: string; lastBuyerActivityAt: string };
  }

  function sendOffer(
    seller: Awaited<ReturnType<typeof createSeller>>,
    requestId: string,
    unique = 'oferta',
  ) {
    return request(app.getHttpServer())
      .post('/api/offers')
      .set(authHeader(seller.token))
      .send({
        requestId,
        price: 175000,
        currency: 'USD',
        message: `Propuesta lifecycle ${unique} con fotos del auto.`,
        imageUrls: [ownedTestImageUrl(seller.user.id)],
      });
  }

  describe('pause', () => {
    it('sets pausedAt without backdating activity and hides the request from sellers', async () => {
      const buyer = await createBuyer();
      const seller = await createSeller();
      const created = await createRequest(buyer.token);
      const before = await prisma.request.findUniqueOrThrow({ where: { id: created.id } });

      const paused = await request(app.getHttpServer())
        .patch(`/api/requests/${created.id}/pause`)
        .set(authHeader(buyer.token))
        .expect(200);

      expect(paused.body.status).toBe('PAUSADA');

      const stored = await prisma.request.findUniqueOrThrow({ where: { id: created.id } });
      expect(stored.pausedAt).not.toBeNull();
      expect(stored.status).toBe('ACTIVA');
      expect(stored.lastBuyerActivityAt.getTime()).toBe(before.lastBuyerActivityAt.getTime());
      expect(stored.lastActivityAt.getTime()).toBe(before.lastActivityAt.getTime());

      const market = await request(app.getHttpServer())
        .get('/api/requests')
        .set(authHeader(seller.token))
        .expect(200);
      expect(market.body.items.some((r: { id: string }) => r.id === created.id)).toBe(false);

      await request(app.getHttpServer())
        .get(`/api/requests/${created.id}`)
        .set(authHeader(seller.token))
        .expect(404);

      await request(app.getHttpServer()).get(`/api/public/requests/${created.id}`).expect(404);

      const offerRes = await sendOffer(seller, created.id, 'paused');
      expect(offerRes.status).toBe(404);
    });
  });

  describe('renew', () => {
    it('clears pausedAt, refreshes activity and becomes offerable again', async () => {
      const buyer = await createBuyer();
      const seller = await createSeller();
      const created = await createRequest(buyer.token);

      await request(app.getHttpServer())
        .patch(`/api/requests/${created.id}/pause`)
        .set(authHeader(buyer.token))
        .expect(200);

      const beforeRenew = await prisma.request.findUniqueOrThrow({ where: { id: created.id } });

      const renewed = await request(app.getHttpServer())
        .patch(`/api/requests/${created.id}/renew`)
        .set(authHeader(buyer.token))
        .expect(200);

      expect(renewed.body.status).toBe('ACTIVA');

      const stored = await prisma.request.findUniqueOrThrow({ where: { id: created.id } });
      expect(stored.pausedAt).toBeNull();
      expect(stored.status).toBe('ACTIVA');
      expect(stored.lastBuyerActivityAt.getTime()).toBeGreaterThanOrEqual(
        beforeRenew.lastBuyerActivityAt.getTime(),
      );

      const market = await request(app.getHttpServer())
        .get('/api/requests')
        .set(authHeader(seller.token))
        .expect(200);
      expect(market.body.items.some((r: { id: string }) => r.id === created.id)).toBe(true);

      await sendOffer(seller, created.id, 'renewed').expect(201);
    });
  });

  describe('negociando paused', () => {
    it('keeps stored NEGOCIANDO across pause and renew, and chat still works', async () => {
      const buyer = await createBuyer();
      const seller = await createSeller();
      const created = await createRequest(buyer.token);

      const offerRes = await sendOffer(seller, created.id, 'nego').expect(201);
      const acceptRes = await request(app.getHttpServer())
        .patch(`/api/offers/${offerRes.body.id}/accept`)
        .set(authHeader(buyer.token))
        .expect(200);

      const afterAccept = await prisma.request.findUniqueOrThrow({ where: { id: created.id } });
      expect(afterAccept.status).toBe('NEGOCIANDO');

      const paused = await request(app.getHttpServer())
        .patch(`/api/requests/${created.id}/pause`)
        .set(authHeader(buyer.token))
        .expect(200);
      expect(paused.body.status).toBe('PAUSADA');

      const pausedStored = await prisma.request.findUniqueOrThrow({ where: { id: created.id } });
      expect(pausedStored.status).toBe('NEGOCIANDO');
      expect(pausedStored.pausedAt).not.toBeNull();

      await request(app.getHttpServer())
        .post(`/api/chats/${acceptRes.body.chatId}/messages`)
        .set(authHeader(buyer.token))
        .send({ text: 'Seguimos coordinando aunque esté pausada.' })
        .expect(201);

      const renewed = await request(app.getHttpServer())
        .patch(`/api/requests/${created.id}/renew`)
        .set(authHeader(buyer.token))
        .expect(200);
      expect(renewed.body.status).toBe('NEGOCIANDO');

      const afterRenew = await prisma.request.findUniqueOrThrow({ where: { id: created.id } });
      expect(afterRenew.status).toBe('NEGOCIANDO');
      expect(afterRenew.pausedAt).toBeNull();
    });
  });

  describe('close', () => {
    it('closes a paused request without leaving pausedAt set', async () => {
      const buyer = await createBuyer();
      const created = await createRequest(buyer.token);

      await request(app.getHttpServer())
        .patch(`/api/requests/${created.id}/pause`)
        .set(authHeader(buyer.token))
        .expect(200);

      const closed = await request(app.getHttpServer())
        .patch(`/api/requests/${created.id}/close`)
        .set(authHeader(buyer.token))
        .expect(200);
      expect(closed.body.status).toBe('CERRADA');

      const stored = await prisma.request.findUniqueOrThrow({ where: { id: created.id } });
      expect(stored.status).toBe('CERRADA');
      expect(stored.pausedAt).toBeNull();
    });

    it('rejects renew on a closed request', async () => {
      const buyer = await createBuyer();
      const created = await createRequest(buyer.token);

      await request(app.getHttpServer())
        .patch(`/api/requests/${created.id}/close`)
        .set(authHeader(buyer.token))
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/requests/${created.id}/renew`)
        .set(authHeader(buyer.token))
        .expect(400);
    });
  });

  describe('inactivity', () => {
    it('derives pending, inactive and archived from current thresholds', async () => {
      const buyer = await createBuyer();
      const pending = await createRequest(buyer.token, 'pending');
      const inactive = await createRequest(buyer.token, 'inactive');
      const archived = await createRequest(buyer.token, 'archived');
      const now = Date.now();

      await prisma.request.update({
        where: { id: pending.id },
        data: { lastBuyerActivityAt: new Date(now - 7 * DAY_MS - 6 * HOUR_MS) },
      });
      await prisma.request.update({
        where: { id: inactive.id },
        data: { lastBuyerActivityAt: new Date(now - 7 * DAY_MS - 25 * HOUR_MS) },
      });
      await prisma.request.update({
        where: { id: archived.id },
        data: { lastBuyerActivityAt: new Date(now - 10 * DAY_MS) },
      });

      const open = await request(app.getHttpServer())
        .get('/api/requests/mine?scope=open')
        .set(authHeader(buyer.token))
        .expect(200);
      const archivedList = await request(app.getHttpServer())
        .get('/api/requests/mine?scope=archived')
        .set(authHeader(buyer.token))
        .expect(200);

      const byId = Object.fromEntries(
        [...open.body.items, ...archivedList.body.items].map((r: { id: string; status: string }) => [
          r.id,
          r.status,
        ]),
      );
      expect(byId[pending.id]).toBe('PENDIENTE_DE_CONFIRMACION');
      expect(byId[inactive.id]).toBe('INACTIVA');
      expect(byId[archived.id]).toBe('ARCHIVADA');
      expect(archivedList.body.items.some((r: { id: string }) => r.id === archived.id)).toBe(true);
    });

    it('gives explicit pause priority over archive aging', async () => {
      const buyer = await createBuyer();
      const seller = await createSeller();
      const created = await createRequest(buyer.token);

      await request(app.getHttpServer())
        .patch(`/api/requests/${created.id}/pause`)
        .set(authHeader(buyer.token))
        .expect(200);

      await prisma.request.update({
        where: { id: created.id },
        data: { lastBuyerActivityAt: new Date(Date.now() - 12 * DAY_MS) },
      });

      const open = await request(app.getHttpServer())
        .get('/api/requests/mine?scope=open')
        .set(authHeader(buyer.token))
        .expect(200);
      const item = open.body.items.find((r: { id: string }) => r.id === created.id);
      expect(item?.status).toBe('PAUSADA');

      const archivedList = await request(app.getHttpServer())
        .get('/api/requests/mine?scope=archived')
        .set(authHeader(buyer.token))
        .expect(200);
      expect(archivedList.body.items.some((r: { id: string }) => r.id === created.id)).toBe(false);

      await sendOffer(seller, created.id, 'aged-pause').expect(404);
    });

    it('rejects new offers on inactive requests even if they remain listed', async () => {
      const buyer = await createBuyer();
      const seller = await createSeller();
      const created = await createRequest(buyer.token);

      await prisma.request.update({
        where: { id: created.id },
        data: { lastBuyerActivityAt: new Date(Date.now() - 7 * DAY_MS - 25 * HOUR_MS) },
      });

      const market = await request(app.getHttpServer())
        .get('/api/requests')
        .set(authHeader(seller.token))
        .expect(200);
      expect(market.body.items.some((r: { id: string }) => r.id === created.id)).toBe(true);

      const offerRes = await sendOffer(seller, created.id, 'inactive');
      expect(offerRes.status).toBe(400);
    });
  });

  describe('soft delete', () => {
    it('hides the request, rejects offers and renew', async () => {
      const buyer = await createBuyer();
      const seller = await createSeller();
      const created = await createRequest(buyer.token);

      await request(app.getHttpServer())
        .delete(`/api/requests/${created.id}`)
        .set(authHeader(buyer.token))
        .expect(200);

      const stored = await prisma.request.findUniqueOrThrow({ where: { id: created.id } });
      expect(stored.active).toBe(false);

      const market = await request(app.getHttpServer())
        .get('/api/requests')
        .set(authHeader(seller.token))
        .expect(200);
      expect(market.body.items.some((r: { id: string }) => r.id === created.id)).toBe(false);

      await sendOffer(seller, created.id, 'deleted').expect(404);

      await request(app.getHttpServer())
        .patch(`/api/requests/${created.id}/renew`)
        .set(authHeader(buyer.token))
        .expect(404);

      await request(app.getHttpServer())
        .patch(`/api/requests/${created.id}`)
        .set(authHeader(buyer.token))
        .send({ requirements: 'No debería editarse una solicitud eliminada.' })
        .expect(404);
    });
  });

  describe('lifecycle notifications', () => {
    it('skips paused, deleted and closed requests and does not repeat expiring emails', async () => {
      const notifications = app.get(NotificationsService);
      const buyer = await createBuyer();
      const paused = await createRequest(buyer.token);
      const deleted = await createRequest(buyer.token);
      const closed = await createRequest(buyer.token);
      const idle = await createRequest(buyer.token);

      const idleAt = new Date(Date.now() - 7 * DAY_MS - 2 * HOUR_MS);
      await prisma.request.update({
        where: { id: paused.id },
        data: { pausedAt: new Date(), lastBuyerActivityAt: idleAt },
      });
      await request(app.getHttpServer())
        .delete(`/api/requests/${deleted.id}`)
        .set(authHeader(buyer.token))
        .expect(200);
      await request(app.getHttpServer())
        .patch(`/api/requests/${closed.id}/close`)
        .set(authHeader(buyer.token))
        .expect(200);
      await prisma.request.update({
        where: { id: idle.id },
        data: { lastBuyerActivityAt: idleAt },
      });

      await notifications.scanRequestLifecycle();
      await notifications.scanRequestLifecycle();

      const expiring = await prisma.notification.findMany({
        where: { userId: buyer.user.id, type: NotificationType.REQUEST_EXPIRING },
      });
      expect(expiring).toHaveLength(1);
      expect(expiring[0].entityId).toBe(idle.id);

      const inactive = await prisma.notification.findMany({
        where: { userId: buyer.user.id, type: NotificationType.REQUEST_INACTIVE },
      });
      expect(inactive).toHaveLength(0);
    });
  });
});
