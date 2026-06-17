import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { MAX_UPLOAD_BYTES } from '@buyseekk/shared';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  authHeader,
  createTestApp,
  registerUser,
  resetDatabase,
} from './helpers';

describe('Production readiness (e2e)', () => {
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
      email: `prod-buyer-${suffix}-${runId}@test.buyseekk.com`,
      password,
      name: 'Prod Buyer',
      role: 'BUYER',
      country: 'US',
    });
  }

  async function createSeller(suffix: string) {
    return registerUser(app, {
      email: `prod-seller-${suffix}-${runId}@test.buyseekk.com`,
      password,
      name: 'Prod Seller',
      role: 'SELLER',
      country: 'US',
    });
  }

  async function createAutoRequest(
    token: string,
    requirements: string,
    carBrand = 'Ferrari',
    carModel = '488 GTB',
  ) {
    const res = await request(app.getHttpServer())
      .post('/api/requests')
      .set(authHeader(token))
      .send({
        category: 'AUTOS',
        requirements,
        budget: 200000,
        currency: 'USD',
        location: 'Miami, FL',
        country: 'US',
        carBrand,
        carModel,
        carColor: 'Rosso Corsa',
        carYearMin: 2018,
        maxMileage: 12000,
      })
      .expect(201);
    return res.body.id as string;
  }

  describe('seller marketplace pagination', () => {
    it('paginates and orders active requests before inactive ones', async () => {
      const buyer = await createBuyer('mp');
      const seller = await createSeller('mp');

      const idRecent = await createAutoRequest(buyer.token, 'Busco Ferrari reciente en Miami.');
      const idOlderActive = await createAutoRequest(buyer.token, 'Busco Ferrari activo hace unos días.');
      const idInactive = await createAutoRequest(buyer.token, 'Busco Ferrari inactivo visible.');

      const now = Date.now();
      await prisma.request.update({
        where: { id: idOlderActive },
        data: { lastBuyerActivityAt: new Date(now - 2 * 24 * 60 * 60 * 1000) },
      });
      await prisma.request.update({
        where: { id: idInactive },
        data: {
          lastBuyerActivityAt: new Date(now - 8 * 24 * 60 * 60 * 1000),
          status: 'ACTIVA',
        },
      });

      const page1 = await request(app.getHttpServer())
        .get('/api/requests?page=1&limit=2')
        .set(authHeader(seller.token))
        .expect(200);

      expect(page1.body.items).toHaveLength(2);
      expect(page1.body.total).toBe(3);
      expect(page1.body.page).toBe(1);
      expect(page1.body.limit).toBe(2);
      expect(page1.body.items[0].id).toBe(idRecent);
      expect(page1.body.items[1].id).toBe(idOlderActive);
      expect(page1.body.items[0]).toMatchObject({
        isSaved: false,
        myOffer: null,
        user: expect.objectContaining({
          rating: expect.objectContaining({ reviewCount: expect.any(Number) }),
        }),
      });

      const page2 = await request(app.getHttpServer())
        .get('/api/requests?page=2&limit=2')
        .set(authHeader(seller.token))
        .expect(200);

      expect(page2.body.items).toHaveLength(1);
      expect(page2.body.items[0].id).toBe(idInactive);
      expect(page2.body.items[0].status).toBe('INACTIVA');
    });

    it('filters marketplace by car brand', async () => {
      const buyer = await createBuyer('filter');
      const seller = await createSeller('filter');

      await createAutoRequest(buyer.token, 'Busco Ferrari filtrado.', 'Ferrari', '488 GTB');
      await createAutoRequest(buyer.token, 'Busco Lamborghini filtrado.', 'Lamborghini', 'Huracán');

      const res = await request(app.getHttpServer())
        .get('/api/requests?carBrand=Ferrari')
        .set(authHeader(seller.token))
        .expect(200);

      expect(res.body.total).toBe(1);
      expect(res.body.items[0].carBrand).toBe('Ferrari');
    });

    it('hides requests after the seller sends an offer', async () => {
      const buyer = await createBuyer('offered');
      const seller = await createSeller('offered');

      const requestId = await createAutoRequest(buyer.token, 'Busco Ferrari para ocultar tras oferta.');

      const before = await request(app.getHttpServer())
        .get('/api/requests')
        .set(authHeader(seller.token))
        .expect(200);

      expect(before.body.items.some((r: { id: string }) => r.id === requestId)).toBe(true);

      await request(app.getHttpServer())
        .post('/api/offers')
        .set(authHeader(seller.token))
        .send({
          requestId,
          price: 180000,
          currency: 'USD',
          message: 'Oferta para ocultar del marketplace.',
          imageUrls: ['/api/uploads/e2e-test.jpg'],
        })
        .expect(201);

      const after = await request(app.getHttpServer())
        .get('/api/requests')
        .set(authHeader(seller.token))
        .expect(200);

      expect(after.body.items.some((r: { id: string }) => r.id === requestId)).toBe(false);

      const sent = await request(app.getHttpServer())
        .get('/api/offers/sent')
        .set(authHeader(seller.token))
        .expect(200);

      expect(sent.body.items.some((o: { requestId: string }) => o.requestId === requestId)).toBe(true);
    });
  });

  describe('upload validation', () => {
    const TINY_PNG = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );

    it('accepts a valid image', async () => {
      const seller = await createSeller('upload-valid');

      const res = await request(app.getHttpServer())
        .post('/api/uploads')
        .set(authHeader(seller.token))
        .attach('file', TINY_PNG, {
          filename: 'pixel.png',
          contentType: 'image/png',
        });

      expect(res.status).toBe(201);
      expect(res.body.url).toMatch(/^\/api\/uploads\//);
    });

    it('rejects invalid mime/extension', async () => {
      const seller = await createSeller('upload-bad-type');

      const res = await request(app.getHttpServer())
        .post('/api/uploads')
        .set(authHeader(seller.token))
        .attach('file', Buffer.from('%PDF-1.4 fake'), {
          filename: 'doc.pdf',
          contentType: 'application/pdf',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/JPG|PNG|WebP/i);
    });

    it('rejects spoofed mimetype with non-image content', async () => {
      const seller = await createSeller('upload-spoof');

      const res = await request(app.getHttpServer())
        .post('/api/uploads')
        .set(authHeader(seller.token))
        .attach('file', Buffer.from('plain text, not an image'), {
          filename: 'photo.jpg',
          contentType: 'image/jpeg',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/contenido|JPG|PNG|WebP/i);
    });

    it('rejects valid extension with invalid binary content', async () => {
      const seller = await createSeller('upload-fake-ext');

      const res = await request(app.getHttpServer())
        .post('/api/uploads')
        .set(authHeader(seller.token))
        .attach('file', Buffer.from('<html>not an image</html>'), {
          filename: 'looks-valid.webp',
          contentType: 'image/webp',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/contenido|JPG|PNG|WebP/i);
    });

    it('rejects files larger than 5 MB', async () => {
      const seller = await createSeller('upload-big');

      const oversized = Buffer.alloc(MAX_UPLOAD_BYTES + 1, 1);
      const res = await request(app.getHttpServer())
        .post('/api/uploads')
        .set(authHeader(seller.token))
        .attach('file', oversized, {
          filename: 'big.jpg',
          contentType: 'image/jpeg',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/5 MB/i);
    });
  });

  describe('chat messages pagination', () => {
    it('returns paginated messages with metadata', async () => {
      const buyer = await createBuyer('chat');
      const seller = await createSeller('chat');

      const requestId = await createAutoRequest(buyer.token, 'Busco auto para chat paginado.');

      const offerRes = await request(app.getHttpServer())
        .post('/api/offers')
        .set(authHeader(seller.token))
        .send({
          requestId,
          price: 190000,
          currency: 'USD',
          message: 'Oferta inicial para chat paginado.',
          imageUrls: ['/api/uploads/e2e-test.jpg'],
        })
        .expect(201);

      const acceptRes = await request(app.getHttpServer())
        .patch(`/api/offers/${offerRes.body.id}/accept`)
        .set(authHeader(buyer.token))
        .expect(200);

      const chatId = acceptRes.body.chatId as string;

      for (let i = 1; i <= 12; i += 1) {
        await request(app.getHttpServer())
          .post(`/api/chats/${chatId}/messages`)
          .set(authHeader(i % 2 === 0 ? buyer.token : seller.token))
          .send({ text: `Mensaje paginado ${i}` })
          .expect(201);
      }

      const detail = await request(app.getHttpServer())
        .get(`/api/chats/${chatId}?messagesPage=1&messagesLimit=5`)
        .set(authHeader(buyer.token))
        .expect(200);

      expect(detail.body.messages).toHaveLength(5);
      expect(detail.body.messagesMeta).toMatchObject({
        total: 14,
        page: 1,
        limit: 5,
        hasNextPage: true,
      });
      expect(detail.body.messages[0]).toMatchObject({
        id: expect.any(String),
        text: expect.any(String),
        fromRole: expect.any(String),
      });
    });
  });
});
