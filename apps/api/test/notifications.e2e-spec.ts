import { INestApplication } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { generateSecureToken, hashToken } from '../src/auth/token.util';
import { notificationCopy } from '../src/notifications/notification-copy';
import { notificationEmailPath } from '../src/notifications/notification-channels';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  authHeader,
  createTestApp,
  registerUser,
  resetDatabase,
  ownedTestImageUrl,
} from './helpers';

describe('Notifications (e2e)', () => {
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

  it('creates NEW_OFFER notification for buyer when seller sends offer', async () => {
    const buyer = await registerUser(app, {
      email: `notif-buyer-${runId}@test.buyseekk.com`,
      password,
      name: 'Buyer',
      role: 'BUYER',
      country: 'US',
    });
    const seller = await registerUser(app, {
      email: `notif-seller-${runId}@test.buyseekk.com`,
      password,
      name: 'Seller',
      role: 'SELLER',
      country: 'US',
    });

    const requestRes = await request(app.getHttpServer())
      .post('/api/requests')
      .set(authHeader(buyer.token))
      .send({
        category: 'AUTOS',
        operation: 'COMPRA',
        requirements: 'Busco Ferrari rojo impecable bajo km para notificaciones',
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

    await request(app.getHttpServer())
      .post('/api/offers')
      .set(authHeader(seller.token))
      .send({
        requestId: requestRes.body.id,
        price: 48000,
        currency: 'USD',
        message: 'Oferta con notificación automática incluida.',
        imageUrls: [ownedTestImageUrl(seller.user.id)],
      })
      .expect(201);

    const countRes = await request(app.getHttpServer())
      .get('/api/notifications/unread-count')
      .set(authHeader(buyer.token))
      .expect(200);
    expect(countRes.body.count).toBeGreaterThanOrEqual(1);

    const listRes = await request(app.getHttpServer())
      .get('/api/notifications/recent')
      .set(authHeader(buyer.token))
      .expect(200);
    expect(listRes.body[0].type).toBe('NEW_OFFER');
    expect(listRes.body[0].targetMode).toBe('BUYER');

    await request(app.getHttpServer())
      .patch('/api/notifications/read-all')
      .set(authHeader(buyer.token))
      .expect(200);

    const afterRead = await request(app.getHttpServer())
      .get('/api/notifications/unread-count')
      .set(authHeader(buyer.token))
      .expect(200);
    expect(afterRead.body.count).toBe(0);
  });

  it('creates EMAIL_VERIFIED notification on verify-email', async () => {
    const user = await registerUser(
      app,
      {
        email: `notif-verify-${runId}@test.buyseekk.com`,
        password,
        name: 'Verify User',
        role: 'BUYER',
        country: 'US',
      },
      { verify: false },
    );

    const plain = generateSecureToken();
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.user.id,
        tokenHash: hashToken(plain),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    await request(app.getHttpServer())
      .post('/api/auth/verify-email')
      .send({ token: plain })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get('/api/notifications')
      .set(authHeader(user.token))
      .expect(200);
    expect(res.body.items.some((n: { type: string }) => n.type === 'EMAIL_VERIFIED')).toBe(true);
  });
});

describe('notification email paths', () => {
  it('maps each type to an existing role-appropriate screen', () => {
    expect(notificationEmailPath(NotificationType.NEW_OFFER, 'offer-1')).toBe('/buyer/offers');
    expect(notificationEmailPath(NotificationType.OFFER_ACCEPTED, 'offer-1')).toBe('/seller/offers');
    expect(notificationEmailPath(NotificationType.OFFER_REJECTED, 'offer-1')).toBe('/seller/offers');
    expect(notificationEmailPath(NotificationType.DEAL_COMPLETED, 'chat-1')).toBe('/chats/chat-1');
    expect(notificationEmailPath(NotificationType.NEW_MESSAGE, 'chat-1')).toBe('/chats/chat-1');
    expect(notificationEmailPath(NotificationType.NEW_MESSAGE, null)).toBe('/chats');
    expect(notificationEmailPath(NotificationType.NEW_MATCHING_REQUEST, 'req-1')).toBe(
      '/requests/req-1',
    );
    expect(notificationEmailPath(NotificationType.REQUEST_EXPIRING, 'req-1')).toBe('/buyer?tab=mine');
    expect(notificationEmailPath(NotificationType.REQUEST_INACTIVE, 'req-1')).toBe('/buyer?tab=mine');
    expect(notificationEmailPath(NotificationType.REQUEST_CLOSED, 'req-1')).toBe('/buyer?tab=mine');
    expect(notificationEmailPath(NotificationType.EMAIL_VERIFIED, 'user-1')).toBe('/profile');
  });

  it('never maps marketplace emails to /notifications', () => {
    const types = Object.values(NotificationType);
    for (const type of types) {
      expect(notificationEmailPath(type, 'entity-1')).not.toBe('/notifications');
    }
  });
});

describe('notification copy locale', () => {
  it('uses negotiation wording for OFFER_ACCEPTED and sale wording for DEAL_COMPLETED', () => {
    const acceptedEs = notificationCopy(NotificationType.OFFER_ACCEPTED, 'ES', {
      requestTitle: 'Ferrari 488',
    });
    const acceptedEn = notificationCopy(NotificationType.OFFER_ACCEPTED, 'EN', {
      requestTitle: 'Ferrari 488',
    });
    expect(acceptedEs.title).toBe('Tu oferta fue aceptada');
    expect(acceptedEs.message).toContain('avanzar');
    expect(acceptedEs.message.toLowerCase()).not.toContain('concretada');
    expect(acceptedEn.title).toBe('Your offer was accepted');
    expect(acceptedEn.message.toLowerCase()).not.toContain('completed');

    const dealEs = notificationCopy(NotificationType.DEAL_COMPLETED, 'ES', {
      requestTitle: 'Ferrari 488',
    });
    const dealEn = notificationCopy(NotificationType.DEAL_COMPLETED, 'EN', {
      requestTitle: 'Ferrari 488',
    });
    expect(dealEs.title).toBe('Operación concretada');
    expect(dealEn.title).toBe('Deal completed');
  });

  it('covers critical events in ES and EN', () => {
    const cases: Array<{ type: NotificationType; es: string; en: string }> = [
      { type: NotificationType.NEW_OFFER, es: 'Nueva oferta recibida', en: 'New offer received' },
      { type: NotificationType.OFFER_REJECTED, es: 'Oferta rechazada', en: 'Offer rejected' },
      { type: NotificationType.NEW_MESSAGE, es: 'Nuevo mensaje', en: 'New message' },
      { type: NotificationType.REQUEST_EXPIRING, es: 'Solicitud por vencer', en: 'Request expiring soon' },
      { type: NotificationType.REQUEST_INACTIVE, es: 'Solicitud inactiva', en: 'Request inactive' },
      { type: NotificationType.REQUEST_CLOSED, es: 'Solicitud cerrada', en: 'Request closed' },
      { type: NotificationType.EMAIL_VERIFIED, es: 'Email verificado', en: 'Email verified' },
    ];

    for (const row of cases) {
      expect(notificationCopy(row.type, 'ES', { requestTitle: 'Test', senderName: 'Ana' }).title).toBe(
        row.es,
      );
      expect(notificationCopy(row.type, 'EN', { requestTitle: 'Test', senderName: 'Ana' }).title).toBe(
        row.en,
      );
    }

    const matchingEs = notificationCopy(NotificationType.NEW_MATCHING_REQUEST, 'ES', {
      requestTitle: 'Ferrari 488',
      location: 'Miami, FL',
      category: 'AUTOS',
      carBrand: 'Ferrari',
      carModel: '488 GTB',
    });
    const matchingEn = notificationCopy(NotificationType.NEW_MATCHING_REQUEST, 'EN', {
      requestTitle: 'Ferrari 488',
      location: 'Miami, FL',
      category: 'AUTOS',
      carBrand: 'Ferrari',
      carModel: '488 GTB',
    });
    expect(matchingEs.title).toContain('Nueva alerta');
    expect(matchingEn.title).toContain('New alert');
  });
});
