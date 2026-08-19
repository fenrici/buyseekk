import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { SELLER_PROFILE_INCOMPLETE_CODE } from '@buyseekk/shared';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  authHeader,
  completeSellerProfileForOffers,
  createTestApp,
  ownedTestImageUrl,
  registerUser,
  resetDatabase,
} from './helpers';

describe('Seller profile & offer gating (e2e)', () => {
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

  async function createBuyer() {
    return registerUser(app, {
      email: `buyer-${nextId()}@test.buyseekk.com`,
      password,
      name: 'Carlos Buyer',
      role: 'BUYER',
      country: 'US',
    });
  }

  async function createSeller(options?: { completeSellerProfile?: boolean; sellerType?: 'INDIVIDUAL' | 'COMPANY' }) {
    return registerUser(
      app,
      {
        email: `seller-${nextId()}@test.buyseekk.com`,
        password,
        name: 'Franco Enrici',
        role: 'SELLER',
        country: 'US',
        sellerType: options?.sellerType ?? 'INDIVIDUAL',
      },
      { completeSellerProfile: options?.completeSellerProfile ?? true },
    );
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
      });
    if (res.status !== 201) {
      throw new Error(`createRequest failed: ${res.status} ${JSON.stringify(res.body)}`);
    }
    return res.body as { id: string };
  }

  function offerPayload(requestId: string, sellerId: string) {
    return {
      requestId,
      price: 195000,
      currency: 'USD',
      message: 'Propuesta completa con fotos reales del vehículo en excelente estado.',
      imageUrls: [ownedTestImageUrl(sellerId)],
    };
  }

  it('blocks individual seller without location from sending offers', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller({ completeSellerProfile: false });
    const created = await createRequest(buyer.token);

    const res = await request(app.getHttpServer())
      .post('/api/offers')
      .set(authHeader(seller.token))
      .send(offerPayload(created.id, seller.user.id));

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(SELLER_PROFILE_INCOMPLETE_CODE);
  });

  it('allows individual seller with complete profile to send offers', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const created = await createRequest(buyer.token);

    await request(app.getHttpServer())
      .post('/api/offers')
      .set(authHeader(seller.token))
      .send(offerPayload(created.id, seller.user.id))
      .expect(201);
  });

  it('blocks company seller missing business fields from sending offers', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller({ completeSellerProfile: false, sellerType: 'COMPANY' });
    const created = await createRequest(buyer.token);
    const res = await request(app.getHttpServer())
      .post('/api/offers')
      .set(authHeader(seller.token))
      .send(offerPayload(created.id, seller.user.id));

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(SELLER_PROFILE_INCOMPLETE_CODE);
  });

  it('allows company seller with complete profile to send offers', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller({ sellerType: 'COMPANY' });
    await completeSellerProfileForOffers(app, seller, {
      sellerType: 'COMPANY',
      businessName: 'Porsche Miami',
      businessType: 'DEALERSHIP',
      state: 'FL',
      city: 'Miami, FL',
    });

    const created = await createRequest(buyer.token);
    await request(app.getHttpServer())
      .post('/api/offers')
      .set(authHeader(seller.token))
      .send(offerPayload(created.id, seller.user.id))
      .expect(201);
  });

  it('allows BOTH role to send offers when profile is complete', async () => {
    const buyer = await createBuyer();
    const both = await registerUser(app, {
      email: `both-${nextId()}@test.buyseekk.com`,
      password,
      name: 'Both User',
      role: 'BOTH',
      country: 'US',
    });
    const created = await createRequest(buyer.token);

    await request(app.getHttpServer())
      .post('/api/offers')
      .set(authHeader(both.token))
      .send(offerPayload(created.id, both.user.id))
      .expect(201);
  });

  it('forbids buyer-only accounts from sending offers', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const created = await createRequest(buyer.token);

    await request(app.getHttpServer())
      .post('/api/offers')
      .set(authHeader(buyer.token))
      .send(offerPayload(created.id, seller.user.id))
      .expect(403);
  });

  it('preserves company data when switching to individual', async () => {
    const seller = await createSeller({ sellerType: 'COMPANY' });
    await completeSellerProfileForOffers(app, seller, {
      sellerType: 'COMPANY',
      businessName: 'Porsche Miami',
      businessType: 'DEALERSHIP',
      website: 'https://porsche-miami.example',
      state: 'FL',
      city: 'Miami, FL',
    });

    await request(app.getHttpServer())
      .patch('/api/users/me/seller-profile')
      .set(authHeader(seller.token))
      .send({
        sellerType: 'INDIVIDUAL',
        sellerCategory: 'AUTOS',
        state: 'FL',
        city: 'Miami, FL',
      })
      .expect(200);

    const stored = await prisma.user.findUniqueOrThrow({ where: { id: seller.user.id } });
    expect(stored.sellerType).toBe('INDIVIDUAL');
    expect(stored.businessName).toBe('Porsche Miami');
    expect(stored.businessType).toBe('DEALERSHIP');
    expect(stored.website).toBe('https://porsche-miami.example');
  });

  it('exposes formatted seller identity to buyer in received offers', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller({ sellerType: 'COMPANY' });
    await completeSellerProfileForOffers(app, seller, {
      sellerType: 'COMPANY',
      businessName: 'Porsche Miami',
      businessType: 'DEALERSHIP',
      state: 'FL',
      city: 'Miami',
    });
    const created = await createRequest(buyer.token);

    await request(app.getHttpServer())
      .post('/api/offers')
      .set(authHeader(seller.token))
      .send(offerPayload(created.id, seller.user.id))
      .expect(201);

    const res = await request(app.getHttpServer())
      .get('/api/offers/received?status=PENDIENTE')
      .set(authHeader(buyer.token))
      .expect(200);

    const items = Array.isArray(res.body) ? res.body : res.body.items;
    expect(items[0].seller.name).toBe('Franco Enrici');
    expect(items[0].seller.businessName).toBe('Porsche Miami');
    expect(items[0].seller.businessType).toBe('DEALERSHIP');
    expect(items[0].seller.state).toBe('FL');
    expect(items[0].seller.city).toBe('Miami');
  });

  it('shows correct buyer identity for legacy seller with split city/state', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller({ completeSellerProfile: false });
    await prisma.user.update({
      where: { id: seller.user.id },
      data: {
        sellerType: 'INDIVIDUAL',
        sellerCategory: 'AUTOS',
        state: 'FL',
        city: 'Miami',
      },
    });

    const created = await createRequest(buyer.token);
    const offerRes = await request(app.getHttpServer())
      .post('/api/offers')
      .set(authHeader(seller.token))
      .send(offerPayload(created.id, seller.user.id))
      .expect(201);

    const acceptRes = await request(app.getHttpServer())
      .patch(`/api/offers/${offerRes.body.id}/accept`)
      .set(authHeader(buyer.token))
      .expect(200);

    const chatRes = await request(app.getHttpServer())
      .get(`/api/chats/${acceptRes.body.chatId}`)
      .set(authHeader(buyer.token))
      .expect(200);

    expect(chatRes.body.partner.identityTitle).toMatch(/Franco Enrici \/ (Vendedor particular|Private seller)/);
    expect(chatRes.body.partner.identityDetail).toBe('Miami, FL');
    expect(chatRes.body.partner.identityDetail).not.toContain('FL, FL');
  });

  it('legacy COMPANY seller keeps business data and can offer', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller({ completeSellerProfile: false, sellerType: 'COMPANY' });
    await prisma.user.update({
      where: { id: seller.user.id },
      data: {
        sellerType: 'COMPANY',
        sellerCategory: 'AUTOS',
        businessName: 'Porsche Miami',
        businessType: 'DEALERSHIP',
        website: 'https://porsche-miami.example',
        state: 'FL',
        city: 'Miami',
      },
    });

    const created = await createRequest(buyer.token);
    await request(app.getHttpServer())
      .post('/api/offers')
      .set(authHeader(seller.token))
      .send(offerPayload(created.id, seller.user.id))
      .expect(201);

    const stored = await prisma.user.findUniqueOrThrow({ where: { id: seller.user.id } });
    expect(stored.sellerType).toBe('COMPANY');
    expect(stored.businessName).toBe('Porsche Miami');
    expect(stored.businessType).toBe('DEALERSHIP');
    expect(stored.city).toBe('Miami');
    expect(stored.state).toBe('FL');
  });

  it('exposes seller identity in chat partner for buyer', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const created = await createRequest(buyer.token);

    const offerRes = await request(app.getHttpServer())
      .post('/api/offers')
      .set(authHeader(seller.token))
      .send(offerPayload(created.id, seller.user.id))
      .expect(201);

    const acceptRes = await request(app.getHttpServer())
      .patch(`/api/offers/${offerRes.body.id}/accept`)
      .set(authHeader(buyer.token))
      .expect(200);

    const chatRes = await request(app.getHttpServer())
      .get(`/api/chats/${acceptRes.body.chatId}`)
      .set(authHeader(buyer.token))
      .expect(200);

    expect(chatRes.body.partner.identityTitle).toContain('Franco Enrici');
    expect(chatRes.body.partner.identityTitle).toMatch(/Vendedor particular|Private seller/);
    expect(chatRes.body.partner.identityDetail).toContain('Miami');
  });

  it('only allows editing own seller profile via /me', async () => {
    const sellerA = await createSeller();
    const sellerB = await createSeller();

    await request(app.getHttpServer())
      .patch('/api/users/me/seller-profile')
      .set(authHeader(sellerA.token))
      .send({
        sellerType: 'INDIVIDUAL',
        sellerCategory: 'AUTOS',
        state: 'FL',
        city: 'Orlando, FL',
      })
      .expect(200);

    const userBBefore = await prisma.user.findUniqueOrThrow({ where: { id: sellerB.user.id } });
    expect(userBBefore.city).not.toBe('Orlando, FL');

    const storedA = await prisma.user.findUniqueOrThrow({ where: { id: sellerA.user.id } });
    expect(storedA.city).toBe('Orlando, FL');
  });
});
