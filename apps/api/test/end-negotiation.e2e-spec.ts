import { INestApplication } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { notificationCopy } from '../src/notifications/notification-copy';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  authHeader,
  createTestApp,
  ownedTestImageUrl,
  registerUser,
  resetDatabase,
} from './helpers';

describe('End negotiation (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const runId = Date.now();
  const password = 'Testpass123';
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

  async function createBuyer() {
    return registerUser(app, {
      email: `buyer-${nextId()}@test.buyseekk.com`,
      password,
      name: 'Buyer',
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

  async function createRequest(token: string) {
    const res = await request(app.getHttpServer())
      .post('/api/requests')
      .set(authHeader(token))
      .send({
        category: 'AUTOS',
        requirements: `Busco deportivo impecable en Miami con bajo kilometraje. Caso ${nextId()}.`,
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
    return res.body as { id: string; status: string };
  }

  function sendOffer(
    seller: Awaited<ReturnType<typeof createSeller>>,
    requestId: string,
    message: string,
  ) {
    return request(app.getHttpServer())
      .post('/api/offers')
      .set(authHeader(seller.token))
      .send({
        requestId,
        price: 195000,
        currency: 'USD',
        message,
        imageUrls: [ownedTestImageUrl(seller.user.id)],
      });
  }

  async function acceptOffer(buyerToken: string, offerId: string) {
    return request(app.getHttpServer())
      .patch(`/api/offers/${offerId}/accept`)
      .set(authHeader(buyerToken))
      .expect(200);
  }

  it('buyer ends an active negotiation and request returns ACTIVA when it was the last one', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const created = await createRequest(buyer.token);
    const offerRes = await sendOffer(seller, created.id, 'Oferta para finalizar negociación.');
    expect(offerRes.status).toBe(201);

    const acceptRes = await acceptOffer(buyer.token, offerRes.body.id);
    expect(acceptRes.body.status).toBe('ACEPTADA');

    const ended = await request(app.getHttpServer())
      .patch(`/api/offers/${offerRes.body.id}/end-negotiation`)
      .set(authHeader(buyer.token))
      .expect(200);

    expect(ended.body.negotiationEndedAt).toBeTruthy();
    expect(ended.body.negotiationEndedBy).toBe('BUYER');
    expect(ended.body.dealCompletedAt).toBeNull();
    expect(ended.body.status).toBe('ACEPTADA');

    const storedReq = await prisma.request.findUniqueOrThrow({ where: { id: created.id } });
    expect(storedReq.status).toBe('ACTIVA');
  });

  it('seller ends negotiation and buyer is notified once', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const created = await createRequest(buyer.token);
    const offerRes = await sendOffer(seller, created.id, 'Oferta para cierre del vendedor.');
    const acceptRes = await acceptOffer(buyer.token, offerRes.body.id);
    const chatId = acceptRes.body.chatId as string;

    await request(app.getHttpServer())
      .patch(`/api/offers/${offerRes.body.id}/end-negotiation`)
      .set(authHeader(seller.token))
      .expect(200);

    const notifications = await prisma.notification.findMany({
      where: {
        userId: buyer.user.id,
        type: NotificationType.NEGOTIATION_ENDED,
        entityId: chatId,
      },
    });
    expect(notifications).toHaveLength(1);

    const copyEs = notificationCopy(NotificationType.NEGOTIATION_ENDED, 'ES', {
      requestTitle: 'Test',
      endedBy: 'seller',
    });
    expect(copyEs.message).toContain('vendedor');
  });

  it('forbids unrelated users, pending offers, rejected offers, and completed deals', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const outsider = await createSeller('outsider');
    const created = await createRequest(buyer.token);
    const pending = await sendOffer(seller, created.id, 'Pendiente sin aceptar.');
    expect(pending.status).toBe(201);

    await request(app.getHttpServer())
      .patch(`/api/offers/${pending.body.id}/end-negotiation`)
      .set(authHeader(buyer.token))
      .expect(400);

    const accepted = await acceptOffer(buyer.token, pending.body.id);
    await request(app.getHttpServer())
      .patch(`/api/offers/${accepted.body.id}/end-negotiation`)
      .set(authHeader(outsider.token))
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/api/offers/${accepted.body.id}/complete`)
      .set(authHeader(buyer.token))
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/offers/${accepted.body.id}/end-negotiation`)
      .set(authHeader(buyer.token))
      .expect(400);

    const rejectedFlow = await createRequest(buyer.token);
    const rejectedOffer = await sendOffer(seller, rejectedFlow.id, 'Oferta rechazada.');
    await request(app.getHttpServer())
      .patch(`/api/offers/${rejectedOffer.body.id}/reject`)
      .set(authHeader(buyer.token))
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/api/offers/${rejectedOffer.body.id}/end-negotiation`)
      .set(authHeader(buyer.token))
      .expect(400);
  });

  it('keeps request NEGOCIANDO when one of two active negotiations ends', async () => {
    const buyer = await createBuyer();
    const sellerA = await createSeller('a');
    const sellerB = await createSeller('b');
    const created = await createRequest(buyer.token);
    const offerA = await sendOffer(sellerA, created.id, 'Negociación A activa.');
    const offerB = await sendOffer(sellerB, created.id, 'Negociación B activa.');
    await acceptOffer(buyer.token, offerA.body.id);
    await acceptOffer(buyer.token, offerB.body.id);

    await request(app.getHttpServer())
      .patch(`/api/offers/${offerA.body.id}/end-negotiation`)
      .set(authHeader(buyer.token))
      .expect(200);

    const stored = await prisma.request.findUniqueOrThrow({ where: { id: created.id } });
    expect(stored.status).toBe('NEGOCIANDO');
  });

  it('blocks complete after end and blocks chat messages while keeping history', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const created = await createRequest(buyer.token);
    const offerRes = await sendOffer(seller, created.id, 'Oferta para chat histórico.');
    const acceptRes = await acceptOffer(buyer.token, offerRes.body.id);
    const chatId = acceptRes.body.chatId as string;

    await request(app.getHttpServer())
      .patch(`/api/offers/${offerRes.body.id}/end-negotiation`)
      .set(authHeader(buyer.token))
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/offers/${offerRes.body.id}/complete`)
      .set(authHeader(buyer.token))
      .expect(400);

    await request(app.getHttpServer())
      .get(`/api/chats/${chatId}`)
      .set(authHeader(buyer.token))
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/chats/${chatId}/messages`)
      .set(authHeader(buyer.token))
      .send({ text: 'Mensaje después de finalizar.' })
      .expect(400);

    const chatDetail = await request(app.getHttpServer())
      .get(`/api/chats/${chatId}`)
      .set(authHeader(buyer.token))
      .expect(200);
    expect(chatDetail.body.messagingEnabled).toBe(false);

    const ratingCtx = await request(app.getHttpServer())
      .get(`/api/ratings/offer/${offerRes.body.id}`)
      .set(authHeader(seller.token))
      .expect(200);
    expect(ratingCtx.body.canReview).toBe(false);
    expect(ratingCtx.body.canMarkNoResponse).toBe(false);
  });

  it('allows new offers from other sellers but not a second offer from the same seller', async () => {
    const buyer = await createBuyer();
    const sellerA = await createSeller('a');
    const sellerB = await createSeller('b');
    const created = await createRequest(buyer.token);
    const offerA = await sendOffer(sellerA, created.id, 'Primera oferta del seller A.');
    await acceptOffer(buyer.token, offerA.body.id);
    await request(app.getHttpServer())
      .patch(`/api/offers/${offerA.body.id}/end-negotiation`)
      .set(authHeader(buyer.token))
      .expect(200);

    await sendOffer(sellerB, created.id, 'Nueva oferta de otro seller.').expect(201);
    await sendOffer(sellerA, created.id, 'Re-oferta del mismo seller.').expect(409);
  });

  it('is idempotent for concurrent end attempts and rejects complete race', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const created = await createRequest(buyer.token);
    const offerRes = await sendOffer(seller, created.id, 'Oferta para concurrencia.');
    await acceptOffer(buyer.token, offerRes.body.id);

    const [endA, endB] = await Promise.all([
      request(app.getHttpServer())
        .patch(`/api/offers/${offerRes.body.id}/end-negotiation`)
        .set(authHeader(buyer.token)),
      request(app.getHttpServer())
        .patch(`/api/offers/${offerRes.body.id}/end-negotiation`)
        .set(authHeader(seller.token)),
    ]);

    const statuses = [endA.status, endB.status].sort();
    expect(statuses).toEqual([200, 200]);

    const stored = await prisma.offer.findUniqueOrThrow({ where: { id: offerRes.body.id } });
    expect(stored.negotiationEndedAt).not.toBeNull();
    expect(stored.negotiationEndedBy).toBeTruthy();

    const notifCount = await prisma.notification.count({
      where: { type: NotificationType.NEGOTIATION_ENDED },
    });
    expect(notifCount).toBe(1);

    const raceCreated = await createRequest(buyer.token);
    const raceOffer = await sendOffer(seller, raceCreated.id, 'Carrera end vs complete.');
    await acceptOffer(buyer.token, raceOffer.body.id);

    const [completeRes, endRes] = await Promise.all([
      request(app.getHttpServer())
        .patch(`/api/offers/${raceOffer.body.id}/complete`)
        .set(authHeader(buyer.token)),
      request(app.getHttpServer())
        .patch(`/api/offers/${raceOffer.body.id}/end-negotiation`)
        .set(authHeader(seller.token)),
    ]);

    const storedRace = await prisma.offer.findUniqueOrThrow({ where: { id: raceOffer.body.id } });
    const completed = !!storedRace.dealCompletedAt;
    const ended = !!storedRace.negotiationEndedAt;
    expect(completed !== ended).toBe(true);
    expect([completeRes.status, endRes.status].filter((s) => s === 200)).toHaveLength(1);
  });

  it('allows buyer to edit after ending the last active negotiation', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const created = await createRequest(buyer.token);
    const offerRes = await sendOffer(seller, created.id, 'Oferta para reabrir edición.');
    await acceptOffer(buyer.token, offerRes.body.id);

    await request(app.getHttpServer())
      .patch(`/api/offers/${offerRes.body.id}/end-negotiation`)
      .set(authHeader(buyer.token))
      .expect(200);

    const storedReq = await prisma.request.findUniqueOrThrow({ where: { id: created.id } });
    expect(storedReq.status).toBe('ACTIVA');

    const edited = await request(app.getHttpServer())
      .patch(`/api/requests/${created.id}`)
      .set(authHeader(buyer.token))
      .send({ requirements: 'Actualizado tras finalizar negociación.' })
      .expect(200);

    expect(edited.body.requirements).toContain('Actualizado tras finalizar');
  });

  it('blocks edit while another active negotiation remains', async () => {
    const buyer = await createBuyer();
    const sellerA = await createSeller('a');
    const sellerB = await createSeller('b');
    const created = await createRequest(buyer.token);
    const offerA = await sendOffer(sellerA, created.id, 'Negociación A.');
    const offerB = await sendOffer(sellerB, created.id, 'Negociación B.');
    await acceptOffer(buyer.token, offerA.body.id);
    await acceptOffer(buyer.token, offerB.body.id);

    await request(app.getHttpServer())
      .patch(`/api/offers/${offerA.body.id}/end-negotiation`)
      .set(authHeader(buyer.token))
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/requests/${created.id}`)
      .set(authHeader(buyer.token))
      .send({ requirements: 'No debería poder editar con B activa.' })
      .expect(400);
  });

  it('blocks chat send after request close ended negotiations but keeps history readable', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const created = await createRequest(buyer.token);
    const offerRes = await sendOffer(seller, created.id, 'Oferta para cierre de búsqueda.');
    const acceptRes = await acceptOffer(buyer.token, offerRes.body.id);
    const chatId = acceptRes.body.chatId as string;

    await request(app.getHttpServer())
      .patch(`/api/requests/${created.id}/close`)
      .set(authHeader(buyer.token))
      .expect(200);

    const chatDetail = await request(app.getHttpServer())
      .get(`/api/chats/${chatId}`)
      .set(authHeader(buyer.token))
      .expect(200);
    expect(chatDetail.body.messagingEnabled).toBe(false);

    await request(app.getHttpServer())
      .post(`/api/chats/${chatId}/messages`)
      .set(authHeader(buyer.token))
      .send({ text: 'No debería enviar tras cerrar búsqueda.' })
      .expect(400);
  });

  it('mine listing exposes no active negotiation after all ended', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const created = await createRequest(buyer.token);
    const offerRes = await sendOffer(seller, created.id, 'Oferta histórica finalizada.');
    await acceptOffer(buyer.token, offerRes.body.id);
    await request(app.getHttpServer())
      .patch(`/api/offers/${offerRes.body.id}/end-negotiation`)
      .set(authHeader(buyer.token))
      .expect(200);

    const mine = await request(app.getHttpServer())
      .get('/api/requests/mine')
      .set(authHeader(buyer.token))
      .expect(200);

    const item = mine.body.items.find((r: { id: string }) => r.id === created.id);
    expect(item?.status).toBe('ACTIVA');
    const hasActive = (item?.offers ?? []).some(
      (o: { status: string; dealCompletedAt?: string | null; negotiationEndedAt?: string | null }) =>
        o.status === 'ACEPTADA' && !o.dealCompletedAt && !o.negotiationEndedAt,
    );
    expect(hasActive).toBe(false);
  });

  it('deal completed chat remains writable when negotiation was not ended', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const created = await createRequest(buyer.token);
    const offerRes = await sendOffer(seller, created.id, 'Oferta para deal completado.');
    const acceptRes = await acceptOffer(buyer.token, offerRes.body.id);
    const chatId = acceptRes.body.chatId as string;

    await request(app.getHttpServer())
      .patch(`/api/offers/${offerRes.body.id}/complete`)
      .set(authHeader(buyer.token))
      .expect(200);

    const chatDetail = await request(app.getHttpServer())
      .get(`/api/chats/${chatId}`)
      .set(authHeader(buyer.token))
      .expect(200);
    expect(chatDetail.body.messagingEnabled).toBe(true);
    expect(chatDetail.body.negotiationEndedAt).toBeNull();

    await request(app.getHttpServer())
      .post(`/api/chats/${chatId}/messages`)
      .set(authHeader(buyer.token))
      .send({ text: 'Mensaje post deal completado.', clientMessageId: 'deal-complete-chat-01' })
      .expect(201);
  });
});
