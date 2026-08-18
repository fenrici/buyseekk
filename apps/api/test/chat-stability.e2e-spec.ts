import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  authHeader,
  createTestApp,
  registerUser,
  resetDatabase,
} from './helpers';

describe('Chat stability (e2e)', () => {
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

  async function createBuyer(suffix: string) {
    return registerUser(app, {
      email: `buyer-chat-${runId}-${suffix}@test.buyseekk.com`,
      password,
      name: 'Buyer Chat',
      role: 'BUYER',
      country: 'US',
    });
  }

  async function createSeller(suffix: string) {
    return registerUser(app, {
      email: `seller-chat-${runId}-${suffix}@test.buyseekk.com`,
      password,
      name: 'Seller Chat',
      role: 'SELLER',
      country: 'US',
    });
  }

  async function createRequest(token: string, unique: string) {
    const res = await request(app.getHttpServer())
      .post('/api/requests')
      .set(authHeader(token))
      .send({
        category: 'AUTOS',
        requirements: `Busco auto para chat e2e. Caso ${unique}.`,
        budget: 160000,
        currency: 'USD',
        location: 'Miami, FL',
        country: 'US',
        carBrand: 'Ferrari',
        carModel: '488 GTB',
        carColor: 'Rosso Corsa',
        carYearMin: 2018,
        maxMileage: 18000,
      })
      .expect(201);
    return res.body.id as string;
  }

  async function openChat(buyerToken: string, sellerToken: string, unique: string) {
    const requestId = await createRequest(buyerToken, unique);
    const offerRes = await request(app.getHttpServer())
      .post('/api/offers')
      .set(authHeader(sellerToken))
      .send({
        requestId,
        price: 155000,
        currency: 'USD',
        message: `Oferta para abrir chat ${unique} con fotos.`,
        imageUrls: ['/api/uploads/chat-e2e.jpg'],
      })
      .expect(201);

    const acceptRes = await request(app.getHttpServer())
      .patch(`/api/offers/${offerRes.body.id}/accept`)
      .set(authHeader(buyerToken))
      .expect(200);

    return { requestId, chatId: acceptRes.body.chatId as string, offerId: offerRes.body.id as string };
  }

  describe('idempotency', () => {
    it('reuses the same message for the same clientMessageId', async () => {
      const buyer = await createBuyer('idemp');
      const seller = await createSeller('idemp');
      const { chatId } = await openChat(buyer.token, seller.token, 'idemp');
      const clientMessageId = 'client-msg-same-0001';

      const first = await request(app.getHttpServer())
        .post(`/api/chats/${chatId}/messages`)
        .set(authHeader(buyer.token))
        .send({ text: 'Hola, ¿seguimos?', clientMessageId })
        .expect(201);

      const second = await request(app.getHttpServer())
        .post(`/api/chats/${chatId}/messages`)
        .set(authHeader(buyer.token))
        .send({ text: 'Hola, ¿seguimos?', clientMessageId })
        .expect(201);

      expect(second.body.id).toBe(first.body.id);

      const count = await prisma.message.count({
        where: { chatId, fromRole: 'buyer', clientMessageId },
      });
      expect(count).toBe(1);
    });

    it('creates two messages when clientMessageId differs', async () => {
      const buyer = await createBuyer('idemp2');
      const seller = await createSeller('idemp2');
      const { chatId } = await openChat(buyer.token, seller.token, 'idemp2');

      const first = await request(app.getHttpServer())
        .post(`/api/chats/${chatId}/messages`)
        .set(authHeader(buyer.token))
        .send({ text: 'Primer mensaje distinto.', clientMessageId: 'client-msg-a-0001' })
        .expect(201);
      const second = await request(app.getHttpServer())
        .post(`/api/chats/${chatId}/messages`)
        .set(authHeader(buyer.token))
        .send({ text: 'Segundo mensaje distinto.', clientMessageId: 'client-msg-b-0002' })
        .expect(201);

      expect(second.body.id).not.toBe(first.body.id);
      const count = await prisma.message.count({ where: { chatId, fromRole: 'buyer' } });
      expect(count).toBe(2);
    });
  });

  describe('permissions', () => {
    it('blocks an outsider from reading, sending and marking read', async () => {
      const buyer = await createBuyer('perm');
      const seller = await createSeller('perm');
      const outsider = await createBuyer('out');
      const { chatId } = await openChat(buyer.token, seller.token, 'perm');

      await request(app.getHttpServer())
        .get(`/api/chats/${chatId}`)
        .set(authHeader(outsider.token))
        .expect(403);

      await request(app.getHttpServer())
        .post(`/api/chats/${chatId}/messages`)
        .set(authHeader(outsider.token))
        .send({ text: 'No debería entrar.', clientMessageId: 'client-msg-out-0001' })
        .expect(403);
    });
  });

  describe('lifecycle', () => {
    it('keeps an existing chat usable after pause, close and soft-delete', async () => {
      const buyer = await createBuyer('life');
      const seller = await createSeller('life');
      const { chatId, requestId } = await openChat(buyer.token, seller.token, 'life');

      await request(app.getHttpServer())
        .patch(`/api/requests/${requestId}/pause`)
        .set(authHeader(buyer.token))
        .expect(200);

      await request(app.getHttpServer())
        .get(`/api/chats/${chatId}`)
        .set(authHeader(buyer.token))
        .expect(200);
      await request(app.getHttpServer())
        .post(`/api/chats/${chatId}/messages`)
        .set(authHeader(buyer.token))
        .send({ text: 'Seguimos con la request pausada.', clientMessageId: 'client-msg-pause-01' })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/requests/${requestId}/close`)
        .set(authHeader(buyer.token))
        .expect(200);

      await request(app.getHttpServer())
        .get(`/api/chats/${chatId}`)
        .set(authHeader(seller.token))
        .expect(200);
      await request(app.getHttpServer())
        .post(`/api/chats/${chatId}/messages`)
        .set(authHeader(seller.token))
        .send({ text: 'Chat sigue con request cerrada.', clientMessageId: 'client-msg-close-01' })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/api/requests/${requestId}`)
        .set(authHeader(buyer.token))
        .expect(200);

      await request(app.getHttpServer())
        .get(`/api/chats/${chatId}`)
        .set(authHeader(buyer.token))
        .expect(200);
      await request(app.getHttpServer())
        .post(`/api/chats/${chatId}/messages`)
        .set(authHeader(buyer.token))
        .send({ text: 'Historial intacto tras eliminar.', clientMessageId: 'client-msg-del-01' })
        .expect(201);
    });
  });

  describe('unread', () => {
    it('counts partner messages only and clears after opening the chat', async () => {
      const buyer = await createBuyer('unread');
      const seller = await createSeller('unread');
      const { chatId } = await openChat(buyer.token, seller.token, 'unread');

      await request(app.getHttpServer())
        .get(`/api/chats/${chatId}`)
        .set(authHeader(buyer.token))
        .expect(200);

      const before = await request(app.getHttpServer())
        .get('/api/chats/unread-summary')
        .set(authHeader(seller.token))
        .expect(200);
      const beforeCount = before.body.byChatId[chatId] ?? 0;

      await request(app.getHttpServer())
        .post(`/api/chats/${chatId}/messages`)
        .set(authHeader(buyer.token))
        .send({ text: 'Mensaje para unread del seller.', clientMessageId: 'client-msg-un-0001' })
        .expect(201);

      const buyerUnread = await request(app.getHttpServer())
        .get('/api/chats/unread-summary')
        .set(authHeader(buyer.token))
        .expect(200);
      expect(buyerUnread.body.byChatId[chatId] ?? 0).toBe(0);

      const sellerUnread = await request(app.getHttpServer())
        .get('/api/chats/unread-summary')
        .set(authHeader(seller.token))
        .expect(200);
      expect(sellerUnread.body.byChatId[chatId]).toBe(beforeCount + 1);
      expect(sellerUnread.body.totalUnread).toBeGreaterThanOrEqual(beforeCount + 1);

      await request(app.getHttpServer())
        .get(`/api/chats/${chatId}`)
        .set(authHeader(seller.token))
        .expect(200);

      const afterOpen = await request(app.getHttpServer())
        .get('/api/chats/unread-summary')
        .set(authHeader(seller.token))
        .expect(200);
      expect(afterOpen.body.byChatId[chatId] ?? 0).toBe(0);
    });
  });

  describe('inbox order', () => {
    it('moves a chat with a new message to the top', async () => {
      const buyer = await createBuyer('inbox');
      const seller = await createSeller('inbox');
      const first = await openChat(buyer.token, seller.token, 'inbox-a');
      const second = await openChat(buyer.token, seller.token, 'inbox-b');

      const before = await request(app.getHttpServer())
        .get('/api/chats')
        .set(authHeader(seller.token))
        .expect(200);
      expect(before.body.items[0].id).toBe(second.chatId);

      await request(app.getHttpServer())
        .post(`/api/chats/${first.chatId}/messages`)
        .set(authHeader(buyer.token))
        .send({ text: 'Este chat viejo ahora es el más reciente.', clientMessageId: 'client-msg-ord-01' })
        .expect(201);

      const after = await request(app.getHttpServer())
        .get('/api/chats')
        .set(authHeader(seller.token))
        .expect(200);
      expect(after.body.items[0].id).toBe(first.chatId);
    });
  });
});
