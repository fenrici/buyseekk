import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { SecurityEvent } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { generateSecureToken, hashToken } from '../src/auth/token.util';
import {
  authHeader,
  createTestApp,
  extractRefreshTokenFromResponse,
  getSetCookieHeaders,
  getVerificationToken,
  loginUser,
  refreshCookieHeader,
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
      .set(refreshCookieHeader(auth.refreshToken))
      .expect(201);

    expect(refreshRes.body.token).toBeDefined();
    expect(refreshRes.body.refreshToken).toBeUndefined();
    const rotated = extractRefreshTokenFromResponse(refreshRes);
    expect(rotated).not.toBe(auth.refreshToken);

    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set(refreshCookieHeader(auth.refreshToken))
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set(refreshCookieHeader(rotated))
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set(refreshCookieHeader(rotated))
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
      .set(refreshCookieHeader(auth.refreshToken))
      .expect(401);

    const loginRes = await loginUser(app, email, 'newpass123');
    expect(loginRes.token).toBeDefined();

    const changeLogs = await prisma.securityLog.findMany({
      where: { userId: auth.user.id, event: SecurityEvent.PASSWORD_CHANGED },
    });
    expect(changeLogs).toHaveLength(1);
  });

  it('rejects invalid and already-used verification tokens', async () => {
    const email = `verify-reuse-${runId}@test.buyseekk.com`;
    const registered = await registerUser(
      app,
      { email, password, name: 'Reuse Verify', role: 'BUYER', country: 'US' },
      { verify: false },
    );

    await request(app.getHttpServer())
      .post('/api/auth/verify-email')
      .send({ token: 'not-a-real-token-value' })
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

    await request(app.getHttpServer())
      .post('/api/auth/verify-email')
      .send({ token: validPlain })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/auth/verify-email')
      .send({ token: validPlain })
      .expect(400);

    const leftover = await prisma.emailVerificationToken.findMany({
      where: { userId: registered.user.id },
    });
    expect(leftover).toHaveLength(0);
  });

  it('treats already-verified users as success without leaking extra data', async () => {
    const email = `already-${runId}@test.buyseekk.com`;
    const registered = await registerUser(
      app,
      { email, password, name: 'Already Verified', role: 'BUYER', country: 'US' },
      { verify: false },
    );

    const plain = generateSecureToken();
    await prisma.emailVerificationToken.deleteMany({ where: { userId: registered.user.id } });
    await prisma.emailVerificationToken.create({
      data: {
        userId: registered.user.id,
        tokenHash: hashToken(plain),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    await prisma.user.update({
      where: { id: registered.user.id },
      data: { emailVerified: true, emailVerifiedAt: new Date() },
    });

    const res = await request(app.getHttpServer())
      .post('/api/auth/verify-email')
      .send({ token: plain })
      .expect(201);

    expect(res.body.alreadyVerified).toBe(true);
    expect(res.body.user.emailVerified).toBe(true);
    expect(res.body.user.passwordHash).toBeUndefined();

    const leftover = await prisma.emailVerificationToken.findMany({
      where: { userId: registered.user.id },
    });
    expect(leftover).toHaveLength(0);
  });

  it('resend verification invalidates previous tokens and rejects if already verified', async () => {
    const email = `resend-${runId}@test.buyseekk.com`;
    const registered = await registerUser(
      app,
      { email, password, name: 'Resend User', role: 'BUYER', country: 'US' },
      { verify: false },
    );

    const first = await getVerificationToken(prisma, registered.user.id);
    expect(first).not.toBeNull();

    await request(app.getHttpServer())
      .post('/api/auth/resend-verification')
      .set(authHeader(registered.token))
      .expect(201);

    const afterResend = await prisma.emailVerificationToken.findMany({
      where: { userId: registered.user.id },
    });
    expect(afterResend).toHaveLength(1);
    expect(afterResend[0].tokenHash).not.toBe(first!.tokenHash);
    expect(afterResend[0].expiresAt.getTime()).toBeGreaterThan(Date.now());

    await verifyUserEmail(prisma, registered.user.id);

    await request(app.getHttpServer())
      .post('/api/auth/resend-verification')
      .set(authHeader(registered.token))
      .expect(400);
  });

  it('forgot-password returns the same public body whether the email exists or not', async () => {
    const existingEmail = `forgot-known-${runId}@test.buyseekk.com`;
    const unknownEmail = `forgot-unknown-${runId}@test.buyseekk.com`;
    const auth = await registerUser(app, {
      email: existingEmail,
      password,
      name: 'Forgot User',
      role: 'BUYER',
      country: 'US',
    });

    const unknownRes = await request(app.getHttpServer())
      .post('/api/auth/forgot-password')
      .send({ email: unknownEmail })
      .expect(201);

    const knownRes = await request(app.getHttpServer())
      .post('/api/auth/forgot-password')
      .send({ email: existingEmail })
      .expect(201);

    expect(unknownRes.body).toEqual({ ok: true });
    expect(knownRes.body).toEqual({ ok: true });
    expect(unknownRes.body).toEqual(knownRes.body);

    const unknownUser = await prisma.user.findUnique({ where: { email: unknownEmail } });
    expect(unknownUser).toBeNull();

    const tokens = await prisma.passwordResetToken.findMany({ where: { userId: auth.user.id } });
    expect(tokens).toHaveLength(1);
    expect(tokens[0].usedAt).toBeNull();
    expect(tokens[0].expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('reset-password rejects expired tokens and old password after a valid reset', async () => {
    const email = `reset-exp-${runId}@test.buyseekk.com`;
    const auth = await registerUser(app, {
      email,
      password,
      name: 'Reset Expired',
      role: 'BUYER',
      country: 'US',
    });

    const expiredPlain = generateSecureToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: auth.user.id,
        tokenHash: hashToken(expiredPlain),
        expiresAt: new Date(Date.now() - 1000),
      },
    });

    await request(app.getHttpServer())
      .post('/api/auth/reset-password')
      .send({ token: expiredPlain, password: 'newpass123' })
      .expect(400);

    const validPlain = generateSecureToken();
    await prisma.passwordResetToken.deleteMany({ where: { userId: auth.user.id } });
    await prisma.passwordResetToken.create({
      data: {
        userId: auth.user.id,
        tokenHash: hashToken(validPlain),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    await request(app.getHttpServer())
      .post('/api/auth/reset-password')
      .send({ token: validPlain, password: 'brandnew123' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(401);

    await loginUser(app, email, 'brandnew123');

    const remaining = await prisma.refreshToken.findMany({
      where: { userId: auth.user.id, revokedAt: null },
    });
    expect(remaining.every((row) => row.tokenHash !== hashToken(auth.refreshToken))).toBe(true);
  });

  it('sets HttpOnly refresh cookie and omits refreshToken from JSON', async () => {
    const email = `cookie-${runId}@test.buyseekk.com`;
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email,
        password,
        name: 'Cookie User',
        role: 'BUYER',
        country: 'US',
        acceptedTerms: true,
      })
      .expect(201);

    expect(res.body.refreshToken).toBeUndefined();
    expect(res.body.token).toBeDefined();
    const cookie = getSetCookieHeaders(res).find((c) => c.startsWith('buyseek_refresh='));
    expect(cookie).toBeDefined();
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Path=\/api\/auth/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).not.toMatch(/Secure/i);
  });

  it('canonicalizes email case on register, login and forgot-password', async () => {
    const mixed = `Franco.Case-${runId}@Email.com`;
    const lower = mixed.trim().toLowerCase();
    const registered = await registerUser(app, {
      email: mixed,
      password,
      name: 'Case User',
      role: 'BUYER',
      country: 'US',
    });
    expect(registered.user.email).toBe(lower);

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: lower,
        password,
        name: 'Dup',
        role: 'BUYER',
        country: 'US',
        acceptedTerms: true,
      })
      .expect(409);

    const login = await loginUser(app, mixed.toUpperCase(), password);
    expect(login.user.id).toBe(registered.user.id);

    await request(app.getHttpServer())
      .post('/api/auth/forgot-password')
      .send({ email: mixed.toUpperCase() })
      .expect(201);

    const tokens = await prisma.passwordResetToken.findMany({ where: { userId: registered.user.id } });
    expect(tokens).toHaveLength(1);
  });

  it('rejects ADMIN role on public register', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: `admin-try-${runId}@test.buyseekk.com`,
        password,
        name: 'Nope',
        role: 'ADMIN',
        country: 'US',
        acceptedTerms: true,
      })
      .expect(400);
  });

  it('rejects refresh without cookie even if body contains a token', async () => {
    const auth = await registerUser(app, {
      email: `body-refresh-${runId}@test.buyseekk.com`,
      password,
      name: 'Body Refresh',
      role: 'BUYER',
      country: 'US',
    });

    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: auth.refreshToken })
      .expect(401);
  });

  it('logout is idempotent and clears the refresh cookie', async () => {
    const auth = await registerUser(app, {
      email: `logout-${runId}@test.buyseekk.com`,
      password,
      name: 'Logout User',
      role: 'BUYER',
      country: 'US',
    });

    const first = await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set(refreshCookieHeader(auth.refreshToken))
      .expect(201);
    expect(first.body).toEqual({ ok: true });
    const cleared = getSetCookieHeaders(first).find((c) => c.startsWith('buyseek_refresh='));
    expect(cleared).toBeDefined();
    expect(cleared).toMatch(/Max-Age=0|Expires=/i);

    const second = await request(app.getHttpServer()).post('/api/auth/logout').expect(201);
    expect(second.body).toEqual({ ok: true });
  });

  it('blocked and suspended accounts cannot use me or refresh', async () => {
    const blocked = await registerUser(app, {
      email: `blocked-${runId}@test.buyseekk.com`,
      password,
      name: 'Blocked',
      role: 'BUYER',
      country: 'US',
    });
    const suspended = await registerUser(app, {
      email: `suspended-${runId}@test.buyseekk.com`,
      password,
      name: 'Suspended',
      role: 'BUYER',
      country: 'US',
    });

    await prisma.user.update({
      where: { id: blocked.user.id },
      data: { blocked: true, blockedReason: 'abuso' },
    });
    await prisma.user.update({
      where: { id: suspended.user.id },
      data: { suspended: true },
    });

    const blockedMe = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set(authHeader(blocked.token))
      .expect(403);
    expect(blockedMe.body.code).toBe('ACCOUNT_BLOCKED');
    expect(blockedMe.body.passwordHash).toBeUndefined();

    const suspendedMe = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set(authHeader(suspended.token))
      .expect(403);
    expect(suspendedMe.body.code).toBe('ACCOUNT_SUSPENDED');

    const blockedRefresh = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set(refreshCookieHeader(blocked.refreshToken))
      .expect(403);
    expect(blockedRefresh.body.code).toBe('ACCOUNT_BLOCKED');

    const suspendedRefresh = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set(refreshCookieHeader(suspended.refreshToken))
      .expect(403);
    expect(suspendedRefresh.body.code).toBe('ACCOUNT_SUSPENDED');
  });

  it('rejects untrusted Origin on cookie refresh', async () => {
    const auth = await registerUser(app, {
      email: `origin-${runId}@test.buyseekk.com`,
      password,
      name: 'Origin User',
      role: 'BUYER',
      country: 'US',
    });

    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set(refreshCookieHeader(auth.refreshToken))
      .set('Origin', 'https://evil.example')
      .expect(403);
  });
});

