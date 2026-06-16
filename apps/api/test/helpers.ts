import { CanActivate, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { registerMulterErrorHandler } from '../src/uploads/multer-exception.filter';
import { hashToken } from '../src/auth/token.util';
import { PrismaService } from '../src/prisma/prisma.service';

export async function createTestApp(): Promise<INestApplication<App>> {
  const allowAll: CanActivate = { canActivate: () => true };
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(APP_GUARD)
    .useValue(allowAll)
    .compile();

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

  return res.body;
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
  return res.body;
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
  // Tests cannot reverse hash; callers should use verify endpoint with token from email logs
  // or create token via API and read from DB using a known plain token in security tests.
  return record.tokenHash;
}

export { hashToken };
