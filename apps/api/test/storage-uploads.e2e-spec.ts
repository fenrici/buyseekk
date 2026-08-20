import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { MAX_IMAGES_PER_ENTITY, MAX_UPLOAD_BYTES } from '@buyseekk/shared';
import { PrismaService } from '../src/prisma/prisma.service';
import { StorageObjectsService } from '../src/storage/storage-objects.service';
import { StorageService } from '../src/storage/storage.interface';
import {
  extractObjectKeyFromUrl,
  ownedObjectKeyForUser,
} from '../src/storage/storage-keys';
import { authHeader, createTestApp, registerUser, resetDatabase } from './helpers';

const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

function autoRequest(requirements: string, imageUrls?: string[]) {
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
    ...(imageUrls ? { imageUrls } : {}),
  };
}

describe('Storage and uploads (e2e)', () => {
  const runId = Date.now();
  const password = 'Testpass123';

  describe('with local storage', () => {
    let app: INestApplication<App>;
    let prisma: PrismaService;

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

    it('stores owned UUID keys and ignores original filename path traversal', async () => {
      const user = await registerUser(app, {
        email: `up-own-${runId}@test.buyseekk.com`,
        password,
        name: 'Uploader',
        role: 'BUYER',
        country: 'US',
      });

      const res = await request(app.getHttpServer())
        .post('/api/uploads')
        .set(authHeader(user.token))
        .attach('file', TINY_PNG, { filename: '../../../etc/passwd.jpg', contentType: 'image/png' })
        .expect(201);

      expect(res.body.url).toMatch(new RegExp(`^/api/uploads/${user.user.id}/[0-9a-f-]{36}\\.png$`));
      expect(res.body.url).not.toContain('..');
      expect(ownedObjectKeyForUser(extractObjectKeyFromUrl(res.body.url)!, user.user.id)).toBe(true);
    });

    it('rejects new legacy unscoped URLs on attach', async () => {
      const user = await registerUser(app, {
        email: `up-leg-${runId}@test.buyseekk.com`,
        password,
        name: 'Legacy',
        role: 'BUYER',
        country: 'US',
      });
      const legacyUrl = `/api/uploads/${Date.now()}-legacy.png`;

      await request(app.getHttpServer())
        .post('/api/requests')
        .set(authHeader(user.token))
        .send(autoRequest('Intento adjuntar URL legacy nueva.', [legacyUrl]))
        .expect(400);

      await request(app.getHttpServer())
        .patch('/api/users/me')
        .set(authHeader(user.token))
        .send({ avatarUrl: legacyUrl })
        .expect(400);
    });

    it('preserves an existing legacy URL on request edit but rejects new legacy URLs', async () => {
      const user = await registerUser(app, {
        email: `up-leg-edit-${runId}@test.buyseekk.com`,
        password,
        name: 'LegacyEdit',
        role: 'BUYER',
        country: 'US',
      });
      const legacyUrl = `/api/uploads/${Date.now()}-existing.png`;
      const otherLegacy = `/api/uploads/${Date.now()}-other.png`;

      const seeded = await prisma.request.create({
        data: {
          userId: user.user.id,
          category: 'AUTOS',
          title: 'Legacy request',
          requirements: 'Solicitud histórica con URL legacy ya guardada.',
          budget: 150000,
          currency: 'USD',
          location: 'Miami, FL',
          country: 'US',
          imageUrls: [legacyUrl],
          carBrand: 'Ferrari',
          carModel: '488 GTB',
          carColor: 'Rosso Corsa',
          carYearMin: 2018,
          maxMileage: 15000,
        },
      });

      await request(app.getHttpServer())
        .patch(`/api/requests/${seeded.id}`)
        .set(authHeader(user.token))
        .send({ imageUrls: [legacyUrl] })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/requests/${seeded.id}`)
        .set(authHeader(user.token))
        .send({ imageUrls: [otherLegacy] })
        .expect(400);
    });

    it('rejects spoofed mime, html content, external URLs and oversized files', async () => {
      const user = await registerUser(app, {
        email: `up-bad-${runId}@test.buyseekk.com`,
        password,
        name: 'Uploader',
        role: 'BUYER',
        country: 'US',
      });

      await request(app.getHttpServer())
        .post('/api/uploads')
        .set(authHeader(user.token))
        .attach('file', Buffer.from('<html>nope</html>'), { filename: 'x.jpg', contentType: 'image/jpeg' })
        .expect(400);

      await request(app.getHttpServer())
        .post('/api/uploads')
        .set(authHeader(user.token))
        .attach('file', Buffer.alloc(MAX_UPLOAD_BYTES + 1, 1), { filename: 'big.jpg', contentType: 'image/jpeg' })
        .expect(400);

      await request(app.getHttpServer())
        .post('/api/requests')
        .set(authHeader(user.token))
        .send(autoRequest('Busco Ferrari con URL externa de prueba.', ['https://evil.example/photo.jpg']))
        .expect(400);
    });

    it('rejects attaching another user owned image and IDOR edits', async () => {
      const owner = await registerUser(app, {
        email: `up-a-${runId}@test.buyseekk.com`,
        password,
        name: 'Owner',
        role: 'BUYER',
        country: 'US',
      });
      const other = await registerUser(app, {
        email: `up-b-${runId}@test.buyseekk.com`,
        password,
        name: 'Other',
        role: 'BUYER',
        country: 'US',
      });

      const uploaded = await request(app.getHttpServer())
        .post('/api/uploads')
        .set(authHeader(owner.token))
        .attach('file', TINY_PNG, { filename: 'car.png', contentType: 'image/png' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/requests')
        .set(authHeader(other.token))
        .send(autoRequest('Intento usar foto ajena en mi solicitud.', [uploaded.body.url]))
        .expect(400);

      const created = await request(app.getHttpServer())
        .post('/api/requests')
        .set(authHeader(owner.token))
        .send(autoRequest('Solicitud del owner para IDOR de imágenes.', [uploaded.body.url]))
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/requests/${created.body.id}`)
        .set(authHeader(other.token))
        .send({ imageUrls: [] })
        .expect(403);
    });

    it('does not delete images on request soft-delete', async () => {
      const user = await registerUser(app, {
        email: `up-soft-${runId}@test.buyseekk.com`,
        password,
        name: 'Soft',
        role: 'BUYER',
        country: 'US',
      });
      const uploaded = await request(app.getHttpServer())
        .post('/api/uploads')
        .set(authHeader(user.token))
        .attach('file', TINY_PNG, { filename: 'keep.png', contentType: 'image/png' })
        .expect(201);

      const created = await request(app.getHttpServer())
        .post('/api/requests')
        .set(authHeader(user.token))
        .send(autoRequest('Solicitud para soft-delete conservando fotos.', [uploaded.body.url]))
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/api/requests/${created.body.id}`)
        .set(authHeader(user.token))
        .expect(200);

      const stored = await prisma.request.findUnique({ where: { id: created.body.id } });
      expect(stored?.active).toBe(false);
      expect(stored?.imageUrls).toEqual([uploaded.body.url]);
    });
  });

  describe('mocked storage compensation', () => {
    let app: INestApplication<App>;
    let prisma: PrismaService;
    const deleted: string[] = [];
    let failUpload = false;
    let failDelete = false;

    const storage: StorageService = {
      getAllowedUrlPrefixes: () => ['/api/uploads/'],
      async upload(_buffer, ext, _contentType, ownerUserId) {
        if (failUpload) throw new Error('r2 down');
        return `/api/uploads/${ownerUserId}/${randomUUID()}${ext}`;
      },
      async deleteObject(key) {
        if (failDelete) throw new Error('r2 delete down');
        deleted.push(key);
      },
    };

    beforeAll(async () => {
      app = await createTestApp({ storage });
      prisma = app.get(PrismaService);
    });

    beforeEach(async () => {
      await resetDatabase(prisma);
      deleted.length = 0;
      failUpload = false;
      failDelete = false;
    });

    afterAll(async () => {
      await app.close();
    });

    it('does not return a URL when the provider fails', async () => {
      failUpload = true;
      const user = await registerUser(app, {
        email: `up-fail-${runId}@test.buyseekk.com`,
        password,
        name: 'Fail',
        role: 'BUYER',
        country: 'US',
      });

      const res = await request(app.getHttpServer())
        .post('/api/uploads')
        .set(authHeader(user.token))
        .attach('file', TINY_PNG, { filename: 'car.png', contentType: 'image/png' });

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body.url).toBeUndefined();
    });

    it('cleans up owned objects if DB create fails after images are attached', async () => {
      const user = await registerUser(app, {
        email: `up-comp-${runId}@test.buyseekk.com`,
        password,
        name: 'Comp',
        role: 'BUYER',
        country: 'US',
      });
      const url = `/api/uploads/${user.user.id}/${randomUUID()}.png`;
      const objects = app.get(StorageObjectsService);

      await expect(
        objects.withCreateCompensation([url], user.user.id, async () => {
          throw new Error('db down');
        }),
      ).rejects.toThrow('db down');

      expect(deleted).toContain(extractObjectKeyFromUrl(url));
    });

    it('does not delete storage when the same owned image is still referenced elsewhere', async () => {
      const buyer = await registerUser(app, {
        email: `up-ref-req-${runId}@test.buyseekk.com`,
        password,
        name: 'BuyerRef',
        role: 'BUYER',
        country: 'US',
      });
      const shared = `/api/uploads/${buyer.user.id}/${randomUUID()}.png`;

      const reqA = await request(app.getHttpServer())
        .post('/api/requests')
        .set(authHeader(buyer.token))
        .send(autoRequest('Solicitud A con imagen compartida.', [shared]))
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/requests')
        .set(authHeader(buyer.token))
        .send(autoRequest('Solicitud B con la misma imagen compartida.', [shared]))
        .expect(201);

      deleted.length = 0;
      await request(app.getHttpServer())
        .patch(`/api/requests/${reqA.body.id}`)
        .set(authHeader(buyer.token))
        .send({ imageUrls: [] })
        .expect(200);

      expect(deleted).not.toContain(extractObjectKeyFromUrl(shared));
    });

    it('does not delete storage when replacing avatar still referenced on a request', async () => {
      const user = await registerUser(app, {
        email: `up-ref-av-${runId}@test.buyseekk.com`,
        password,
        name: 'AvatarRef',
        role: 'BUYER',
        country: 'US',
      });
      const shared = `/api/uploads/${user.user.id}/${randomUUID()}.png`;

      await request(app.getHttpServer())
        .patch('/api/users/me')
        .set(authHeader(user.token))
        .send({ avatarUrl: shared })
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/requests')
        .set(authHeader(user.token))
        .send(autoRequest('Solicitud que reutiliza la misma imagen del avatar.', [shared]))
        .expect(201);

      deleted.length = 0;
      const nextAvatar = `/api/uploads/${user.user.id}/${randomUUID()}.png`;
      await request(app.getHttpServer())
        .patch('/api/users/me')
        .set(authHeader(user.token))
        .send({ avatarUrl: nextAvatar })
        .expect(200);

      expect(deleted).not.toContain(extractObjectKeyFromUrl(shared));
    });

    it('does not delete storage on create compensation when URL is already referenced', async () => {
      const user = await registerUser(app, {
        email: `up-ref-comp-${runId}@test.buyseekk.com`,
        password,
        name: 'CompRef',
        role: 'BUYER',
        country: 'US',
      });
      const shared = `/api/uploads/${user.user.id}/${randomUUID()}.png`;

      await request(app.getHttpServer())
        .post('/api/requests')
        .set(authHeader(user.token))
        .send(autoRequest('Solicitud existente con imagen reutilizable.', [shared]))
        .expect(201);

      deleted.length = 0;
      const objects = app.get(StorageObjectsService);
      await expect(
        objects.withCreateCompensation([shared], user.user.id, async () => {
          throw new Error('db down');
        }),
      ).rejects.toThrow('db down');

      expect(deleted).not.toContain(extractObjectKeyFromUrl(shared));
    });

    it('deletes storage when the last reference is removed', async () => {
      const buyer = await registerUser(app, {
        email: `up-ref-last-${runId}@test.buyseekk.com`,
        password,
        name: 'LastRef',
        role: 'BUYER',
        country: 'US',
      });
      const only = `/api/uploads/${buyer.user.id}/${randomUUID()}.png`;

      const created = await request(app.getHttpServer())
        .post('/api/requests')
        .set(authHeader(buyer.token))
        .send(autoRequest('Solicitud con única referencia a la imagen.', [only]))
        .expect(201);

      deleted.length = 0;
      await request(app.getHttpServer())
        .patch(`/api/requests/${created.body.id}`)
        .set(authHeader(buyer.token))
        .send({ imageUrls: [] })
        .expect(200);

      expect(deleted).toContain(extractObjectKeyFromUrl(only));
    });

    it('keeps the avatar update if delete of the old object fails', async () => {
      const user = await registerUser(app, {
        email: `up-av-${runId}@test.buyseekk.com`,
        password,
        name: 'Avatar',
        role: 'BUYER',
        country: 'US',
      });

      const first = `/api/uploads/${user.user.id}/${randomUUID()}.png`;
      await request(app.getHttpServer())
        .patch('/api/users/me')
        .set(authHeader(user.token))
        .send({ avatarUrl: first })
        .expect(200);

      failDelete = true;
      const second = `/api/uploads/${user.user.id}/${randomUUID()}.png`;
      const res = await request(app.getHttpServer())
        .patch('/api/users/me')
        .set(authHeader(user.token))
        .send({ avatarUrl: second })
        .expect(200);

      expect(res.body.avatarUrl).toBe(second);
      const stored = await prisma.user.findUnique({ where: { id: user.user.id } });
      expect(stored?.avatarUrl).toBe(second);
    });

    it('removes replaced request images best-effort and keeps offer history images', async () => {
      const buyer = await registerUser(app, {
        email: `up-req-${runId}@test.buyseekk.com`,
        password,
        name: 'Buyer',
        role: 'BUYER',
        country: 'US',
      });
      const seller = await registerUser(app, {
        email: `up-sel-${runId}@test.buyseekk.com`,
        password,
        name: 'Seller',
        role: 'SELLER',
        country: 'US',
      });

      const first = `/api/uploads/${buyer.user.id}/${randomUUID()}.png`;
      const created = await request(app.getHttpServer())
        .post('/api/requests')
        .set(authHeader(buyer.token))
        .send(autoRequest('Solicitud para reemplazar fotos del comprador.', [first]))
        .expect(201);

      const second = `/api/uploads/${buyer.user.id}/${randomUUID()}.png`;
      await request(app.getHttpServer())
        .patch(`/api/requests/${created.body.id}`)
        .set(authHeader(buyer.token))
        .send({ imageUrls: [second] })
        .expect(200);

      expect(deleted).toContain(extractObjectKeyFromUrl(first));

      const offerUrl = `/api/uploads/${seller.user.id}/${randomUUID()}.png`;
      await request(app.getHttpServer())
        .post('/api/offers')
        .set(authHeader(seller.token))
        .send({
          requestId: created.body.id,
          price: 140000,
          currency: 'USD',
          message: 'Oferta con fotos que deben conservarse en el historial.',
          imageUrls: [offerUrl],
        })
        .expect(201);

      const before = deleted.length;
      await request(app.getHttpServer())
        .delete(`/api/requests/${created.body.id}`)
        .set(authHeader(buyer.token))
        .expect(200);
      expect(deleted.length).toBe(before);
    });

    it('rejects more images than the entity limit', async () => {
      const user = await registerUser(app, {
        email: `up-lim-${runId}@test.buyseekk.com`,
        password,
        name: 'Limit',
        role: 'BUYER',
        country: 'US',
      });
      const urls = Array.from({ length: MAX_IMAGES_PER_ENTITY + 1 }, () => `/api/uploads/test-${randomUUID()}.jpg`);
      await request(app.getHttpServer())
        .post('/api/requests')
        .set(authHeader(user.token))
        .send(autoRequest('Solicitud con demasiadas imágenes para el límite.', urls))
        .expect(400);
    });
  });
});
