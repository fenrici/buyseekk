import { CanActivate, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { registerMulterErrorHandler } from '../src/uploads/multer-exception.filter';
import { REFRESH_COOKIE_NAME } from '../src/auth/refresh-cookie';
import { hashToken } from '../src/auth/token.util';
import { PrismaService } from '../src/prisma/prisma.service';
import { STORAGE_SERVICE, StorageService } from '../src/storage/storage.interface';

export { REFRESH_COOKIE_NAME };

export async function createTestApp(options?: {
  storage?: StorageService;
}): Promise<INestApplication<App>> {
  const allowAll: CanActivate = { canActivate: () => true };
  let builder = Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(APP_GUARD)
    .useValue(allowAll);

  if (options?.storage) {
    builder = builder.overrideProvider(STORAGE_SERVICE).useValue(options.storage);
  }

  const moduleRef = await builder.compile();

  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  registerMulterErrorHandler(app);
  return app;
}

/** App con ThrottlerGuard real (para tests de 429). */
export async function createThrottledTestApp(): Promise<INestApplication<App>> {
  process.env.ENABLE_THROTTLE_IN_TEST = '1';
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  registerMulterErrorHandler(app);
  return app;
}

export async function resetDatabase(prisma: PrismaService) {
  await prisma.securityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.chat.deleteMany();
  await prisma.rating.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.savedRequest.deleteMany();
  await prisma.savedSearch.deleteMany();
  await prisma.request.deleteMany();
  await prisma.emailVerificationToken.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
}

type AuthResponse = {
  token: string;
  refreshToken: string;
  user: { id: string; email: string; emailVerified?: boolean };
};

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export function ownedTestImageUrl(userId: string, ext = 'jpg'): string {
  return `/api/uploads/${userId}/${randomUUID()}.${ext}`;
}

export function getSetCookieHeaders(res: { headers: Record<string, unknown> }): string[] {
  const raw = res.headers['set-cookie'];
  if (!raw) return [];
  return Array.isArray(raw) ? raw.map(String) : [String(raw)];
}

export function extractRefreshTokenFromResponse(res: { headers: Record<string, unknown> }): string {
  const line = getSetCookieHeaders(res).find((cookie) => cookie.startsWith(`${REFRESH_COOKIE_NAME}=`));
  if (!line) {
    throw new Error('Missing refresh cookie');
  }
  const value = line.split(';')[0].slice(REFRESH_COOKIE_NAME.length + 1);
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function refreshCookieHeader(token: string) {
  return { Cookie: `${REFRESH_COOKIE_NAME}=${encodeURIComponent(token)}` };
}

export function authFromResponse(res: { body: AuthResponse; headers: Record<string, unknown> }): AuthResponse {
  expect(res.body.refreshToken).toBeUndefined();
  return {
    token: res.body.token,
    user: res.body.user,
    refreshToken: extractRefreshTokenFromResponse(res),
  };
}

export async function verifyUserEmail(prisma: PrismaService, userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { emailVerified: true, emailVerifiedAt: new Date() },
  });
}

export async function getVerificationToken(prisma: PrismaService, userId: string) {
  const record = await prisma.emailVerificationToken.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  return record;
}

export async function registerUser(
  app: INestApplication<App>,
  payload: {
    email: string;
    password: string;
    name: string;
    role: 'BUYER' | 'SELLER' | 'BOTH';
    country: 'AR' | 'US';
    sellerType?: 'PERSONAL' | 'BUSINESS';
    sellerCategory?: 'AUTOS' | 'INMOBILIARIA';
  },
  options: { verify?: boolean } = { verify: true },
): Promise<AuthResponse> {
  const body = { acceptedTerms: true, ...payload };
  if (body.role === 'SELLER' || body.role === 'BOTH') {
    if (!body.sellerType) body.sellerType = 'BUSINESS';
    if (!body.sellerCategory) body.sellerCategory = 'AUTOS';
  }
  const res = await request(app.getHttpServer())
    .post('/api/auth/register')
    .send(body)
    .expect(201);

  if (options.verify !== false) {
    const prisma = app.get(PrismaService);
    await verifyUserEmail(prisma, res.body.user.id);
  }

  return authFromResponse(res);
}

export async function loginUser(
  app: INestApplication<App>,
  email: string,
  password: string,
): Promise<AuthResponse> {
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password })
    .expect(201);
  return authFromResponse(res);
}

export async function getPasswordResetTokenPlain(
  prisma: PrismaService,
  userId: string,
): Promise<string | null> {
  const record = await prisma.passwordResetToken.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  if (!record) return null;
  return record.tokenHash;
}

export { hashToken };
