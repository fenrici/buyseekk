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

describe('One account, two profiles (e2e)', () => {
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

  it('keeps buyer and seller avatars independent on a BOTH account', async () => {
    const account = await registerUser(app, {
      email: `dual-${runId}@test.buyseekk.com`,
      password,
      name: 'Franco Enrici',
      role: 'BOTH',
      country: 'US',
    });

    const buyerUrl = ownedTestImageUrl(account.user.id);
    const sellerUrl = ownedTestImageUrl(account.user.id);

    const afterBuyer = await request(app.getHttpServer())
      .patch('/api/users/me')
      .set(authHeader(account.token))
      .send({ buyerAvatarUrl: buyerUrl })
      .expect(200);

    expect(afterBuyer.body.email).toBe(`dual-${runId}@test.buyseekk.com`);
    expect(afterBuyer.body.buyerAvatarUrl).toBe(buyerUrl);
    expect(afterBuyer.body.avatarUrl).toBe(buyerUrl);
    expect(afterBuyer.body.sellerAvatarUrl).toBeNull();

    const afterSeller = await request(app.getHttpServer())
      .patch('/api/users/me/seller-profile')
      .set(authHeader(account.token))
      .send({
        sellerType: 'INDIVIDUAL',
        sellerCategory: 'AUTOS',
        state: 'FL',
        city: 'Miami',
        sellerAvatarUrl: sellerUrl,
      })
      .expect(200);

    expect(afterSeller.body.buyerAvatarUrl).toBe(buyerUrl);
    expect(afterSeller.body.sellerAvatarUrl).toBe(sellerUrl);
    expect(afterSeller.body.buyerAvatarUrl).not.toBe(afterSeller.body.sellerAvatarUrl);

    const nextBuyer = ownedTestImageUrl(account.user.id);
    const buyerOnly = await request(app.getHttpServer())
      .patch('/api/users/me')
      .set(authHeader(account.token))
      .send({ buyerAvatarUrl: nextBuyer })
      .expect(200);
    expect(buyerOnly.body.buyerAvatarUrl).toBe(nextBuyer);
    expect(buyerOnly.body.sellerAvatarUrl).toBe(sellerUrl);

    const nextSeller = ownedTestImageUrl(account.user.id);
    const sellerOnly = await request(app.getHttpServer())
      .patch('/api/users/me/seller-profile')
      .set(authHeader(account.token))
      .send({
        sellerType: 'INDIVIDUAL',
        sellerCategory: 'AUTOS',
        state: 'FL',
        city: 'Miami',
        sellerAvatarUrl: nextSeller,
      })
      .expect(200);
    expect(sellerOnly.body.sellerAvatarUrl).toBe(nextSeller);
    expect(sellerOnly.body.buyerAvatarUrl).toBe(nextBuyer);

    const asBuyer = await request(app.getHttpServer())
      .patch('/api/users/me/active-mode')
      .set(authHeader(account.token))
      .send({ activeMode: 'BUYER' })
      .expect(200);
    expect(asBuyer.body.activeMode).toBe('BUYER');
    expect(asBuyer.body.role).toBe('BOTH');
    expect(asBuyer.body.email).toBe(account.user.email);
    expect(asBuyer.body.buyerAvatarUrl).toBe(nextBuyer);
    expect(asBuyer.body.sellerAvatarUrl).toBe(nextSeller);

    const asSeller = await request(app.getHttpServer())
      .patch('/api/users/me/active-mode')
      .set(authHeader(account.token))
      .send({ activeMode: 'SELLER' })
      .expect(200);
    expect(asSeller.body.activeMode).toBe('SELLER');
    expect(asSeller.body.buyerAvatarUrl).toBe(nextBuyer);
    expect(asSeller.body.sellerAvatarUrl).toBe(nextSeller);
    expect(asSeller.body.email).toBe(asBuyer.body.email);
  });

  it('shows person + business name for COMPANY and person + private seller for INDIVIDUAL', async () => {
    const company = await registerUser(app, {
      email: `co-${runId}@test.buyseekk.com`,
      password,
      name: 'Franco Enrici',
      role: 'SELLER',
      country: 'US',
      sellerType: 'COMPANY',
    });
    await request(app.getHttpServer())
      .patch('/api/users/me/seller-profile')
      .set(authHeader(company.token))
      .send({
        sellerType: 'COMPANY',
        sellerCategory: 'AUTOS',
        state: 'FL',
        city: 'Miami',
        businessName: 'BMW Miami',
        businessType: 'DEALERSHIP',
      })
      .expect(200);

    const companyPublic = await request(app.getHttpServer())
      .get(`/api/users/${company.user.id}/profile`)
      .expect(200);
    expect(companyPublic.body.name).toBe('Franco Enrici');
    expect(companyPublic.body.businessName).toBe('BMW Miami');
    expect(companyPublic.body.name).not.toBe(companyPublic.body.businessName);

    const individual = await registerUser(app, {
      email: `ind-${runId}@test.buyseekk.com`,
      password,
      name: 'Franco Enrici',
      role: 'SELLER',
      country: 'US',
    });
    const individualPublic = await request(app.getHttpServer())
      .get(`/api/users/${individual.user.id}/profile`)
      .expect(200);
    expect(individualPublic.body.name).toBe('Franco Enrici');
    expect(individualPublic.body.sellerType).toBe('INDIVIDUAL');
  });

  it('tags buyer and seller notifications with the matching targetMode', async () => {
    const buyer = await registerUser(app, {
      email: `nbuyer-${runId}@test.buyseekk.com`,
      password,
      name: 'Buyer',
      role: 'BUYER',
      country: 'US',
    });
    const seller = await registerUser(app, {
      email: `nseller-${runId}@test.buyseekk.com`,
      password,
      name: 'Seller',
      role: 'SELLER',
      country: 'US',
    });

    const created = await request(app.getHttpServer())
      .post('/api/requests')
      .set(authHeader(buyer.token))
      .send({
        category: 'AUTOS',
        operation: 'COMPRA',
        requirements: 'Busco Ferrari rojo impecable bajo km para perfiles duales',
        budget: 50000,
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

    const offer = await request(app.getHttpServer())
      .post('/api/offers')
      .set(authHeader(seller.token))
      .send({
        requestId: created.body.id,
        price: 48000,
        currency: 'USD',
        message: 'Oferta con contexto buyer y seller en notificaciones.',
        imageUrls: [ownedTestImageUrl(seller.user.id)],
      })
      .expect(201);

    const buyerNotes = await request(app.getHttpServer())
      .get('/api/notifications/recent')
      .set(authHeader(buyer.token))
      .expect(200);
    const newOffer = buyerNotes.body.find((n: { type: string }) => n.type === 'NEW_OFFER');
    expect(newOffer).toBeTruthy();
    expect(newOffer.targetMode).toBe('BUYER');

    await request(app.getHttpServer())
      .patch(`/api/offers/${offer.body.id}/accept`)
      .set(authHeader(buyer.token))
      .expect(200);

    const sellerNotes = await request(app.getHttpServer())
      .get('/api/notifications/recent')
      .set(authHeader(seller.token))
      .expect(200);
    const accepted = sellerNotes.body.find((n: { type: string }) => n.type === 'OFFER_ACCEPTED');
    expect(accepted).toBeTruthy();
    expect(accepted.targetMode).toBe('SELLER');
  });
});
