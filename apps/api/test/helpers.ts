import { CanActivate, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
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
  return app;
}

export async function resetDatabase(prisma: PrismaService) {
  await prisma.message.deleteMany();
  await prisma.chat.deleteMany();
  await prisma.rating.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.request.deleteMany();
  await prisma.user.deleteMany();
}

type AuthResponse = { token: string; user: { id: string; email: string } };

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
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
): Promise<AuthResponse> {
  const body = { ...payload };
  if (body.role === 'SELLER' || body.role === 'BOTH') {
    if (!body.sellerType) body.sellerType = 'BUSINESS';
    if (!body.sellerCategory) body.sellerCategory = 'AUTOS';
  }
  const res = await request(app.getHttpServer())
    .post('/api/auth/register')
    .send(body)
    .expect(201);
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
