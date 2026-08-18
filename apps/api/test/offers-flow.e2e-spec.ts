import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  authHeader,
  createTestApp,
  ownedTestImageUrl,
  registerUser,
  resetDatabase,
} from './helpers';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

describe('Offers flow (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const runId = Date.now();
  const password = 'testpass123';
  let seq = 0;

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

  function nextId() {
    seq += 1;
    return `${runId.toString(36)}${seq.toString(36)}`;
  }

  async function createBuyer(label = 'buyer') {
    return registerUser(app, {
      email: `${label}-${nextId()}@test.buyseekk.com`,
      password,
      name: `Buyer ${label}`,
      role: 'BUYER',
      country: 'US',
    });
  }

  async function createSeller(label = 'seller') {
    return registerUser(app, {
      email: `${label}-${nextId()}@test.buyseekk.com`,
      password,
      name: `Seller ${label}`,
      role: 'SELLER',
      country: 'US',
    });
  }

  async function createBoth(label = 'both') {
    return registerUser(app, {
      email: `${label}-${nextId()}@test.buyseekk.com`,
      password,
      name: `Both ${label}`,
      role: 'BOTH',
      country: 'US',
    });
  }

  async function createRequest(token: string, extra: Record<string, unknown> = {}) {
    const unique = nextId();
    const res = await request(app.getHttpServer())
      .post('/api/requests')
      .set(authHeader(token))
      .send({
        category: 'AUTOS',
        requirements: `Busco deportivo impecable en Miami con bajo kilometraje. Caso ${unique}.`,
        budget: 200000,
        currency: 'USD',
        location: 'Miami, FL',
        country: 'US',
        carBrand: 'Ferrari',
        carModel: '488 GTB',
        carColor: 'Rosso Corsa',
        carYearMin: 2018,
        maxMileage: 12000,
        ...extra,
      })
      .expect(201);
    return res.body as { id: string; title: string; status: string; budget: number };
  }

  function sendOffer(
    seller: Awaited<ReturnType<typeof createSeller>>,
    requestId: string,
    message: string,
    price = 195000,
  ) {
    return request(app.getHttpServer())
      .post('/api/offers')
      .set(authHeader(seller.token))
      .send({
        requestId,
        price,
        currency: 'USD',
        message,
        imageUrls: [ownedTestImageUrl(seller.user.id)],
      });
  }

  async function createPendingOffer(
    buyerToken: string,
    seller: Awaited<ReturnType<typeof createSeller>>,
    message: string,
    extra: Record<string, unknown> = {},
  ) {
    const created = await createRequest(buyerToken, extra);
    const offerRes = await sendOffer(seller, created.id, message).expect(201);
    return { request: created, offer: offerRes.body as { id: string; status: string } };
  }

  describe('create', () => {
    it('creates a valid offer', async () => {
      const buyer = await createBuyer('valid');
      const seller = await createSeller('valid');
      const created = await createRequest(buyer.token);

      const offerRes = await sendOffer(
        seller,
        created.id,
        'Tengo el 488 listo para entrega inmediata en Miami.',
      ).expect(201);

      expect(offerRes.body.status).toBe('PENDIENTE');
      expect(offerRes.body.requestId).toBe(created.id);
      expect(offerRes.body.requestTitle).toBe(created.title);
      expect(offerRes.body.requestBudget).toBe(created.budget);
      expect(offerRes.body.requestLocation).toBe('Miami, FL');
      expect(offerRes.body.chatId ?? offerRes.body.chat).toBeFalsy();
    });

    it('rejects a duplicate offer from the same seller', async () => {
      const buyer = await createBuyer('dup');
      const seller = await createSeller('dup');
      const created = await createRequest(buyer.token);

      await sendOffer(seller, created.id, 'Primera oferta duplicada del mismo vendedor.').expect(
        201,
      );
      const second = await sendOffer(
        seller,
        created.id,
        'Segunda oferta que no debería crearse nunca.',
      );
      expect(second.status).toBe(409);
      expect(second.body.message).toMatch(/ya enviaste una oferta/i);

      const count = await prisma.offer.count({
        where: { requestId: created.id, sellerId: seller.user.id },
      });
      expect(count).toBe(1);
    });

    it('keeps a single offer when two creates run at the same time', async () => {
      const buyer = await createBuyer('race-create');
      const seller = await createSeller('race-create');
      const created = await createRequest(buyer.token);

      const [first, second] = await Promise.all([
        sendOffer(seller, created.id, 'Oferta concurrente A del mismo vendedor.'),
        sendOffer(seller, created.id, 'Oferta concurrente A del mismo vendedor.'),
      ]);

      const statuses = [first.status, second.status].sort();
      expect(statuses).toEqual([201, 409]);
      const count = await prisma.offer.count({
        where: { requestId: created.id, sellerId: seller.user.id },
      });
      expect(count).toBe(1);
    });

    it('blocks offering on your own request', async () => {
      const both = await createBoth('own');
      const created = await createRequest(both.token);
      const res = await sendOffer(both, created.id, 'Intento ofertar en mi propia solicitud.');
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/propia solicitud/i);
    });

    it('blocks offers on paused requests', async () => {
      const buyer = await createBuyer('paused');
      const seller = await createSeller('paused');
      const created = await createRequest(buyer.token);

      await request(app.getHttpServer())
        .patch(`/api/requests/${created.id}/pause`)
        .set(authHeader(buyer.token))
        .expect(200);

      await sendOffer(seller, created.id, 'Oferta sobre solicitud pausada.').expect(404);
    });

    it('blocks offers pending confirmation', async () => {
      const buyer = await createBuyer('pending-conf');
      const seller = await createSeller('pending-conf');
      const created = await createRequest(buyer.token);

      await prisma.request.update({
        where: { id: created.id },
        data: { lastBuyerActivityAt: new Date(Date.now() - 7 * DAY_MS - HOUR_MS) },
      });

      await sendOffer(seller, created.id, 'Oferta en pendiente de confirmación.').expect(404);
    });

    it('blocks offers on inactive requests', async () => {
      const buyer = await createBuyer('inactive');
      const seller = await createSeller('inactive');
      const created = await createRequest(buyer.token);

      await prisma.request.update({
        where: { id: created.id },
        data: { lastBuyerActivityAt: new Date(Date.now() - 7 * DAY_MS - 25 * HOUR_MS) },
      });

      const res = await sendOffer(seller, created.id, 'Oferta en solicitud inactiva.');
      expect(res.status).toBe(400);
    });

    it('blocks offers on archived requests', async () => {
      const buyer = await createBuyer('archived');
      const seller = await createSeller('archived');
      const created = await createRequest(buyer.token);

      await prisma.request.update({
        where: { id: created.id },
        data: { lastBuyerActivityAt: new Date(Date.now() - 10 * DAY_MS - HOUR_MS) },
      });

      await sendOffer(seller, created.id, 'Oferta en solicitud archivada.').expect(404);
    });

    it('blocks offers on closed requests', async () => {
      const buyer = await createBuyer('closed');
      const seller = await createSeller('closed');
      const created = await createRequest(buyer.token);

      await request(app.getHttpServer())
        .patch(`/api/requests/${created.id}/close`)
        .set(authHeader(buyer.token))
        .expect(200);

      const res = await sendOffer(seller, created.id, 'Oferta en solicitud cerrada.');
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/cerrada/i);
    });

    it('blocks offers on soft-deleted requests', async () => {
      const buyer = await createBuyer('deleted');
      const seller = await createSeller('deleted');
      const created = await createRequest(buyer.token);

      await request(app.getHttpServer())
        .delete(`/api/requests/${created.id}`)
        .set(authHeader(buyer.token))
        .expect(200);

      await sendOffer(seller, created.id, 'Oferta en solicitud eliminada.').expect(404);
    });
  });

  describe('reject', () => {
    it('rejects a pending offer without opening negotiation', async () => {
      const buyer = await createBuyer('reject-ok');
      const seller = await createSeller('reject-ok');
      const { request: created, offer } = await createPendingOffer(
        buyer.token,
        seller,
        'Oferta que el comprador va a rechazar de forma válida.',
      );

      const rejectRes = await request(app.getHttpServer())
        .patch(`/api/offers/${offer.id}/reject`)
        .set(authHeader(buyer.token))
        .expect(200);

      expect(rejectRes.body.status).toBe('RECHAZADA');
      const stored = await prisma.request.findUniqueOrThrow({ where: { id: created.id } });
      expect(stored.status).toBe('ACTIVA');
      expect(await prisma.chat.count({ where: { offerId: offer.id } })).toBe(0);
    });

    it('forbids another buyer from rejecting', async () => {
      const buyer = await createBuyer('reject-owner');
      const other = await createBuyer('reject-other');
      const seller = await createSeller('reject-owner');
      const { offer } = await createPendingOffer(
        buyer.token,
        seller,
        'Oferta para probar IDOR de rechazo.',
      );

      await request(app.getHttpServer())
        .patch(`/api/offers/${offer.id}/reject`)
        .set(authHeader(other.token))
        .expect(403);
    });

    it('fails cleanly on a repeated reject', async () => {
      const buyer = await createBuyer('reject-twice');
      const seller = await createSeller('reject-twice');
      const { offer } = await createPendingOffer(
        buyer.token,
        seller,
        'Oferta para rechazo repetido.',
      );

      await request(app.getHttpServer())
        .patch(`/api/offers/${offer.id}/reject`)
        .set(authHeader(buyer.token))
        .expect(200);

      const second = await request(app.getHttpServer())
        .patch(`/api/offers/${offer.id}/reject`)
        .set(authHeader(buyer.token))
        .expect(400);
      expect(second.body.message).toMatch(/ya fue procesada/i);
    });

    it('does not change other offers', async () => {
      const buyer = await createBuyer('reject-others');
      const sellerA = await createSeller('reject-a');
      const sellerB = await createSeller('reject-b');
      const created = await createRequest(buyer.token);
      const offerA = await sendOffer(sellerA, created.id, 'Oferta A que permanece pendiente.').expect(
        201,
      );
      const offerB = await sendOffer(sellerB, created.id, 'Oferta B que se rechaza sola.').expect(
        201,
      );

      await request(app.getHttpServer())
        .patch(`/api/offers/${offerB.body.id}/reject`)
        .set(authHeader(buyer.token))
        .expect(200);

      const a = await prisma.offer.findUniqueOrThrow({ where: { id: offerA.body.id } });
      const b = await prisma.offer.findUniqueOrThrow({ where: { id: offerB.body.id } });
      expect(a.status).toBe('PENDIENTE');
      expect(b.status).toBe('RECHAZADA');
    });

    it('prevents the seller from offering again after reject', async () => {
      const buyer = await createBuyer('no-reoffer');
      const seller = await createSeller('no-reoffer');
      const { request: created, offer } = await createPendingOffer(
        buyer.token,
        seller,
        'Oferta rechazada sin posibilidad de reofertar.',
      );

      await request(app.getHttpServer())
        .patch(`/api/offers/${offer.id}/reject`)
        .set(authHeader(buyer.token))
        .expect(200);

      const retry = await sendOffer(
        seller,
        created.id,
        'Intento de reofertar después del rechazo.',
      );
      expect(retry.status).toBe(409);
    });
  });

  describe('accept', () => {
    it('accepts a pending offer, opens one chat and moves the request to NEGOCIANDO', async () => {
      const buyer = await createBuyer('accept-ok');
      const seller = await createSeller('accept-ok');
      const { request: created, offer } = await createPendingOffer(
        buyer.token,
        seller,
        'Oferta válida para aceptar y negociar.',
      );

      const acceptRes = await request(app.getHttpServer())
        .patch(`/api/offers/${offer.id}/accept`)
        .set(authHeader(buyer.token))
        .expect(200);

      expect(acceptRes.body.status).toBe('ACEPTADA');
      expect(acceptRes.body.chatId).toBeTruthy();

      const stored = await prisma.request.findUniqueOrThrow({ where: { id: created.id } });
      expect(stored.status).toBe('NEGOCIANDO');
      expect(await prisma.chat.count({ where: { offerId: offer.id } })).toBe(1);

      const retry = await request(app.getHttpServer())
        .patch(`/api/offers/${offer.id}/accept`)
        .set(authHeader(buyer.token))
        .expect(200);
      expect(retry.body.chatId).toBe(acceptRes.body.chatId);
      expect(await prisma.chat.count({ where: { offerId: offer.id } })).toBe(1);
      expect(await prisma.message.count({ where: { chatId: acceptRes.body.chatId } })).toBe(
        await prisma.message.count({ where: { chatId: retry.body.chatId } }),
      );
    });

    it('forbids another buyer from accepting', async () => {
      const buyer = await createBuyer('accept-owner');
      const other = await createBuyer('accept-other');
      const seller = await createSeller('accept-owner');
      const { offer } = await createPendingOffer(
        buyer.token,
        seller,
        'Oferta para IDOR de accept.',
      );

      await request(app.getHttpServer())
        .patch(`/api/offers/${offer.id}/accept`)
        .set(authHeader(other.token))
        .expect(403);
    });

    it('cannot accept a rejected offer', async () => {
      const buyer = await createBuyer('accept-after-reject');
      const seller = await createSeller('accept-after-reject');
      const { offer } = await createPendingOffer(
        buyer.token,
        seller,
        'Oferta rechazada que no se puede aceptar después.',
      );

      await request(app.getHttpServer())
        .patch(`/api/offers/${offer.id}/reject`)
        .set(authHeader(buyer.token))
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/offers/${offer.id}/accept`)
        .set(authHeader(buyer.token))
        .expect(400);
    });

    it('cannot reject an accepted offer', async () => {
      const buyer = await createBuyer('reject-after-accept');
      const seller = await createSeller('reject-after-accept');
      const { offer } = await createPendingOffer(
        buyer.token,
        seller,
        'Oferta aceptada que no se puede rechazar después.',
      );

      await request(app.getHttpServer())
        .patch(`/api/offers/${offer.id}/accept`)
        .set(authHeader(buyer.token))
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/offers/${offer.id}/reject`)
        .set(authHeader(buyer.token))
        .expect(400);
    });

    it('leaves other pending offers intact', async () => {
      const buyer = await createBuyer('accept-intact');
      const sellerA = await createSeller('intact-a');
      const sellerB = await createSeller('intact-b');
      const created = await createRequest(buyer.token);
      const offerA = await sendOffer(sellerA, created.id, 'Oferta A aceptada, las otras siguen.').expect(
        201,
      );
      const offerB = await sendOffer(sellerB, created.id, 'Oferta B que debe seguir pendiente.').expect(
        201,
      );

      await request(app.getHttpServer())
        .patch(`/api/offers/${offerA.body.id}/accept`)
        .set(authHeader(buyer.token))
        .expect(200);

      const a = await prisma.offer.findUniqueOrThrow({ where: { id: offerA.body.id } });
      const b = await prisma.offer.findUniqueOrThrow({ where: { id: offerB.body.id } });
      expect(a.status).toBe('ACEPTADA');
      expect(b.status).toBe('PENDIENTE');
    });
  });

  describe('multiple negotiations', () => {
    it('allows several accepted offers, separate chats and a new seller offer', async () => {
      const buyer = await createBuyer('multi');
      const sellerA = await createSeller('multi-a');
      const sellerB = await createSeller('multi-b');
      const sellerC = await createSeller('multi-c');
      const sellerD = await createSeller('multi-d');
      const created = await createRequest(buyer.token);

      const offerA = await sendOffer(sellerA, created.id, 'Oferta A para negociación múltiple.').expect(
        201,
      );
      const offerB = await sendOffer(sellerB, created.id, 'Oferta B para negociación múltiple.').expect(
        201,
      );
      const offerC = await sendOffer(sellerC, created.id, 'Oferta C que sigue pendiente.').expect(201);

      await request(app.getHttpServer())
        .patch(`/api/offers/${offerA.body.id}/accept`)
        .set(authHeader(buyer.token))
        .expect(200);

      expect((await prisma.offer.findUniqueOrThrow({ where: { id: offerB.body.id } })).status).toBe(
        'PENDIENTE',
      );
      expect((await prisma.offer.findUniqueOrThrow({ where: { id: offerC.body.id } })).status).toBe(
        'PENDIENTE',
      );

      await request(app.getHttpServer())
        .patch(`/api/offers/${offerB.body.id}/accept`)
        .set(authHeader(buyer.token))
        .expect(200);

      const [a, b, c] = await Promise.all([
        prisma.offer.findUniqueOrThrow({ where: { id: offerA.body.id } }),
        prisma.offer.findUniqueOrThrow({ where: { id: offerB.body.id } }),
        prisma.offer.findUniqueOrThrow({ where: { id: offerC.body.id } }),
      ]);
      expect(a.status).toBe('ACEPTADA');
      expect(b.status).toBe('ACEPTADA');
      expect(c.status).toBe('PENDIENTE');

      const chats = await prisma.chat.findMany({
        where: { offerId: { in: [offerA.body.id, offerB.body.id, offerC.body.id] } },
      });
      expect(chats).toHaveLength(2);
      expect(chats.some((chat) => chat.offerId === offerA.body.id)).toBe(true);
      expect(chats.some((chat) => chat.offerId === offerB.body.id)).toBe(true);

      const stored = await prisma.request.findUniqueOrThrow({ where: { id: created.id } });
      expect(stored.status).toBe('NEGOCIANDO');

      const detail = await request(app.getHttpServer())
        .get(`/api/requests/${created.id}`)
        .set(authHeader(sellerD.token))
        .expect(200);
      expect(detail.body.status).toBe('NEGOCIANDO');

      await sendOffer(sellerD, created.id, 'Oferta D de un seller nuevo en NEGOCIANDO.').expect(201);

      const accepted = await request(app.getHttpServer())
        .get('/api/offers/received?status=ACEPTADA')
        .set(authHeader(buyer.token))
        .expect(200);
      expect(accepted.body.items).toHaveLength(2);
      expect(accepted.body.items.every((item: { chatId: string | null }) => item.chatId)).toBe(true);

      const pending = await request(app.getHttpServer())
        .get('/api/offers/received')
        .set(authHeader(buyer.token))
        .expect(200);
      expect(pending.body.items).toHaveLength(2);

      await request(app.getHttpServer())
        .patch(`/api/offers/${offerC.body.id}/reject`)
        .set(authHeader(buyer.token))
        .expect(200);

      expect((await prisma.offer.findUniqueOrThrow({ where: { id: offerA.body.id } })).status).toBe(
        'ACEPTADA',
      );
      expect((await prisma.offer.findUniqueOrThrow({ where: { id: offerB.body.id } })).status).toBe(
        'ACEPTADA',
      );
      expect((await prisma.request.findUniqueOrThrow({ where: { id: created.id } })).status).toBe(
        'NEGOCIANDO',
      );
      expect(await prisma.chat.count({ where: { offerId: { in: [offerA.body.id, offerB.body.id] } } })).toBe(
        2,
      );
    });
  });

  describe('concurrency', () => {
    it('accepts the same offer only once', async () => {
      const buyer = await createBuyer('same-accept');
      const seller = await createSeller('same-accept');
      const { offer } = await createPendingOffer(
        buyer.token,
        seller,
        'Oferta para accept concurrente de la misma oferta.',
      );

      const [first, second] = await Promise.all([
        request(app.getHttpServer())
          .patch(`/api/offers/${offer.id}/accept`)
          .set(authHeader(buyer.token)),
        request(app.getHttpServer())
          .patch(`/api/offers/${offer.id}/accept`)
          .set(authHeader(buyer.token)),
      ]);

      expect([first.status, second.status].every((status) => status === 200)).toBe(true);
      expect(first.body.chatId).toBe(second.body.chatId);
      expect(await prisma.offer.count({ where: { id: offer.id, status: 'ACEPTADA' } })).toBe(1);
      expect(await prisma.chat.count({ where: { offerId: offer.id } })).toBe(1);

      const notifications = await prisma.notification.count({
        where: { userId: seller.user.id, type: 'OFFER_ACCEPTED', entityId: offer.id },
      });
      expect(notifications).toBe(1);
    });

    it('can accept two different offers on the same request at once', async () => {
      const buyer = await createBuyer('diff-accept');
      const sellerA = await createSeller('diff-a');
      const sellerB = await createSeller('diff-b');
      const created = await createRequest(buyer.token);
      const offerA = await sendOffer(sellerA, created.id, 'Oferta A concurrente distinta.').expect(
        201,
      );
      const offerB = await sendOffer(sellerB, created.id, 'Oferta B concurrente distinta.').expect(
        201,
      );

      const [first, second] = await Promise.all([
        request(app.getHttpServer())
          .patch(`/api/offers/${offerA.body.id}/accept`)
          .set(authHeader(buyer.token)),
        request(app.getHttpServer())
          .patch(`/api/offers/${offerB.body.id}/accept`)
          .set(authHeader(buyer.token)),
      ]);

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(first.body.chatId).not.toBe(second.body.chatId);

      const [a, b] = await Promise.all([
        prisma.offer.findUniqueOrThrow({ where: { id: offerA.body.id } }),
        prisma.offer.findUniqueOrThrow({ where: { id: offerB.body.id } }),
      ]);
      expect(a.status).toBe('ACEPTADA');
      expect(b.status).toBe('ACEPTADA');
      expect(await prisma.chat.count({ where: { offerId: { in: [a.id, b.id] } } })).toBe(2);
      expect((await prisma.request.findUniqueOrThrow({ where: { id: created.id } })).status).toBe(
        'NEGOCIANDO',
      );
    });

    it('resolves accept vs reject on the same offer to one terminal status', async () => {
      const buyer = await createBuyer('accept-reject-race');
      const seller = await createSeller('accept-reject-race');
      const { offer } = await createPendingOffer(
        buyer.token,
        seller,
        'Oferta para carrera accept contra reject.',
      );

      const [acceptRes, rejectRes] = await Promise.all([
        request(app.getHttpServer())
          .patch(`/api/offers/${offer.id}/accept`)
          .set(authHeader(buyer.token)),
        request(app.getHttpServer())
          .patch(`/api/offers/${offer.id}/reject`)
          .set(authHeader(buyer.token)),
      ]);

      const statuses = [acceptRes.status, rejectRes.status].sort();
      expect(statuses).toEqual([200, 400]);

      const stored = await prisma.offer.findUniqueOrThrow({ where: { id: offer.id } });
      expect(['ACEPTADA', 'RECHAZADA']).toContain(stored.status);
      const chatCount = await prisma.chat.count({ where: { offerId: offer.id } });
      if (stored.status === 'ACEPTADA') {
        expect(chatCount).toBe(1);
      } else {
        expect(chatCount).toBe(0);
      }
    });
  });

  describe('permissions', () => {
    it('blocks seller accept/reject and cross-seller chat access', async () => {
      const buyer = await createBuyer('idor');
      const sellerA = await createSeller('idor-a');
      const sellerB = await createSeller('idor-b');
      const { offer } = await createPendingOffer(
        buyer.token,
        sellerA,
        'Oferta de seller A para IDOR de permisos.',
      );

      await request(app.getHttpServer())
        .patch(`/api/offers/${offer.id}/accept`)
        .set(authHeader(sellerA.token))
        .expect(403);
      await request(app.getHttpServer())
        .patch(`/api/offers/${offer.id}/reject`)
        .set(authHeader(sellerA.token))
        .expect(403);

      const accepted = await request(app.getHttpServer())
        .patch(`/api/offers/${offer.id}/accept`)
        .set(authHeader(buyer.token))
        .expect(200);

      await request(app.getHttpServer())
        .get(`/api/chats/${accepted.body.chatId}`)
        .set(authHeader(sellerB.token))
        .expect(403);
      await request(app.getHttpServer())
        .get(`/api/chats/${accepted.body.chatId}`)
        .set(authHeader(sellerA.token))
        .expect(200);
    });

    it('notifies only the seller of the accepted or rejected offer', async () => {
      const buyer = await createBuyer('notify');
      const sellerA = await createSeller('notify-a');
      const sellerB = await createSeller('notify-b');
      const created = await createRequest(buyer.token);
      const offerA = await sendOffer(sellerA, created.id, 'Oferta A notifica solo a A.').expect(201);
      const offerB = await sendOffer(sellerB, created.id, 'Oferta B no se notifica al aceptar A.').expect(
        201,
      );

      await request(app.getHttpServer())
        .patch(`/api/offers/${offerA.body.id}/accept`)
        .set(authHeader(buyer.token))
        .expect(200);

      expect(
        await prisma.notification.count({
          where: { userId: sellerA.user.id, type: 'OFFER_ACCEPTED', entityId: offerA.body.id },
        }),
      ).toBe(1);
      expect(
        await prisma.notification.count({
          where: { userId: sellerB.user.id, type: 'OFFER_ACCEPTED' },
        }),
      ).toBe(0);

      await request(app.getHttpServer())
        .patch(`/api/offers/${offerB.body.id}/reject`)
        .set(authHeader(buyer.token))
        .expect(200);

      expect(
        await prisma.notification.count({
          where: { userId: sellerB.user.id, type: 'OFFER_REJECTED', entityId: offerB.body.id },
        }),
      ).toBe(1);
      expect(
        await prisma.notification.count({
          where: { userId: sellerA.user.id, type: 'OFFER_REJECTED' },
        }),
      ).toBe(0);
    });
  });

  describe('complete deal', () => {
    async function acceptOffer(buyerToken: string, offerId: string) {
      return request(app.getHttpServer())
        .patch(`/api/offers/${offerId}/accept`)
        .set(authHeader(buyerToken))
        .expect(200);
    }

    it('completes an accepted offer and closes the request', async () => {
      const buyer = await createBuyer('complete-ok');
      const seller = await createSeller('complete-ok');
      const { request: created, offer } = await createPendingOffer(
        buyer.token,
        seller,
        'Oferta aceptada para concretar operación.',
      );

      await acceptOffer(buyer.token, offer.id);

      const completeRes = await request(app.getHttpServer())
        .patch(`/api/offers/${offer.id}/complete`)
        .set(authHeader(buyer.token))
        .expect(200);

      expect(completeRes.body.dealCompletedAt).toBeTruthy();
      expect(completeRes.body.requestStatus).toBe('CERRADA');

      const storedOffer = await prisma.offer.findUniqueOrThrow({ where: { id: offer.id } });
      expect(storedOffer.dealCompletedAt).not.toBeNull();
      expect(await prisma.chat.count({ where: { offerId: offer.id } })).toBe(1);

      const storedRequest = await prisma.request.findUniqueOrThrow({ where: { id: created.id } });
      expect(storedRequest.status).toBe('CERRADA');
      expect(storedRequest.closedAt).not.toBeNull();
      expect(storedRequest.pausedAt).toBeNull();
    });

    it('rejects completing pending or rejected offers', async () => {
      const buyer = await createBuyer('complete-status');
      const seller = await createSeller('complete-status');
      const { offer } = await createPendingOffer(
        buyer.token,
        seller,
        'Oferta pendiente que no se puede concretar.',
      );

      await request(app.getHttpServer())
        .patch(`/api/offers/${offer.id}/complete`)
        .set(authHeader(buyer.token))
        .expect(400);

      await request(app.getHttpServer())
        .patch(`/api/offers/${offer.id}/reject`)
        .set(authHeader(buyer.token))
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/offers/${offer.id}/complete`)
        .set(authHeader(buyer.token))
        .expect(400);
    });

    it('forbids seller and other buyers from completing', async () => {
      const buyer = await createBuyer('complete-owner');
      const other = await createBuyer('complete-other');
      const seller = await createSeller('complete-owner');
      const { offer } = await createPendingOffer(
        buyer.token,
        seller,
        'Oferta para permisos de complete.',
      );
      await acceptOffer(buyer.token, offer.id);

      await request(app.getHttpServer())
        .patch(`/api/offers/${offer.id}/complete`)
        .set(authHeader(seller.token))
        .expect(403);
      await request(app.getHttpServer())
        .patch(`/api/offers/${offer.id}/complete`)
        .set(authHeader(other.token))
        .expect(403);
    });

    it('supports multiple accepted offers but only one completed deal', async () => {
      const buyer = await createBuyer('complete-multi');
      const sellerA = await createSeller('complete-a');
      const sellerB = await createSeller('complete-b');
      const sellerC = await createSeller('complete-c');
      const created = await createRequest(buyer.token);

      const offerA = await sendOffer(sellerA, created.id, 'Oferta A aceptada para multi complete.').expect(
        201,
      );
      const offerB = await sendOffer(sellerB, created.id, 'Oferta B aceptada para multi complete.').expect(
        201,
      );
      const offerC = await sendOffer(sellerC, created.id, 'Oferta C aceptada para multi complete.').expect(
        201,
      );

      await acceptOffer(buyer.token, offerA.body.id);
      await acceptOffer(buyer.token, offerB.body.id);
      await acceptOffer(buyer.token, offerC.body.id);

      expect(
        await prisma.offer.count({
          where: { requestId: created.id, status: 'ACEPTADA', dealCompletedAt: null },
        }),
      ).toBe(3);
      expect(await prisma.chat.count({ where: { offer: { requestId: created.id } } })).toBe(3);

      const buyerProfileBefore = await request(app.getHttpServer())
        .get(`/api/users/${buyer.user.id}/profile`)
        .set(authHeader(buyer.token))
        .expect(200);
      expect(buyerProfileBefore.body.completedDeals).toBe(0);

      const pendingBefore = await request(app.getHttpServer())
        .get('/api/ratings/pending')
        .set(authHeader(buyer.token))
        .expect(200);
      expect(pendingBefore.body.items).toHaveLength(0);

      await request(app.getHttpServer())
        .patch(`/api/offers/${offerB.body.id}/complete`)
        .set(authHeader(buyer.token))
        .expect(200);

      const [a, b, c] = await Promise.all([
        prisma.offer.findUniqueOrThrow({ where: { id: offerA.body.id } }),
        prisma.offer.findUniqueOrThrow({ where: { id: offerB.body.id } }),
        prisma.offer.findUniqueOrThrow({ where: { id: offerC.body.id } }),
      ]);
      expect(a.status).toBe('ACEPTADA');
      expect(a.dealCompletedAt).toBeNull();
      expect(b.status).toBe('ACEPTADA');
      expect(b.dealCompletedAt).not.toBeNull();
      expect(c.status).toBe('ACEPTADA');
      expect(c.dealCompletedAt).toBeNull();
      expect(await prisma.chat.count({ where: { offer: { requestId: created.id } } })).toBe(3);

      const buyerProfileAfter = await request(app.getHttpServer())
        .get(`/api/users/${buyer.user.id}/profile`)
        .set(authHeader(buyer.token))
        .expect(200);
      const sellerBProfile = await request(app.getHttpServer())
        .get(`/api/users/${sellerB.user.id}/profile`)
        .set(authHeader(buyer.token))
        .expect(200);
      const sellerAProfile = await request(app.getHttpServer())
        .get(`/api/users/${sellerA.user.id}/profile`)
        .set(authHeader(buyer.token))
        .expect(200);
      expect(buyerProfileAfter.body.completedDeals).toBe(1);
      expect(sellerBProfile.body.completedDeals).toBe(1);
      expect(sellerAProfile.body.completedDeals).toBe(0);

      const pendingAfter = await request(app.getHttpServer())
        .get('/api/ratings/pending')
        .set(authHeader(buyer.token))
        .expect(200);
      expect(pendingAfter.body.items).toHaveLength(1);
      expect(pendingAfter.body.items[0].offerId).toBe(offerB.body.id);

      await request(app.getHttpServer())
        .post('/api/ratings')
        .set(authHeader(buyer.token))
        .send({ offerId: offerB.body.id, type: 'REVIEW', stars: 5 })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/ratings')
        .set(authHeader(buyer.token))
        .send({ offerId: offerA.body.id, type: 'REVIEW', stars: 4 })
        .expect(400);
    });

    it('is idempotent and notifies the seller once', async () => {
      const buyer = await createBuyer('complete-idem');
      const seller = await createSeller('complete-idem');
      const { offer } = await createPendingOffer(
        buyer.token,
        seller,
        'Oferta para complete idempotente.',
      );
      await acceptOffer(buyer.token, offer.id);

      const first = await request(app.getHttpServer())
        .patch(`/api/offers/${offer.id}/complete`)
        .set(authHeader(buyer.token))
        .expect(200);
      const completedAt = first.body.dealCompletedAt;

      const second = await request(app.getHttpServer())
        .patch(`/api/offers/${offer.id}/complete`)
        .set(authHeader(buyer.token))
        .expect(200);
      expect(second.body.dealCompletedAt).toBe(completedAt);

      expect(
        await prisma.notification.count({
          where: { userId: seller.user.id, type: 'DEAL_COMPLETED' },
        }),
      ).toBe(1);
    });

    it('allows only one winner when two completes race', async () => {
      const buyer = await createBuyer('complete-race');
      const sellerA = await createSeller('complete-race-a');
      const sellerB = await createSeller('complete-race-b');
      const created = await createRequest(buyer.token);
      const offerA = await sendOffer(sellerA, created.id, 'Oferta A carrera complete.').expect(201);
      const offerB = await sendOffer(sellerB, created.id, 'Oferta B carrera complete.').expect(201);
      await acceptOffer(buyer.token, offerA.body.id);
      await acceptOffer(buyer.token, offerB.body.id);

      const [first, second] = await Promise.all([
        request(app.getHttpServer())
          .patch(`/api/offers/${offerA.body.id}/complete`)
          .set(authHeader(buyer.token)),
        request(app.getHttpServer())
          .patch(`/api/offers/${offerB.body.id}/complete`)
          .set(authHeader(buyer.token)),
      ]);

      expect([first.status, second.status].filter((s) => s === 200)).toHaveLength(1);
      const loserStatus = first.status === 200 ? second.status : first.status;
      expect([400, 409]).toContain(loserStatus);
      expect(
        await prisma.offer.count({
          where: { requestId: created.id, dealCompletedAt: { not: null } },
        }),
      ).toBe(1);
      expect((await prisma.request.findUniqueOrThrow({ where: { id: created.id } })).status).toBe(
        'CERRADA',
      );
    });

    it('allows NO_RESPONSE on accepted offers without completed deal', async () => {
      const buyer = await createBuyer('complete-noresp');
      const seller = await createSeller('complete-noresp');
      const { offer } = await createPendingOffer(
        buyer.token,
        seller,
        'Oferta para NO_RESPONSE sin deal.',
      );
      await acceptOffer(buyer.token, offer.id);

      await request(app.getHttpServer())
        .post('/api/ratings')
        .set(authHeader(seller.token))
        .send({ offerId: offer.id, type: 'NO_RESPONSE' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/ratings')
        .set(authHeader(buyer.token))
        .send({ offerId: offer.id, type: 'REVIEW', stars: 5 })
        .expect(400);
    });

    it('close without deal does not mark any offer as completed', async () => {
      const buyer = await createBuyer('close-nodeal');
      const seller = await createSeller('close-nodeal');
      const created = await createRequest(buyer.token);
      const offerRes = await sendOffer(
        seller,
        created.id,
        'Oferta aceptada pero request cerrada sin deal.',
      ).expect(201);
      await acceptOffer(buyer.token, offerRes.body.id);

      await request(app.getHttpServer())
        .patch(`/api/requests/${created.id}/close`)
        .set(authHeader(buyer.token))
        .expect(200);

      const stored = await prisma.offer.findUniqueOrThrow({ where: { id: offerRes.body.id } });
      expect(stored.dealCompletedAt).toBeNull();
      expect(await prisma.chat.count({ where: { offerId: offerRes.body.id } })).toBe(1);

      await request(app.getHttpServer())
        .patch(`/api/offers/${offerRes.body.id}/complete`)
        .set(authHeader(buyer.token))
        .expect(400);

      const received = await request(app.getHttpServer())
        .get('/api/offers/received?status=ACEPTADA')
        .set(authHeader(buyer.token))
        .expect(200);
      expect(received.body.items).toHaveLength(1);
      expect(received.body.items[0].dealCompletedAt).toBeNull();
      expect(received.body.items[0].request.status).toBe('CERRADA');
      expect(received.body.items[0].chatId).toBeTruthy();

      const sent = await request(app.getHttpServer())
        .get('/api/offers/sent?status=ACEPTADA')
        .set(authHeader(seller.token))
        .expect(200);
      expect(sent.body.items).toHaveLength(1);
      expect(sent.body.items[0].dealCompletedAt).toBeNull();
      expect(sent.body.items[0].request.status).toBe('CERRADA');
      expect(sent.body.items[0].chatId).toBeTruthy();
    });
  });

  describe('lifecycle and snapshot', () => {
    it('keeps NEGOCIANDO offerable and preserves the request snapshot', async () => {
      const buyer = await createBuyer('snapshot');
      const seller = await createSeller('snapshot');
      const sellerNew = await createSeller('snapshot-new');
      const created = await createRequest(buyer.token, {
        title: 'Ferrari original snapshot title',
      });
      const offerRes = await sendOffer(
        seller,
        created.id,
        'Oferta con snapshot de título y presupuesto.',
      ).expect(201);

      await request(app.getHttpServer())
        .patch(`/api/requests/${created.id}`)
        .set(authHeader(buyer.token))
        .send({ title: 'Título editado después de la oferta', budget: 150000 })
        .expect(200);

      const comparison = await request(app.getHttpServer())
        .get(`/api/offers/${offerRes.body.id}/comparison`)
        .set(authHeader(buyer.token))
        .expect(200);
      expect(comparison.body.offer.requestTitle).toBe(created.title);
      expect(comparison.body.offer.requestBudget).toBe(200000);
      expect(comparison.body.request.title).toBe(created.title);
      expect(comparison.body.request.budget).toBe(200000);

      await request(app.getHttpServer())
        .patch(`/api/offers/${offerRes.body.id}/accept`)
        .set(authHeader(buyer.token))
        .expect(200);

      const market = await request(app.getHttpServer())
        .get('/api/requests')
        .set(authHeader(sellerNew.token))
        .expect(200);
      expect(market.body.items.some((item: { id: string }) => item.id === created.id)).toBe(true);

      await sendOffer(sellerNew, created.id, 'Nueva oferta mientras NEGOCIANDO sigue abierta.').expect(
        201,
      );

      const closed = await request(app.getHttpServer())
        .patch(`/api/requests/${created.id}/close`)
        .set(authHeader(buyer.token))
        .expect(200);
      expect(closed.body.status).toBe('CERRADA');

      await sendOffer(sellerNew, created.id, 'No debería ofertar en una request cerrada.').expect(400);
      expect(await prisma.offer.count({ where: { requestId: created.id } })).toBe(2);
      expect(await prisma.chat.count({ where: { offer: { requestId: created.id } } })).toBe(1);
    });
  });
});
