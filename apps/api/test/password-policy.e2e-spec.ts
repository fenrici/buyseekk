import { INestApplication } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { App } from 'supertest/types';
import { Country, Currency, Locale, UserMode, UserRole } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { hashToken } from '../src/auth/token.util';
import {
  createTestApp,
  loginUser,
  registerUser,
  resetDatabase,
} from './helpers';

describe('Password policy (e2e)', () => {
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

  function registerPayload(email: string, pwd: string) {
    return {
      email,
      password: pwd,
      name: 'Policy Test',
      role: 'BUYER',
      country: 'US',
      acceptedTerms: true,
    };
  }

  it('rejects passwords shorter than 8 characters on register', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(registerPayload(`short-${runId}@test.buyseekk.com`, 'Short1a'))
      .expect(400);
    expect(res.body.message).toEqual(
      expect.arrayContaining([expect.stringContaining('requisitos')]),
    );
  });

  it('rejects passwords without uppercase on register', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(registerPayload(`noupper-${runId}@test.buyseekk.com`, 'alllower1'))
      .expect(400);
  });

  it('rejects passwords without lowercase on register', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(registerPayload(`nolower-${runId}@test.buyseekk.com`, 'ALLUPPER1'))
      .expect(400);
  });

  it('rejects passwords without a number on register', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(registerPayload(`nonumber-${runId}@test.buyseekk.com`, 'NoNumberHere'))
      .expect(400);
  });

  it('accepts valid passwords on register', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(registerPayload(`valid-${runId}@test.buyseekk.com`, 'ValidPass1'))
      .expect(201);
  });

  it('accepts valid passwords with optional special characters on register', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(registerPayload(`special-${runId}@test.buyseekk.com`, 'ValidPass1!'))
      .expect(201);
  });

  it('allows legacy users with weak stored passwords to log in', async () => {
    const email = `legacy-${runId}@test.buyseekk.com`;
    const legacyPassword = 'weak';
    const passwordHash = await bcrypt.hash(legacyPassword, 10);
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: 'Legacy User',
        role: UserRole.BUYER,
        activeMode: UserMode.BUYER,
        preferredMode: UserMode.BUYER,
        country: Country.US,
        locale: Locale.ES,
        currency: Currency.USD,
        emailVerified: true,
      },
    });

    await loginUser(app, email, legacyPassword);
  });

  it('applies the same policy on reset-password', async () => {
    const email = `reset-policy-${runId}@test.buyseekk.com`;
    const auth = await registerUser(app, {
      email,
      password,
      name: 'Reset Policy',
      role: 'BUYER',
      country: 'US',
    });

    const plain = 'reset-token-plain';
    await prisma.passwordResetToken.create({
      data: {
        userId: auth.user.id,
        tokenHash: hashToken(plain),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    await request(app.getHttpServer())
      .post('/api/auth/reset-password')
      .send({ token: plain, password: 'alllower1' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/auth/reset-password')
      .send({ token: plain, password: 'BrandNew1' })
      .expect(201);

    await loginUser(app, email, 'BrandNew1');
  });
});
