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

describe('P0 Phase 1 (e2e)', () => {
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
      email: `buyer-p0-${runId}-${Math.random()}@test.buyseekk.com`,
      password,
      name: 'Buyer P0',
      role: 'BUYER',
      country: 'US',
    });
  }

  async function createSeller() {
    return registerUser(app, {
      email: `seller-p0-${runId}-${Math.random()}@test.buyseekk.com`,
      password,
      name: 'Seller P0',
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
      })
      .expect(201);
    return res.body.id as string;
  }

  describe('PATCH /api/requests/:id', () => {
    it('owner buyer can edit request without offers', async () => {
      const buyer = await createBuyer();
      const requestId = await createRequest(buyer.token);

      const res = await request(app.getHttpServer())
        .patch(`/api/requests/${requestId}`)
        .set(authHeader(buyer.token))
        .send({ requirements: 'Actualizado: quiero interior negro también.' })
        .expect(200);

      expect(res.body.requirements).toContain('Actualizado');
    });

    it('non-owner cannot edit', async () => {
      const buyer = await createBuyer();
      const other = await createBuyer();
      const requestId = await createRequest(buyer.token);

      await request(app.getHttpServer())
        .patch(`/api/requests/${requestId}`)
        .set(authHeader(other.token))
        .send({ requirements: 'Intento malicioso' })
        .expect(403);
    });

    it('seller cannot edit', async () => {
      const buyer = await createBuyer();
      const seller = await createSeller();
      const requestId = await createRequest(buyer.token);

      await request(app.getHttpServer())
        .patch(`/api/requests/${requestId}`)
        .set(authHeader(seller.token))
        .send({ requirements: 'Seller edit' })
        .expect(403);
    });

    it('returns 404 for missing request', async () => {
      const buyer = await createBuyer();

      await request(app.getHttpServer())
        .patch('/api/requests/does-not-exist')
        .set(authHeader(buyer.token))
        .send({ requirements: 'Texto válido para probar 404.' })
        .expect(404);
    });

    it('blocks edit when offer is accepted', async () => {
      const buyer = await createBuyer();
      const seller = await createSeller();
      const requestId = await createRequest(buyer.token);

      const offerRes = await request(app.getHttpServer())
        .post('/api/offers')
        .set(authHeader(seller.token))
        .send({
          requestId,
          price: 195000,
          currency: 'USD',
          message: 'Oferta para bloquear edición tras aceptar.',
          imageUrls: ['/api/uploads/test.jpg'],
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/offers/${offerRes.body.id}/accept`)
        .set(authHeader(buyer.token))
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/requests/${requestId}`)
        .set(authHeader(buyer.token))
        .send({ requirements: 'No debería poder' })
        .expect(400);
    });

    it('blocks structural fields with pending offer', async () => {
      const buyer = await createBuyer();
      const seller = await createSeller();
      const requestId = await createRequest(buyer.token);

      await request(app.getHttpServer())
        .post('/api/offers')
        .set(authHeader(seller.token))
        .send({
          requestId,
          price: 190000,
          currency: 'USD',
          message: 'Oferta pendiente para validar edición limitada.',
          imageUrls: ['/api/uploads/test.jpg'],
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/requests/${requestId}`)
        .set(authHeader(buyer.token))
        .send({ location: 'New York, NY' })
        .expect(400);

      const ok = await request(app.getHttpServer())
        .patch(`/api/requests/${requestId}`)
        .set(authHeader(buyer.token))
        .send({ requirements: 'Ajuste menor con oferta pendiente.' })
        .expect(200);

      expect(ok.body.requirements).toContain('Ajuste menor');
    });
  });

  describe('GET /api/requests/mine', () => {
    it('returns only buyer requests with pagination', async () => {
      const buyer = await createBuyer();
      const other = await createBuyer();
      await createRequest(buyer.token);
      await createRequest(buyer.token);
      await createRequest(other.token);

      const res = await request(app.getHttpServer())
        .get('/api/requests/mine?limit=1&page=1')
        .set(authHeader(buyer.token))
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.total).toBe(2);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(1);
      expect(res.body.hasNextPage).toBe(true);
    });

    it('allows seller-capable (BOTH) accounts to list their own requests', async () => {
      const seller = await createSeller();

      const res = await request(app.getHttpServer())
        .get('/api/requests/mine')
        .set(authHeader(seller.token))
        .expect(200);

      expect(res.body.items).toHaveLength(0);
      expect(res.body.total).toBe(0);
    });
  });

  describe('GET /api/chats/:id messages pagination', () => {
    it('returns limited messages by default with metadata', async () => {
      const buyer = await createBuyer();
      const seller = await createSeller();
      const requestId = await createRequest(buyer.token);

      const offerRes = await request(app.getHttpServer())
        .post('/api/offers')
        .set(authHeader(seller.token))
        .send({
          requestId,
          price: 195000,
          currency: 'USD',
          message: 'Oferta para chat paginado.',
          imageUrls: ['/api/uploads/test.jpg'],
        })
        .expect(201);

      const acceptRes = await request(app.getHttpServer())
        .patch(`/api/offers/${offerRes.body.id}/accept`)
        .set(authHeader(buyer.token))
        .expect(200);

      const chatId = acceptRes.body.chatId as string;

      for (let i = 0; i < 35; i++) {
        await request(app.getHttpServer())
          .post(`/api/chats/${chatId}/messages`)
          .set(authHeader(buyer.token))
          .send({ text: `Mensaje ${i}` })
          .expect(201);
      }

      const res = await request(app.getHttpServer())
        .get(`/api/chats/${chatId}`)
        .set(authHeader(buyer.token))
        .expect(200);

      expect(res.body.messages.length).toBeLessThanOrEqual(30);
      expect(res.body.messagesMeta.total).toBeGreaterThan(30);
      expect(res.body.messagesMeta.limit).toBe(30);
    });

    it('blocks non-participant', async () => {
      const buyer = await createBuyer();
      const seller = await createSeller();
      const outsider = await createBuyer();
      const requestId = await createRequest(buyer.token);

      const offerRes = await request(app.getHttpServer())
        .post('/api/offers')
        .set(authHeader(seller.token))
        .send({
          requestId,
          price: 195000,
          currency: 'USD',
          message: 'Oferta para acceso chat.',
          imageUrls: ['/api/uploads/test.jpg'],
        })
        .expect(201);

      const acceptRes = await request(app.getHttpServer())
        .patch(`/api/offers/${offerRes.body.id}/accept`)
        .set(authHeader(buyer.token))
        .expect(200);

      await request(app.getHttpServer())
        .get(`/api/chats/${acceptRes.body.chatId}`)
        .set(authHeader(outsider.token))
        .expect(403);
    });
  });

  describe('GET /api/ratings/pending', () => {
    it('returns paginated pending ratings for user only', async () => {
      const buyer = await createBuyer();
      const seller = await createSeller();
      const requestId = await createRequest(buyer.token);

      const offerRes = await request(app.getHttpServer())
        .post('/api/offers')
        .set(authHeader(seller.token))
        .send({
          requestId,
          price: 195000,
          currency: 'USD',
          message: 'Oferta para rating pendiente.',
          imageUrls: ['/api/uploads/test.jpg'],
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/offers/${offerRes.body.id}/accept`)
        .set(authHeader(buyer.token))
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/api/ratings/pending?limit=10&page=1')
        .set(authHeader(buyer.token))
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.total).toBe(1);
      expect(res.body.items[0].myRole).toBe('buyer');
      expect(res.body.items[0].partner).toBeDefined();
      expect(res.body.items[0].partner.id).toBe(seller.user.id);
    });
  });
});
