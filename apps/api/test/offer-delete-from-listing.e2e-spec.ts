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

describe('Remove offer from listing (e2e)', () => {
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

  async function completeDeal(buyerToken: string, offerId: string) {
    return request(app.getHttpServer())
      .patch(`/api/offers/${offerId}/complete`)
      .set(authHeader(buyerToken))
      .expect(200);
  }

  async function endNegotiation(token: string, offerId: string) {
    return request(app.getHttpServer())
      .patch(`/api/offers/${offerId}/end-negotiation`)
      .set(authHeader(token))
      .expect(200);
  }

  async function receivedIds(token: string) {
    const res = await request(app.getHttpServer())
      .get('/api/offers/received?status=ACEPTADA')
      .set(authHeader(token))
      .expect(200);
    const items = Array.isArray(res.body) ? res.body : res.body.items;
    return (items as { id: string }[]).map((o) => o.id);
  }

  async function sentIds(token: string) {
    const res = await request(app.getHttpServer())
      .get('/api/offers/sent?status=ACEPTADA')
      .set(authHeader(token))
      .expect(200);
    const items = Array.isArray(res.body) ? res.body : res.body.items;
    return (items as { id: string }[]).map((o) => o.id);
  }

  it('buyer removes a completed deal from received list', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const created = await createRequest(buyer.token);
    const offerRes = await sendOffer(seller, created.id, 'Oferta para eliminar deal.');
    expect(offerRes.status).toBe(201);
    await acceptOffer(buyer.token, offerRes.body.id);
    await completeDeal(buyer.token, offerRes.body.id);

    await request(app.getHttpServer())
      .delete(`/api/offers/${offerRes.body.id}`)
      .set(authHeader(buyer.token))
      .expect(200);

    expect(await receivedIds(buyer.token)).not.toContain(offerRes.body.id);
    expect(await sentIds(seller.token)).toContain(offerRes.body.id);

    const stored = await prisma.offer.findUniqueOrThrow({ where: { id: offerRes.body.id } });
    expect(stored.buyerDeletedAt).toBeTruthy();
    expect(stored.sellerDeletedAt).toBeNull();
    expect(stored.dealCompletedAt).toBeTruthy();
  });

  it('seller removes a completed deal from sent list', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const created = await createRequest(buyer.token);
    const offerRes = await sendOffer(seller, created.id, 'Oferta deal vendedor.');
    await acceptOffer(buyer.token, offerRes.body.id);
    await completeDeal(buyer.token, offerRes.body.id);

    await request(app.getHttpServer())
      .delete(`/api/offers/${offerRes.body.id}`)
      .set(authHeader(seller.token))
      .expect(200);

    expect(await sentIds(seller.token)).not.toContain(offerRes.body.id);
    expect(await receivedIds(buyer.token)).toContain(offerRes.body.id);

    const stored = await prisma.offer.findUniqueOrThrow({ where: { id: offerRes.body.id } });
    expect(stored.sellerDeletedAt).toBeTruthy();
    expect(stored.buyerDeletedAt).toBeNull();
  });

  it('buyer removes ended negotiation without deal', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const created = await createRequest(buyer.token);
    const offerRes = await sendOffer(seller, created.id, 'Oferta negociación finalizada.');
    await acceptOffer(buyer.token, offerRes.body.id);
    await endNegotiation(buyer.token, offerRes.body.id);

    await request(app.getHttpServer())
      .delete(`/api/offers/${offerRes.body.id}`)
      .set(authHeader(buyer.token))
      .expect(200);

    expect(await receivedIds(buyer.token)).not.toContain(offerRes.body.id);
    expect(await sentIds(seller.token)).toContain(offerRes.body.id);

    const stored = await prisma.offer.findUniqueOrThrow({ where: { id: offerRes.body.id } });
    expect(stored.negotiationEndedAt).toBeTruthy();
    expect(stored.dealCompletedAt).toBeNull();
    expect(stored.buyerDeletedAt).toBeTruthy();
  });

  it('seller removes ended negotiation without deal', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const created = await createRequest(buyer.token);
    const offerRes = await sendOffer(seller, created.id, 'Oferta cierre vendedor.');
    await acceptOffer(buyer.token, offerRes.body.id);
    await endNegotiation(seller.token, offerRes.body.id);

    await request(app.getHttpServer())
      .delete(`/api/offers/${offerRes.body.id}`)
      .set(authHeader(seller.token))
      .expect(200);

    expect(await sentIds(seller.token)).not.toContain(offerRes.body.id);
    expect(await receivedIds(buyer.token)).toContain(offerRes.body.id);

    const stored = await prisma.offer.findUniqueOrThrow({ where: { id: offerRes.body.id } });
    expect(stored.sellerDeletedAt).toBeTruthy();
    expect(stored.buyerDeletedAt).toBeNull();
  });

  it('removal is independent between buyer and seller', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const created = await createRequest(buyer.token);
    const offerRes = await sendOffer(seller, created.id, 'Oferta independiente.');
    await acceptOffer(buyer.token, offerRes.body.id);
    await completeDeal(buyer.token, offerRes.body.id);

    await request(app.getHttpServer())
      .delete(`/api/offers/${offerRes.body.id}`)
      .set(authHeader(buyer.token))
      .expect(200);

    expect(await receivedIds(buyer.token)).not.toContain(offerRes.body.id);
    expect(await sentIds(seller.token)).toContain(offerRes.body.id);

    await request(app.getHttpServer())
      .delete(`/api/offers/${offerRes.body.id}`)
      .set(authHeader(seller.token))
      .expect(200);

    expect(await sentIds(seller.token)).not.toContain(offerRes.body.id);
  });

  it('forbids removing pending offers', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const created = await createRequest(buyer.token);
    const offerRes = await sendOffer(seller, created.id, 'Pendiente.');
    expect(offerRes.status).toBe(201);

    await request(app.getHttpServer())
      .delete(`/api/offers/${offerRes.body.id}`)
      .set(authHeader(buyer.token))
      .expect(400);

    await request(app.getHttpServer())
      .delete(`/api/offers/${offerRes.body.id}`)
      .set(authHeader(seller.token))
      .expect(400);
  });

  it('forbids removing active negotiations', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const created = await createRequest(buyer.token);
    const offerRes = await sendOffer(seller, created.id, 'Negociación activa.');
    await acceptOffer(buyer.token, offerRes.body.id);

    await request(app.getHttpServer())
      .delete(`/api/offers/${offerRes.body.id}`)
      .set(authHeader(buyer.token))
      .expect(400);

    await request(app.getHttpServer())
      .delete(`/api/offers/${offerRes.body.id}`)
      .set(authHeader(seller.token))
      .expect(400);
  });

  it('keeps offer row, chat, and messages after removal', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const created = await createRequest(buyer.token);
    const offerRes = await sendOffer(seller, created.id, 'Persistencia.');
    const accepted = await acceptOffer(buyer.token, offerRes.body.id);
    const chatId = accepted.body.chatId as string;

    await request(app.getHttpServer())
      .post(`/api/chats/${chatId}/messages`)
      .set(authHeader(buyer.token))
      .send({ text: 'Mensaje histórico' })
      .expect(201);

    await endNegotiation(buyer.token, offerRes.body.id);

    await request(app.getHttpServer())
      .delete(`/api/offers/${offerRes.body.id}`)
      .set(authHeader(buyer.token))
      .expect(200);

    const offer = await prisma.offer.findUniqueOrThrow({ where: { id: offerRes.body.id } });
    expect(offer).toBeTruthy();
    expect(offer.negotiationEndedAt).toBeTruthy();

    const chat = await prisma.chat.findUniqueOrThrow({ where: { id: chatId } });
    expect(chat).toBeTruthy();

    const messages = await prisma.message.count({ where: { chatId } });
    expect(messages).toBeGreaterThan(0);
  });

  it('does not change dealCompletedAt or ratings eligibility after removal', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const created = await createRequest(buyer.token);
    const offerRes = await sendOffer(seller, created.id, 'Ratings intactos.');
    await acceptOffer(buyer.token, offerRes.body.id);
    const completed = await completeDeal(buyer.token, offerRes.body.id);
    const dealCompletedAt = new Date(completed.body.dealCompletedAt);

    await request(app.getHttpServer())
      .delete(`/api/offers/${offerRes.body.id}`)
      .set(authHeader(buyer.token))
      .expect(200);

    const stored = await prisma.offer.findUniqueOrThrow({ where: { id: offerRes.body.id } });
    expect(stored.dealCompletedAt?.getTime()).toBe(dealCompletedAt.getTime());

    const ratingsRes = await request(app.getHttpServer())
      .get('/api/ratings/pending')
      .set(authHeader(buyer.token))
      .expect(200);
    const pending = ratingsRes.body.items as { offerId: string }[];
    expect(pending.some((r) => r.offerId === offerRes.body.id)).toBe(true);
  });

  it('double delete is idempotent', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const created = await createRequest(buyer.token);
    const offerRes = await sendOffer(seller, created.id, 'Idempotente.');
    await acceptOffer(buyer.token, offerRes.body.id);
    await endNegotiation(buyer.token, offerRes.body.id);

    await request(app.getHttpServer())
      .delete(`/api/offers/${offerRes.body.id}`)
      .set(authHeader(buyer.token))
      .expect(200);

    const first = await prisma.offer.findUniqueOrThrow({ where: { id: offerRes.body.id } });

    await request(app.getHttpServer())
      .delete(`/api/offers/${offerRes.body.id}`)
      .set(authHeader(buyer.token))
      .expect(200);

    const second = await prisma.offer.findUniqueOrThrow({ where: { id: offerRes.body.id } });
    expect(second.buyerDeletedAt?.getTime()).toBe(first.buyerDeletedAt?.getTime());
  });

  it('returns 403 for unrelated users', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const outsider = await createSeller('outsider');
    const created = await createRequest(buyer.token);
    const offerRes = await sendOffer(seller, created.id, 'Oferta para verificar acceso ajeno 403.');
    expect(offerRes.status).toBe(201);
    await acceptOffer(buyer.token, offerRes.body.id);
    await endNegotiation(buyer.token, offerRes.body.id);

    await request(app.getHttpServer())
      .delete(`/api/offers/${offerRes.body.id}`)
      .set(authHeader(outsider.token))
      .expect(403);
  });
});
