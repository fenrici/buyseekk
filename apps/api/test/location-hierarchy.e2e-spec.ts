import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  launchCityLocationsForUsState,
  launchStatesForUsRequests,
  neighborhoodsForUsArea,
} from '@buyseekk/shared';
import {
  authHeader,
  createTestApp,
  registerUser,
  resetDatabase,
} from './helpers';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Request location hierarchy (e2e)', () => {
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
      name: 'Buyer Loc',
      role: 'BUYER',
      country: 'US',
    });
  }

  async function createSeller() {
    return registerUser(app, {
      email: `seller-${nextId()}@test.buyseekk.com`,
      password,
      name: 'Seller Loc',
      role: 'SELLER',
      country: 'US',
    });
  }

  function autoPayload(extra: Record<string, unknown> = {}) {
    const unique = nextId();
    return {
      category: 'AUTOS',
      requirements: `Busco SUV familiar en Florida con bajo millaje. Caso ${unique}.`,
      budget: 45000,
      currency: 'USD',
      location: 'Miami, FL',
      country: 'US',
      carBrand: 'Toyota',
      carModel: 'RAV4',
      carColor: 'Blanco',
      carYearMin: 2020,
      maxMileage: 40000,
      ...extra,
    };
  }

  async function createRequest(token: string, extra: Record<string, unknown> = {}) {
    const res = await request(app.getHttpServer())
      .post('/api/requests')
      .set(authHeader(token))
      .send(autoPayload(extra))
      .expect(201);
    return res.body as { id: string; location: string; zone: string | null; state: string | null };
  }

  async function sellerList(token: string, query: Record<string, string>) {
    const res = await request(app.getHttpServer())
      .get('/api/requests')
      .query(query)
      .set(authHeader(token))
      .expect(200);
    return res.body.items as Array<{ id: string }>;
  }

  it('exposes only Florida with Miami as the launch market', () => {
    expect(launchStatesForUsRequests()).toEqual(['FL']);
    expect(launchCityLocationsForUsState('FL')).toEqual(['Miami, FL']);
    expect(launchCityLocationsForUsState('TX')).toEqual([]);
    expect(neighborhoodsForUsArea('FL', 'Miami')).toContain('Brickell');
    expect(neighborhoodsForUsArea('FL', 'Orlando')).not.toContain('Brickell');
  });

  it('rejects non-launch locations and invalid zone/city pairs', async () => {
    const buyer = await createBuyer();
    await request(app.getHttpServer())
      .post('/api/requests')
      .set(authHeader(buyer.token))
      .send(autoPayload({ location: 'Orlando, FL', zone: '' }))
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/requests')
      .set(authHeader(buyer.token))
      .send(autoPayload({ location: 'Fort Lauderdale, FL', zone: '' }))
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/requests')
      .set(authHeader(buyer.token))
      .send(autoPayload({ location: 'Miami, FL', zone: 'Brickell' }))
      .expect(201);
  });

  it('saves Miami Brickell and Miami any-area, and edit keeps the same semantics', async () => {
    const buyer = await createBuyer();
    const brickell = await createRequest(buyer.token, { zone: 'Brickell' });
    expect(brickell.location).toBe('Miami, FL');
    expect(brickell.zone).toBe('Brickell');
    expect(brickell.state).toBe('FL');

    const anyArea = await createRequest(buyer.token, { zone: '' });
    expect(anyArea.location).toBe('Miami, FL');
    expect(anyArea.zone).toBeNull();
    expect(anyArea.state).toBe('FL');

    const patched = await request(app.getHttpServer())
      .patch(`/api/requests/${anyArea.id}`)
      .set(authHeader(buyer.token))
      .send({ zone: 'Kendall' })
      .expect(200);
    expect(patched.body.location).toBe('Miami, FL');
    expect(patched.body.zone).toBe('Kendall');

    await request(app.getHttpServer())
      .patch(`/api/requests/${brickell.id}`)
      .set(authHeader(buyer.token))
      .send({ location: 'Orlando, FL' })
      .expect(400);

    await request(app.getHttpServer())
      .patch(`/api/requests/${anyArea.id}`)
      .set(authHeader(buyer.token))
      .send({ zone: 'Brickell' })
      .expect(200);
  });

  it('seller filters by Florida, Miami, and Brickell without metro expansion', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();

    const brickell = await createRequest(buyer.token, { zone: 'Brickell' });
    const anyMiami = await createRequest(buyer.token, { zone: '' });
    const kendall = await createRequest(buyer.token, { zone: 'Kendall' });

    await request(app.getHttpServer())
      .post('/api/requests')
      .set(authHeader(buyer.token))
      .send(autoPayload({ location: 'Dallas, TX', zone: '' }))
      .expect(400);

    const ids = (items: Array<{ id: string }>) => items.map((i) => i.id);

    const florida = await sellerList(seller.token, { state: 'FL' });
    expect(ids(florida)).toEqual(expect.arrayContaining([brickell.id, anyMiami.id, kendall.id]));

    const miami = await sellerList(seller.token, { state: 'FL', location: 'Miami, FL' });
    expect(ids(miami)).toEqual(expect.arrayContaining([brickell.id, anyMiami.id, kendall.id]));

    const brickellFilter = await sellerList(seller.token, {
      state: 'FL',
      location: 'Miami, FL',
      zone: 'Brickell',
    });
    expect(ids(brickellFilter)).toEqual(expect.arrayContaining([brickell.id, anyMiami.id]));
    expect(ids(brickellFilter)).not.toContain(kendall.id);
  });
});
