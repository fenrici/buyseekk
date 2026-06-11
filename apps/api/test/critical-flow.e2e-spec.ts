import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  authHeader,
  createTestApp,
  loginUser,
  registerUser,
  resetDatabase,
} from './helpers';

describe('Critical business flow (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const runId = Date.now();
  const password = 'testpass123';

  const buyerEmail = `buyer-${runId}@test.buyseekk.com`;
  const sellerEmail = `seller-${runId}@test.buyseekk.com`;

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

  it('register → login → request → offer → accept → chat → rating', async () => {
    const buyer = await registerUser(app, {
      email: buyerEmail,
      password,
      name: 'Test Buyer',
      role: 'BUYER',
      country: 'US',
    });
    expect(buyer.token).toBeDefined();
    expect(buyer.user.email).toBe(buyerEmail);

    const seller = await registerUser(app, {
      email: sellerEmail,
      password,
      name: 'Test Seller',
      role: 'SELLER',
      country: 'US',
    });

    const login = await loginUser(app, buyerEmail, password);
    expect(login.user.id).toBe(buyer.user.id);

    const me = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set(authHeader(buyer.token))
      .expect(200);
    expect(me.body.email).toBe(buyerEmail);

    const requestRes = await request(app.getHttpServer())
      .post('/api/requests')
      .set(authHeader(buyer.token))
      .send({
        category: 'AUTOS',
        operation: 'COMPRA',
        requirements: 'Busco Ferrari rojo, impecable, bajo kilometraje.',
        budget: 250000,
        currency: 'USD',
        location: 'Miami, FL',
        zone: 'Brickell',
        country: 'US',
        carBrand: 'Ferrari',
        carModel: '488 GTB',
        carColor: 'Rosso Corsa',
        carYearMin: 2018,
        maxMileage: 15000,
      })
      .expect(201);

    const requestId = requestRes.body.id as string;
    expect(requestId).toBeDefined();

    const offerRes = await request(app.getHttpServer())
      .post('/api/offers')
      .set(authHeader(seller.token))
      .send({
        requestId,
        price: 245000,
        currency: 'USD',
        message: 'Tengo un Ferrari 488 GTB en excelente estado, listo para entregar.',
        imageUrls: ['/api/uploads/e2e-test.jpg'],
      })
      .expect(201);

    const offerId = offerRes.body.id as string;
    expect(offerRes.body.status).toBe('PENDIENTE');

    const acceptRes = await request(app.getHttpServer())
      .patch(`/api/offers/${offerId}/accept`)
      .set(authHeader(buyer.token))
      .expect(200);

    const chatId = acceptRes.body.chatId as string;
    expect(chatId).toBeDefined();
    expect(acceptRes.body.status).toBe('ACEPTADA');

    const chatRes = await request(app.getHttpServer())
      .get(`/api/chats/${chatId}`)
      .set(authHeader(buyer.token))
      .expect(200);

    expect(chatRes.body.messages.length).toBeGreaterThanOrEqual(2);

    const messageRes = await request(app.getHttpServer())
      .post(`/api/chats/${chatId}/messages`)
      .set(authHeader(buyer.token))
      .send({ text: 'Perfecto, coordinemos la entrega.' })
      .expect(201);

    expect(messageRes.body.text).toBe('Perfecto, coordinemos la entrega.');

    const ratingRes = await request(app.getHttpServer())
      .post('/api/ratings')
      .set(authHeader(buyer.token))
      .send({
        offerId,
        type: 'REVIEW',
        stars: 5,
        comment: 'Excelente vendedor, muy recomendable.',
      })
      .expect(201);

    expect(ratingRes.body.stars).toBe(5);
    expect(ratingRes.body.toUserId).toBe(seller.user.id);

    const statsRes = await request(app.getHttpServer())
      .get(`/api/ratings/user/${seller.user.id}/stats`)
      .set(authHeader(buyer.token))
      .expect(200);

    expect(statsRes.body.reviewCount).toBe(1);
    expect(statsRes.body.avgStars).toBe(5);
  });

  it('rejects offer from buyer panel', async () => {
    const buyer = await registerUser(app, {
      email: `buyer-reject-${runId}@test.buyseekk.com`,
      password,
      name: 'Buyer Reject',
      role: 'BUYER',
      country: 'US',
    });
    const seller = await registerUser(app, {
      email: `seller-reject-${runId}@test.buyseekk.com`,
      password,
      name: 'Seller Reject',
      role: 'SELLER',
      country: 'US',
    });

    const requestRes = await request(app.getHttpServer())
      .post('/api/requests')
      .set(authHeader(buyer.token))
      .send({
        category: 'AUTOS',
        requirements: 'Busco auto deportivo en Miami, estado impecable.',
        budget: 100000,
        currency: 'USD',
        location: 'Miami, FL',
        zone: 'Brickell',
        country: 'US',
        carBrand: 'Ferrari',
        carModel: '488 GTB',
        carColor: 'Rosso Corsa',
        carYearMin: 2018,
        maxMileage: 20000,
      })
      .expect(201);

    const offerRes = await request(app.getHttpServer())
      .post('/api/offers')
      .set(authHeader(seller.token))
      .send({
        requestId: requestRes.body.id,
        price: 99000,
        currency: 'USD',
        message: 'Oferta de prueba para rechazo en flujo e2e.',
        imageUrls: ['/api/uploads/e2e-reject.jpg'],
      })
      .expect(201);

    const rejectRes = await request(app.getHttpServer())
      .patch(`/api/offers/${offerRes.body.id}/reject`)
      .set(authHeader(buyer.token))
      .expect(200);

    expect(rejectRes.body.status).toBe('RECHAZADA');

    const offers = await request(app.getHttpServer())
      .get('/api/offers/received')
      .set(authHeader(buyer.token))
      .expect(200);

    expect(offers.body.items).toHaveLength(0);
  });

  it('blocks cross-user access to chat', async () => {
    const buyer = await registerUser(app, {
      email: `buyer-chat-${runId}@test.buyseekk.com`,
      password,
      name: 'Buyer Chat',
      role: 'BUYER',
      country: 'US',
    });
    const seller = await registerUser(app, {
      email: `seller-chat-${runId}@test.buyseekk.com`,
      password,
      name: 'Seller Chat',
      role: 'SELLER',
      country: 'US',
    });
    const outsider = await registerUser(app, {
      email: `outsider-${runId}@test.buyseekk.com`,
      password,
      name: 'Outsider',
      role: 'BUYER',
      country: 'US',
    });

    const requestRes = await request(app.getHttpServer())
      .post('/api/requests')
      .set(authHeader(buyer.token))
      .send({
        category: 'AUTOS',
        requirements: 'Busco deportivo en Miami para test de acceso.',
        budget: 120000,
        currency: 'USD',
        location: 'Miami, FL',
        zone: 'Brickell',
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
        requestId: requestRes.body.id,
        price: 115000,
        currency: 'USD',
        message: 'Oferta para validar que terceros no acceden al chat.',
        imageUrls: ['/api/uploads/e2e-access.jpg'],
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
