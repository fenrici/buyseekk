import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { SecurityEvent } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { generateSecureToken, hashToken } from '../src/auth/token.util';
import {
  authHeader,
  createTestApp,
  getVerificationToken,
  loginUser,
  registerUser,
  resetDatabase,
  verifyUserEmail,
} from './helpers';

describe('Auth security (e2e)', () => {
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

  it('register creates unverified user and verification token', async () => {
    const email = `reg-${runId}@test.buyseekk.com`;
    const res = await registerUser(
      app,
      { email, password, name: 'New User', role: 'BUYER', country: 'US' },
      { verify: false },
    );

    expect(res.user.emailVerified).toBe(false);
    expect(res.token).toBeDefined();
    expect(res.refreshToken).toBeDefined();

    const tokenRecord = await getVerificationToken(prisma, res.user.id);
    expect(tokenRecord).not.toBeNull();

    const logs = await prisma.securityLog.findMany({
      where: { userId: res.user.id, event: SecurityEvent.USER_REGISTERED },
    });
    expect(logs).toHaveLength(1);
  });

  it('blocks unverified user from creating requests, offers, and chat messages', async () => {
    const buyerEmail = `buyer-unv-${runId}@test.buyseekk.com`;
    const sellerEmail = `seller-unv-${runId}@test.buyseekk.com`;

    const buyer = await registerUser(
      app,
      { email: buyerEmail, password, name: 'Buyer', role: 'BUYER', country: 'US' },
      { verify: false },
    );
    const seller = await registerUser(
      app,
      { email: sellerEmail, password, name: 'Seller', role: 'SELLER', country: 'US' },
      { verify: false },
    );

    await verifyUserEmail(prisma, buyer.user.id);

    const requestRes = await request(app.getHttpServer())
      .post('/api/requests')
      .set(authHeader(buyer.token))
      .send({
        category: 'AUTOS',
        operation: 'COMPRA',
        requirements: 'Need a car',
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
        message: 'Great offer with photos included.',
        imageUrls: ['/api/uploads/test.jpg'],
      })
      .expect(403);

    await verifyUserEmail(prisma, seller.user.id);
    const offerRes = await request(app.getHttpServer())
      .post('/api/offers')
      .set(authHeader(seller.token))
      .send({
        requestId: requestRes.body.id,
        price: 48000,
        currency: 'USD',
        message: 'Great offer with photos included.',
        imageUrls: ['/api/uploads/test.jpg'],
      })
      .expect(201);

    const acceptRes = await request(app.getHttpServer())
      .patch(`/api/offers/${offerRes.body.id}/accept`)
      .set(authHeader(buyer.token))
      .expect(200);

    const chatId = acceptRes.body.chat?.id ?? acceptRes.body.chatId;
    expect(chatId).toBeDefined();

    await prisma.user.update({
      where: { id: buyer.user.id },
      data: { emailVerified: false },
    });

    await request(app.getHttpServer())
      .post(`/api/chats/${chatId}/messages`)
      .set(authHeader(buyer.token))
      .send({ text: 'Hello' })
      .expect(403);
  });

  it('verifies email with valid token and rejects expired token', async () => {
    const email = `verify-${runId}@test.buyseekk.com`;
    const registered = await registerUser(
      app,
      { email, password, name: 'Verify Me', role: 'BUYER', country: 'US' },
      { verify: false },
    );

    const plain = generateSecureToken();
    await prisma.emailVerificationToken.create({
      data: {
        userId: registered.user.id,
        tokenHash: hashToken(plain),
        expiresAt: new Date(Date.now() - 1000),
      },
    });

    await request(app.getHttpServer())
      .post('/api/auth/verify-email')
      .send({ token: plain })
      .expect(400);

    const validPlain = generateSecureToken();
    await prisma.emailVerificationToken.deleteMany({ where: { userId: registered.user.id } });
    await prisma.emailVerificationToken.create({
      data: {
        userId: registered.user.id,
        tokenHash: hashToken(validPlain),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    const verifyRes = await request(app.getHttpServer())
      .post('/api/auth/verify-email')
      .send({ token: validPlain })
      .expect(201);

    expect(verifyRes.body.user.emailVerified).toBe(true);

    const logs = await prisma.securityLog.findMany({
      where: { userId: registered.user.id, event: SecurityEvent.EMAIL_VERIFIED },
    });
    expect(logs).toHaveLength(1);
  });

  it('login logs success and failure', async () => {
    const email = `login-${runId}@test.buyseekk.com`;
    await registerUser(app, { email, password, name: 'Login User', role: 'BUYER', country: 'US' });

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: 'wrong' })
      .expect(401);

    const failedLogs = await prisma.securityLog.findMany({
      where: { event: SecurityEvent.LOGIN_FAILED },
    });
    expect(failedLogs.length).toBeGreaterThanOrEqual(1);

    await loginUser(app, email, password);
    const successLogs = await prisma.securityLog.findMany({
      where: { event: SecurityEvent.LOGIN_SUCCESS },
    });
    expect(successLogs.length).toBeGreaterThanOrEqual(1);
  });

  it('refresh token rotates session and logout revokes it', async () => {
    const email = `refresh-${runId}@test.buyseekk.com`;
    const auth = await registerUser(app, {
      email,
      password,
      name: 'Refresh User',
      role: 'BUYER',
      country: 'US',
    });

    const refreshRes = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: auth.refreshToken })
      .expect(201);

    expect(refreshRes.body.token).toBeDefined();
    expect(refreshRes.body.refreshToken).not.toBe(auth.refreshToken);

    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: auth.refreshToken })
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .send({ refreshToken: refreshRes.body.refreshToken })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: refreshRes.body.refreshToken })
      .expect(401);

    const logoutLogs = await prisma.securityLog.findMany({
      where: { event: SecurityEvent.LOGOUT },
    });
    expect(logoutLogs.length).toBeGreaterThanOrEqual(1);
  });

  it('password reset flow works and invalidates refresh tokens', async () => {
    const email = `reset-${runId}@test.buyseekk.com`;
    const auth = await registerUser(app, {
      email,
      password,
      name: 'Reset User',
      role: 'BUYER',
      country: 'US',
    });

    await request(app.getHttpServer())
      .post('/api/auth/forgot-password')
      .send({ email })
      .expect(201);

    const plain = generateSecureToken();
    await prisma.passwordResetToken.deleteMany({ where: { userId: auth.user.id } });
    await prisma.passwordResetToken.create({
      data: {
        userId: auth.user.id,
        tokenHash: hashToken(plain),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    await request(app.getHttpServer())
      .post('/api/auth/reset-password')
      .send({ token: plain, password: 'newpass123' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/auth/reset-password')
      .send({ token: plain, password: 'anotherpass' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: auth.refreshToken })
      .expect(401);

    const loginRes = await loginUser(app, email, 'newpass123');
    expect(loginRes.token).toBeDefined();

    const changeLogs = await prisma.securityLog.findMany({
      where: { userId: auth.user.id, event: SecurityEvent.PASSWORD_CHANGED },
    });
    expect(changeLogs).toHaveLength(1);
  });
});
