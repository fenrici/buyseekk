import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { authHeader, createTestApp, registerUser, resetDatabase } from './helpers';

describe('Roles, activeMode and IDOR (e2e)', () => {
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

  function autoRequest(requirements: string) {
    return {
      category: 'AUTOS',
      requirements,
      budget: 150000,
      currency: 'USD',
      location: 'Miami, FL',
      country: 'US',
      carBrand: 'Ferrari',
      carModel: '488 GTB',
      carColor: 'Rosso Corsa',
      carYearMin: 2018,
      maxMileage: 15000,
    };
  }

  it('authorizes by capability, not activeMode, and blocks IDOR', async () => {
    const buyerA = await registerUser(app, {
      email: `idor-a-${runId}@test.buyseekk.com`,
      password,
      name: 'Buyer A',
      role: 'BUYER',
      country: 'US',
    });
    const buyerB = await registerUser(app, {
      email: `idor-b-${runId}@test.buyseekk.com`,
      password,
      name: 'Buyer B',
      role: 'BUYER',
      country: 'US',
    });
    const both = await registerUser(app, {
      email: `both-${runId}@test.buyseekk.com`,
      password,
      name: 'Both User',
      role: 'BOTH',
      country: 'US',
    });

    await request(app.getHttpServer())
      .post('/api/offers')
      .set(authHeader(buyerA.token))
      .send({
        requestId: '00000000-0000-0000-0000-000000000000',
        price: 1,
        currency: 'USD',
        message: 'Buyer cannot offer.',
        imageUrls: ['/api/uploads/test.jpg'],
      })
      .expect(403);

    const reqA = await request(app.getHttpServer())
      .post('/api/requests')
      .set(authHeader(buyerA.token))
      .send(autoRequest('Solicitud de A para IDOR.'))
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/requests/${reqA.body.id}`)
      .set(authHeader(buyerB.token))
      .send({ requirements: 'Intento de editar solicitud ajena con texto suficiente.' })
      .expect(403);

    await request(app.getHttpServer())
      .patch('/api/users/me')
      .set(authHeader(buyerA.token))
      .send({ role: 'ADMIN' })
      .expect(400);

    await request(app.getHttpServer())
      .patch('/api/users/me/active-mode')
      .set(authHeader(both.token))
      .send({ activeMode: 'BUYER' })
      .expect(200);

    const offer = await request(app.getHttpServer())
      .post('/api/offers')
      .set(authHeader(both.token))
      .send({
        requestId: reqA.body.id,
        price: 140000,
        currency: 'USD',
        message: 'BOTH en modo buyer sigue pudiendo ofertar por capacidad.',
        imageUrls: ['/api/uploads/test.jpg'],
      })
      .expect(201);
    expect(offer.body.requestId).toBe(reqA.body.id);

    const ownRequest = await request(app.getHttpServer())
      .post('/api/requests')
      .set(authHeader(both.token))
      .send(autoRequest('BOTH también puede publicar solicitudes.'))
      .expect(201);
    expect(ownRequest.body.id).toBeDefined();
  });

  it('keeps admin out of marketplace chat participation', async () => {
    const admin = await registerUser(app, {
      email: `admin-role-${runId}@test.buyseekk.com`,
      password,
      name: 'Admin',
      role: 'BUYER',
      country: 'US',
    });
    await prisma.user.update({ where: { id: admin.user.id }, data: { role: 'ADMIN' } });

    await request(app.getHttpServer())
      .post('/api/requests')
      .set(authHeader(admin.token))
      .send(autoRequest('Admin no publica como comprador.'))
      .expect(403);
  });
});
