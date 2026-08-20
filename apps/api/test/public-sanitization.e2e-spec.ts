import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { authHeader, createTestApp, registerUser, resetDatabase } from './helpers';

const PRIVATE_FIELDS = [
  'email',
  'passwordHash',
  'refreshToken',
  'blocked',
  'blockedReason',
  'suspended',
  'phone',
];

function expectNoPrivateFields(value: unknown) {
  const serialized = JSON.stringify(value);
  for (const field of PRIVATE_FIELDS) {
    expect(serialized).not.toContain(`"${field}"`);
  }
}

describe('Public sanitization (e2e)', () => {
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

  it('strips private fields from public requests and public profiles', async () => {
    const buyer = await registerUser(app, {
      email: `public-buyer-${runId}@test.buyseekk.com`,
      password,
      name: 'Public Buyer',
      role: 'BUYER',
      country: 'US',
    });

    const created = await request(app.getHttpServer())
      .post('/api/requests')
      .set(authHeader(buyer.token))
      .send({
        category: 'AUTOS',
        requirements: 'Busco Ferrari público para sanitización.',
        budget: 180000,
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

    const list = await request(app.getHttpServer()).get('/api/public/requests').expect(200);
    expect(list.body.items.length).toBeGreaterThan(0);
    expectNoPrivateFields(list.body);
    expect(list.body.items[0].buyerInitials).toBeDefined();
    expect(list.body.items[0].user).toBeUndefined();

    const one = await request(app.getHttpServer())
      .get(`/api/public/requests/${created.body.id}`)
      .expect(200);
    expectNoPrivateFields(one.body);
    expect(one.body.user).toBeUndefined();

    const profile = await request(app.getHttpServer())
      .get(`/api/users/${buyer.user.id}/profile`)
      .expect(200);
    expectNoPrivateFields(profile.body);
    expect(profile.body.id).toBe(buyer.user.id);
    expect(profile.body.name).toBe('Public Buyer');
  });
});
