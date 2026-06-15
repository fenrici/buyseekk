import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { authHeader, createTestApp, registerUser, resetDatabase } from './helpers';

describe('Seller matching alerts (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const runId = Date.now();
  const password = 'testpass123';

  const bmwMiamiFilters = {
    category: 'AUTOS',
    operation: '',
    location: 'Miami, FL',
    zone: '',
    bedrooms: '',
    minSqm: '',
    maxSqm: '',
    carBrand: 'BMW',
    carModel: '',
    carColor: '',
    carYearMin: '',
    maxMileage: '',
  };

  let reqCounter = 0;
  function uniqueRequirements(prefix: string) {
    reqCounter += 1;
    const suffix = String.fromCharCode(97 + (reqCounter % 26)) + String.fromCharCode(97 + ((reqCounter + 7) % 26));
    return `${prefix} variante ${suffix}`;
  }

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

  async function saveSearch(token: string, name: string, filters = bmwMiamiFilters) {
    return request(app.getHttpServer())
      .post('/api/saved-searches')
      .set(authHeader(token))
      .send({ name, category: 'AUTOS', filters })
      .expect(201);
  }

  function createAutoRequest(
    token: string,
    overrides: { carBrand?: string; carModel?: string; requirements?: string } = {},
  ) {
    const variant = overrides.requirements ?? uniqueRequirements('Busco auto en buen estado');
    return request(app.getHttpServer())
      .post('/api/requests')
      .set(authHeader(token))
      .send({
        category: 'AUTOS',
        operation: 'COMPRA',
        requirements: variant,
        budget: 35000,
        currency: 'USD',
        location: 'Miami, FL',
        zone: 'Brickell',
        country: 'US',
        carBrand: overrides.carBrand ?? 'BMW',
        carModel: overrides.carModel ?? 'Serie 3',
        carColor: 'Negro',
        carYearMin: 2019,
        maxMileage: 45000,
      });
  }

  it('notifies BMW Miami seller when a compatible BMW Miami request is published', async () => {
    const seller = await registerUser(app, {
      email: `alert-seller-${runId}@test.buyseekk.com`,
      password,
      name: 'Seller BMW',
      role: 'SELLER',
      country: 'US',
    });
    await saveSearch(seller.token, 'BMW Miami');

    const buyer = await registerUser(app, {
      email: `alert-buyer-${runId}@test.buyseekk.com`,
      password,
      name: 'Buyer',
      role: 'BUYER',
      country: 'US',
    });

    const created = await createAutoRequest(buyer.token).expect(201);

    const notifications = await prisma.notification.findMany({
      where: { userId: seller.user.id, type: 'NEW_MATCHING_REQUEST' },
    });

    expect(notifications).toHaveLength(1);
    expect(notifications[0].entityId).toBe(created.body.id);
    expect(notifications[0].message).toMatch(/Miami/i);
    expect(notifications[0].message).toMatch(/BMW/i);
    expect(notifications[0].title).toMatch(/BMW/i);
  });

  it('does not notify BMW Miami seller for Mercedes Miami request', async () => {
    const seller = await registerUser(app, {
      email: `alert-seller2-${runId}@test.buyseekk.com`,
      password,
      name: 'Seller BMW',
      role: 'SELLER',
      country: 'US',
    });
    await saveSearch(seller.token, 'BMW Miami');

    const buyer = await registerUser(app, {
      email: `alert-buyer2-${runId}@test.buyseekk.com`,
      password,
      name: 'Buyer',
      role: 'BUYER',
      country: 'US',
    });

    await createAutoRequest(buyer.token, {
      carBrand: 'Mercedes-Benz',
      carModel: 'Clase C',
      requirements: 'Busco Mercedes en Miami en excelente estado',
    }).expect(201);

    const notifications = await prisma.notification.findMany({
      where: { userId: seller.user.id, type: 'NEW_MATCHING_REQUEST' },
    });
    expect(notifications).toHaveLength(0);
  });

  it('does not create duplicate notifications for the same seller and request', async () => {
    const seller = await registerUser(app, {
      email: `alert-seller3-${runId}@test.buyseekk.com`,
      password,
      name: 'Seller BMW',
      role: 'SELLER',
      country: 'US',
    });
    await saveSearch(seller.token, 'BMW Miami A');
    await saveSearch(seller.token, 'BMW Miami B', { ...bmwMiamiFilters, zone: 'Brickell' });

    const buyer = await registerUser(app, {
      email: `alert-buyer3-${runId}@test.buyseekk.com`,
      password,
      name: 'Buyer',
      role: 'BUYER',
      country: 'US',
    });

    await createAutoRequest(buyer.token, {
      requirements: 'Busco BMW Serie tres en Miami con pocos kilometros',
    }).expect(201);

    const notifications = await prisma.notification.findMany({
      where: { userId: seller.user.id, type: 'NEW_MATCHING_REQUEST' },
    });
    expect(notifications).toHaveLength(1);
  });

  it('never alerts the buyer who published the request', async () => {
    const buyer = await registerUser(app, {
      email: `alert-both-${runId}@test.buyseekk.com`,
      password,
      name: 'Buyer Seller',
      role: 'BOTH',
      country: 'US',
    });
    await saveSearch(buyer.token, 'BMW Miami propia');

    await createAutoRequest(buyer.token, {
      requirements: 'Busco BMW en Miami para mi propia alerta de prueba',
    }).expect(201);

    const notifications = await prisma.notification.findMany({
      where: { userId: buyer.user.id, type: 'NEW_MATCHING_REQUEST' },
    });
    expect(notifications).toHaveLength(0);
  });
});
