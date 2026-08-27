import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { RefreshClientType, SecurityEvent } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { generateSecureToken, hashToken } from '../src/auth/token.util';
import {
  authHeader,
  createTestApp,
  getSetCookieHeaders,
  getVerificationToken,
  loginUser,
  refreshCookieHeader,
  registerUser,
  resetDatabase,
} from './helpers';

describe('Auth mobile transport (e2e)', () => {
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

  async function mobileLogin(
    email: string,
    opts: {
      clientType?: 'IOS' | 'ANDROID';
      deviceId?: string;
      deviceLabel?: string;
    } = {},
  ) {
    const res = await request(app.getHttpServer())
      .post('/api/auth/mobile/login')
      .send({
        email,
        password,
        clientType: opts.clientType ?? 'IOS',
        deviceId: opts.deviceId,
        deviceLabel: opts.deviceLabel,
      })
      .expect(201);

    expect(res.body.token).toBeDefined();
    expect(res.body.user?.id).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(typeof res.body.refreshToken).toBe('string');
    expect(res.body.refreshToken.length).toBeGreaterThan(20);
    expect(getSetCookieHeaders(res).some((c) => c.startsWith('buyseek_refresh='))).toBe(false);

    return res.body as {
      token: string;
      refreshToken: string;
      user: { id: string; email: string };
    };
  }

  it('mobile register returns access + refresh in JSON without Set-Cookie', async () => {
    const email = `mobile-register-${runId}@test.buyseekk.com`;
    const res = await request(app.getHttpServer())
      .post('/api/auth/mobile/register')
      .send({
        email,
        password,
        name: 'Mobile Register',
        role: 'BUYER',
        country: 'US',
        acceptedTerms: true,
        clientType: 'IOS',
        deviceId: 'iphone-reg-1',
        deviceLabel: 'iPhone 15',
      })
      .expect(201);

    expect(res.body.user.emailVerified).toBe(false);
    expect(res.body.token).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(getSetCookieHeaders(res).some((c) => c.startsWith('buyseek_refresh='))).toBe(false);

    const row = await prisma.refreshToken.findUniqueOrThrow({
      where: { tokenHash: hashToken(res.body.refreshToken) },
    });
    expect(row.clientType).toBe(RefreshClientType.IOS);
    expect(row.deviceId).toBe('iphone-reg-1');
    expect(row.deviceLabel).toBe('iPhone 15');

    const tokenRecord = await getVerificationToken(prisma, res.body.user.id);
    expect(tokenRecord).not.toBeNull();
  });

  it('mobile register user can verify email via standard endpoint', async () => {
    const email = `mobile-verify-${runId}@test.buyseekk.com`;
    const res = await request(app.getHttpServer())
      .post('/api/auth/mobile/register')
      .send({
        email,
        password,
        name: 'Verify Mobile',
        role: 'BUYER',
        country: 'US',
        acceptedTerms: true,
        clientType: 'ANDROID',
      })
      .expect(201);

    const tokenRecord = await getVerificationToken(prisma, res.body.user.id);
    expect(tokenRecord).not.toBeNull();

    const plain = generateSecureToken();
    await prisma.emailVerificationToken.update({
      where: { id: tokenRecord!.id },
      data: { tokenHash: hashToken(plain) },
    });

    const verified = await request(app.getHttpServer())
      .post('/api/auth/verify-email')
      .send({ token: plain })
      .expect(201);

    expect(verified.body.user.emailVerified).toBe(true);
    expect(verified.body.user.id).toBe(res.body.user.id);
  });

  it('mobile register rejects duplicate email like web', async () => {
    const email = `mobile-dup-${runId}@test.buyseekk.com`;
    const payload = {
      email,
      password,
      name: 'First',
      role: 'BUYER' as const,
      country: 'US' as const,
      acceptedTerms: true,
      clientType: 'IOS' as const,
    };

    await request(app.getHttpServer()).post('/api/auth/mobile/register').send(payload).expect(201);
    await request(app.getHttpServer()).post('/api/auth/mobile/register').send(payload).expect(409);
  });

  it('mobile register enforces password policy like web', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/mobile/register')
      .send({
        email: `mobile-weak-${runId}@test.buyseekk.com`,
        password: 'short',
        name: 'Weak',
        role: 'BUYER',
        country: 'US',
        acceptedTerms: true,
        clientType: 'IOS',
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: `web-weak-${runId}@test.buyseekk.com`,
        password: 'short',
        name: 'Weak',
        role: 'BUYER',
        country: 'US',
        acceptedTerms: true,
      })
      .expect(400);
  });

  it('web register still sets cookie and omits refreshToken from JSON', async () => {
    const email = `web-register-regression-${runId}@test.buyseekk.com`;
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email,
        password,
        name: 'Web Register',
        role: 'BUYER',
        country: 'US',
        acceptedTerms: true,
      })
      .expect(201);

    expect(res.body.refreshToken).toBeUndefined();
    const cookie = getSetCookieHeaders(res).find((c) => c.startsWith('buyseek_refresh='));
    expect(cookie).toBeDefined();
    expect(cookie).toMatch(/HttpOnly/i);

    const rows = await prisma.refreshToken.findMany({ where: { userId: res.body.user.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0].clientType).toBe(RefreshClientType.WEB);
  });

  it('mobile login returns refreshToken in JSON without Set-Cookie', async () => {
    const email = `mobile-login-${runId}@test.buyseekk.com`;
    await registerUser(app, { email, password, name: 'Mobile', role: 'BUYER', country: 'US' });

    const session = await mobileLogin(email, {
      clientType: 'ANDROID',
      deviceId: 'pixel-test-1',
      deviceLabel: 'Pixel Test',
    });

    const row = await prisma.refreshToken.findUniqueOrThrow({
      where: { tokenHash: hashToken(session.refreshToken) },
    });
    expect(row.clientType).toBe(RefreshClientType.ANDROID);
    expect(row.deviceId).toBe('pixel-test-1');
    expect(row.deviceLabel).toBe('Pixel Test');
  });

  it('rejects WEB clientType on mobile login', async () => {
    const email = `mobile-web-reject-${runId}@test.buyseekk.com`;
    await registerUser(app, { email, password, name: 'Mobile', role: 'BUYER', country: 'US' });

    await request(app.getHttpServer())
      .post('/api/auth/mobile/login')
      .send({ email, password, clientType: 'WEB' })
      .expect(400);
  });

  it('mobile refresh rotates token and invalidates the previous refresh', async () => {
    const email = `mobile-refresh-${runId}@test.buyseekk.com`;
    await registerUser(app, { email, password, name: 'Mobile', role: 'BUYER', country: 'US' });
    const first = await mobileLogin(email);

    const refreshRes = await request(app.getHttpServer())
      .post('/api/auth/mobile/refresh')
      .send({ refreshToken: first.refreshToken })
      .expect(201);

    expect(refreshRes.body.token).toBeDefined();
    expect(refreshRes.body.refreshToken).toBeDefined();
    expect(refreshRes.body.refreshToken).not.toBe(first.refreshToken);
    expect(getSetCookieHeaders(refreshRes).some((c) => c.startsWith('buyseek_refresh='))).toBe(false);

    await request(app.getHttpServer())
      .post('/api/auth/mobile/refresh')
      .send({ refreshToken: first.refreshToken })
      .expect(401);

    const rotated = refreshRes.body.refreshToken as string;
    const oldRow = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(first.refreshToken) },
    });
    expect(oldRow?.revokedAt).not.toBeNull();
    expect(oldRow?.lastUsedAt).not.toBeNull();
  });

  it('mobile logout revokes refresh and is idempotent', async () => {
    const email = `mobile-logout-${runId}@test.buyseekk.com`;
    await registerUser(app, { email, password, name: 'Mobile', role: 'BUYER', country: 'US' });
    const session = await mobileLogin(email);

    await request(app.getHttpServer())
      .post('/api/auth/mobile/logout')
      .send({ refreshToken: session.refreshToken })
      .expect(201)
      .expect({ ok: true });

    await request(app.getHttpServer())
      .post('/api/auth/mobile/refresh')
      .send({ refreshToken: session.refreshToken })
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/auth/mobile/logout')
      .send({ refreshToken: session.refreshToken })
      .expect(201)
      .expect({ ok: true });

    const logs = await prisma.securityLog.findMany({
      where: { userId: session.user.id, event: SecurityEvent.LOGOUT },
    });
    expect(logs.length).toBeGreaterThanOrEqual(1);
  });

  it('rejects invalid and expired mobile refresh tokens', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/mobile/refresh')
      .send({ refreshToken: 'not-a-valid-token' })
      .expect(401);

    const email = `mobile-expired-${runId}@test.buyseekk.com`;
    const auth = await registerUser(app, {
      email,
      password,
      name: 'Mobile',
      role: 'BUYER',
      country: 'US',
    });
    const session = await mobileLogin(email);

    await prisma.refreshToken.update({
      where: { tokenHash: hashToken(session.refreshToken) },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    await request(app.getHttpServer())
      .post('/api/auth/mobile/refresh')
      .send({ refreshToken: session.refreshToken })
      .expect(401);

    expect(auth.refreshToken).toBeDefined();
  });

  it('password reset invalidates mobile refresh tokens', async () => {
    const email = `mobile-reset-${runId}@test.buyseekk.com`;
    await registerUser(app, { email, password, name: 'Mobile', role: 'BUYER', country: 'US' });
    const session = await mobileLogin(email, { clientType: 'IOS' });

    const plain = generateSecureToken();
    await prisma.passwordResetToken.deleteMany({ where: { userId: session.user.id } });
    await prisma.passwordResetToken.create({
      data: {
        userId: session.user.id,
        tokenHash: hashToken(plain),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    await request(app.getHttpServer())
      .post('/api/auth/reset-password')
      .send({ token: plain, password: 'Newpass123' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/auth/mobile/refresh')
      .send({ refreshToken: session.refreshToken })
      .expect(401);
  });

  it('web login still sets HttpOnly cookie and omits refreshToken from JSON', async () => {
    const email = `web-regression-${runId}@test.buyseekk.com`;
    await registerUser(app, { email, password, name: 'Web', role: 'BUYER', country: 'US' });

    const web = await loginUser(app, email, password);
    expect(web.refreshToken).toBeDefined();

    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(201);
    expect(res.body.refreshToken).toBeUndefined();
    const cookie = getSetCookieHeaders(res).find((c) => c.startsWith('buyseek_refresh='));
    expect(cookie).toBeDefined();
    expect(cookie).toMatch(/HttpOnly/i);

    const row = await prisma.refreshToken.findUniqueOrThrow({
      where: { tokenHash: hashToken(web.refreshToken) },
    });
    expect(row.clientType).toBe(RefreshClientType.WEB);
  });

  it('web refresh still requires cookie and rejects body refreshToken', async () => {
    const email = `web-refresh-regression-${runId}@test.buyseekk.com`;
    const auth = await registerUser(app, {
      email,
      password,
      name: 'Web',
      role: 'BUYER',
      country: 'US',
    });

    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: auth.refreshToken })
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set(refreshCookieHeader(auth.refreshToken))
      .expect(201);
  });

  it('mobile refresh does not require TrustedOrigin', async () => {
    const email = `mobile-origin-${runId}@test.buyseekk.com`;
    await registerUser(app, { email, password, name: 'Mobile', role: 'BUYER', country: 'US' });
    const session = await mobileLogin(email);

    await request(app.getHttpServer())
      .post('/api/auth/mobile/refresh')
      .set('Origin', 'https://evil.example')
      .send({ refreshToken: session.refreshToken })
      .expect(201);
  });
});
