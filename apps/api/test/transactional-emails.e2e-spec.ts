import { INestApplication } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { EmailProviderError, EmailService } from '../src/auth/email.service';
import { escapeHtml } from '../src/common/utils/escape-html';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  authHeader,
  createTestApp,
  registerUser,
  resetDatabase,
  ownedTestImageUrl,
} from './helpers';

type SentEmail = { to: string; subject: string; text: string; html: string };

describe('escapeHtml', () => {
  it('escapes user-controlled characters so they cannot render as HTML', () => {
    const raw = `<script>alert(1)</script> <b>bold</b> & " ' <>`;
    const escaped = escapeHtml(raw);
    expect(escaped).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt; &lt;b&gt;bold&lt;/b&gt; &amp; &quot; &#39; &lt;&gt;',
    );
    expect(escaped).not.toContain('<script');
    expect(escaped).not.toContain('<b>');
  });
});

describe('Transactional emails (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let email: EmailService;
  const runId = Date.now();
  const password = 'testpass123';
  let seq = 0;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    email = app.get(EmailService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  function nextId() {
    seq += 1;
    return `${runId.toString(36)}${seq.toString(36)}`;
  }

  function spySend(impl?: (payload: SentEmail) => Promise<void>) {
    return jest.spyOn(email, 'send').mockImplementation(async (payload) => {
      if (impl) await impl(payload);
    });
  }

  async function createBuyer(label = 'buyer') {
    return registerUser(app, {
      email: `${label}-${nextId()}@test.buyseekk.com`,
      password,
      name: `Buyer ${label}`,
      role: 'BUYER',
      country: 'US',
    });
  }

  async function createSeller(label = 'seller') {
    return registerUser(app, {
      email: `${label}-${nextId()}@test.buyseekk.com`,
      password,
      name: `Seller ${label}`,
      role: 'SELLER',
      country: 'US',
    });
  }

  async function createRequest(token: string) {
    const unique = nextId();
    const res = await request(app.getHttpServer())
      .post('/api/requests')
      .set(authHeader(token))
      .send({
        category: 'AUTOS',
        requirements: `Busco deportivo para emails transaccionales. Caso ${unique}.`,
        budget: 200000,
        currency: 'USD',
        location: 'Miami, FL',
        country: 'US',
        carBrand: 'Ferrari',
        carModel: '488 GTB',
        carColor: 'Rosso Corsa',
        carYearMin: 2018,
        maxMileage: 15000,
      })
      .expect(201);
    return res.body as { id: string };
  }

  async function createOffer(seller: Awaited<ReturnType<typeof createSeller>>, requestId: string) {
    const res = await request(app.getHttpServer())
      .post('/api/offers')
      .set(authHeader(seller.token))
      .send({
        requestId,
        price: 190000,
        currency: 'USD',
        message: 'Oferta con fotos del auto y disponibilidad inmediata.',
        imageUrls: [ownedTestImageUrl(seller.user.id)],
      })
      .expect(201);
    return res.body as { id: string };
  }

  it('does not fail register or forgot-password when the email provider is down', async () => {
    spySend(async () => {
      throw new EmailProviderError('Resend down');
    });

    const emailAddr = `reg-fail-${nextId()}@test.buyseekk.com`;
    const registered = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: emailAddr,
        password,
        name: 'Email Fail',
        role: 'BUYER',
        country: 'US',
        acceptedTerms: true,
      })
      .expect(201);

    expect(registered.body.token).toBeDefined();
    const tokens = await prisma.emailVerificationToken.findMany({
      where: { userId: registered.body.user.id },
    });
    expect(tokens).toHaveLength(1);

    const forgotUnknown = await request(app.getHttpServer())
      .post('/api/auth/forgot-password')
      .send({ email: `missing-${nextId()}@test.buyseekk.com` })
      .expect(201);
    const forgotKnown = await request(app.getHttpServer())
      .post('/api/auth/forgot-password')
      .send({ email: emailAddr })
      .expect(201);
    expect(forgotUnknown.body).toEqual({ ok: true });
    expect(forgotKnown.body).toEqual({ ok: true });

    const resetTokens = await prisma.passwordResetToken.findMany({
      where: { userId: registered.body.user.id },
    });
    expect(resetTokens).toHaveLength(1);
  });

  it('keeps offer create, accept, complete and message when email delivery fails', async () => {
    spySend(async () => {
      throw new EmailProviderError('Resend down');
    });

    const buyer = await createBuyer();
    const seller = await createSeller();
    const created = await createRequest(buyer.token);
    const offer = await createOffer(seller, created.id);

    const storedOffer = await prisma.offer.findUniqueOrThrow({ where: { id: offer.id } });
    expect(storedOffer.requestId).toBe(created.id);

    const acceptRes = await request(app.getHttpServer())
      .patch(`/api/offers/${offer.id}/accept`)
      .set(authHeader(buyer.token))
      .expect(200);

    const chatId = acceptRes.body.chat?.id ?? acceptRes.body.chatId;
    expect(chatId).toBeDefined();

    await request(app.getHttpServer())
      .patch(`/api/offers/${offer.id}/complete`)
      .set(authHeader(buyer.token))
      .expect(200);

    const completed = await prisma.offer.findUniqueOrThrow({ where: { id: offer.id } });
    expect(completed.dealCompletedAt).not.toBeNull();

    const buyer2 = await createBuyer('buyer2');
    const seller2 = await createSeller('seller2');
    const req2 = await createRequest(buyer2.token);
    const offer2 = await createOffer(seller2, req2.id);
    const accept2 = await request(app.getHttpServer())
      .patch(`/api/offers/${offer2.id}/accept`)
      .set(authHeader(buyer2.token))
      .expect(200);
    const chat2 = accept2.body.chat?.id ?? accept2.body.chatId;

    await request(app.getHttpServer())
      .post(`/api/chats/${chat2}/messages`)
      .set(authHeader(buyer2.token))
      .send({ text: 'Hola, podemos coordinar una visita esta semana?' })
      .expect(201);

    const messages = await prisma.message.findMany({ where: { chatId: chat2 } });
    expect(messages.some((m) => m.text.includes('visita'))).toBe(true);
  });

  it('does not email the sender and suppresses repeat NEW_MESSAGE emails in a short window', async () => {
    const sent: SentEmail[] = [];
    spySend(async (payload) => {
      sent.push(payload);
    });

    const buyer = await createBuyer();
    const seller = await createSeller();
    const created = await createRequest(buyer.token);
    const offer = await createOffer(seller, created.id);
    const acceptRes = await request(app.getHttpServer())
      .patch(`/api/offers/${offer.id}/accept`)
      .set(authHeader(buyer.token))
      .expect(200);
    const chatId = acceptRes.body.chat?.id ?? acceptRes.body.chatId;

    sent.length = 0;

    await request(app.getHttpServer())
      .post(`/api/chats/${chatId}/messages`)
      .set(authHeader(buyer.token))
      .send({ text: 'Primer mensaje para coordinar disponibilidad del auto.' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/chats/${chatId}/messages`)
      .set(authHeader(buyer.token))
      .send({ text: 'Segundo mensaje seguido en la misma conversación activa.' })
      .expect(201);

    const messageEmails = sent.filter((row) => row.subject === 'New message');
    expect(messageEmails).toHaveLength(1);
    expect(messageEmails[0].to).toBe(seller.user.email);
    expect(messageEmails[0].text).toContain(`/chats/${chatId}`);

    const inApp = await prisma.notification.findMany({
      where: { userId: seller.user.id, type: NotificationType.NEW_MESSAGE, entityId: chatId },
    });
    expect(inApp.length).toBeGreaterThanOrEqual(2);

    const buyerNotifs = await prisma.notification.findMany({
      where: { userId: buyer.user.id, type: NotificationType.NEW_MESSAGE },
    });
    expect(buyerNotifs).toHaveLength(0);
  });

  it('does not duplicate accept or deal-completed notifications on retries', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const created = await createRequest(buyer.token);
    const offer = await createOffer(seller, created.id);

    const acceptRes = await request(app.getHttpServer())
      .patch(`/api/offers/${offer.id}/accept`)
      .set(authHeader(buyer.token))
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/api/offers/${offer.id}/accept`)
      .set(authHeader(buyer.token))
      .expect(200);

    const accepted = await prisma.notification.findMany({
      where: { userId: seller.user.id, type: NotificationType.OFFER_ACCEPTED, entityId: offer.id },
    });
    expect(accepted).toHaveLength(1);

    const chatId = acceptRes.body.chat?.id ?? acceptRes.body.chatId;

    await request(app.getHttpServer())
      .patch(`/api/offers/${offer.id}/complete`)
      .set(authHeader(buyer.token))
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/api/offers/${offer.id}/complete`)
      .set(authHeader(buyer.token))
      .expect(200);

    const deals = await prisma.notification.findMany({
      where: { userId: seller.user.id, type: NotificationType.DEAL_COMPLETED },
    });
    expect(deals).toHaveLength(1);
    expect(deals[0].entityId).toBe(chatId);
  });

  it('does not create a second verification token accidentally on register', async () => {
    const emailAddr = `one-token-${nextId()}@test.buyseekk.com`;
    const registered = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: emailAddr,
        password,
        name: 'One Token',
        role: 'BUYER',
        country: 'US',
        acceptedTerms: true,
      })
      .expect(201);

    const tokens = await prisma.emailVerificationToken.findMany({
      where: { userId: registered.body.user.id },
    });
    expect(tokens).toHaveLength(1);
  });

  it('keeps offer create successful when notification persistence fails after commit', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const created = await createRequest(buyer.token);

    const persist = jest
      .spyOn(prisma.notification, 'create')
      .mockRejectedValue(new Error('notification persist failed'));

    const offerRes = await request(app.getHttpServer())
      .post('/api/offers')
      .set(authHeader(seller.token))
      .send({
        requestId: created.id,
        price: 190000,
        currency: 'USD',
        message: 'Oferta persistida aunque falle la notificación posterior.',
        imageUrls: [ownedTestImageUrl(seller.user.id)],
      })
      .expect(201);

    persist.mockRestore();

    const stored = await prisma.offer.findUniqueOrThrow({ where: { id: offerRes.body.id } });
    expect(stored.requestId).toBe(created.id);
    expect(stored.sellerId).toBe(seller.user.id);
  });

  it('escapes user content in notification HTML and keeps auth URLs usable', async () => {
    const sent: SentEmail[] = [];
    spySend(async (payload) => {
      sent.push(payload);
    });

    const xssName = `Sam <script>alert(1)</script> <b>x</b> & " ' <>`;
    const buyer = await registerUser(app, {
      email: `xss-buyer-${nextId()}@test.buyseekk.com`,
      password,
      name: xssName,
      role: 'BUYER',
      country: 'US',
    });
    const seller = await createSeller('xss-seller');
    const created = await createRequest(buyer.token);
    const offer = await createOffer(seller, created.id);
    const acceptRes = await request(app.getHttpServer())
      .patch(`/api/offers/${offer.id}/accept`)
      .set(authHeader(buyer.token))
      .expect(200);
    const chatId = acceptRes.body.chat?.id ?? acceptRes.body.chatId;

    sent.length = 0;
    await request(app.getHttpServer())
      .post(`/api/chats/${chatId}/messages`)
      .set(authHeader(buyer.token))
      .send({ text: 'Mensaje para validar escape HTML en el email.' })
      .expect(201);

    const messageEmail = sent.find((row) => row.subject === 'New message');
    expect(messageEmail).toBeDefined();
    expect(messageEmail!.html).not.toContain('<script');
    expect(messageEmail!.html).not.toContain('<b>x</b>');
    expect(messageEmail!.html).toContain('&lt;script&gt;');
    expect(messageEmail!.html).toContain('&lt;b&gt;x&lt;/b&gt;');
    expect(messageEmail!.html).toContain('&amp;');
    expect(messageEmail!.html).toContain('&quot;');
    expect(messageEmail!.html).toContain('&#39;');
    expect(messageEmail!.text).toContain(xssName);
    expect(messageEmail!.html).toContain(`href="http://localhost:3000/chats/${chatId}"`);

    const verifyUrl = 'https://app.example.com/verify-email?token=abc123&next=/buyer';
    const verify = email.buildVerificationEmail(verifyUrl, 'EN');
    expect(verify.text).toContain(verifyUrl);
    expect(verify.html).toContain('href="https://app.example.com/verify-email?token=abc123&amp;next=/buyer"');
    expect(verify.html).not.toContain('href="https://app.example.com/verify-email?token=abc123&next=/buyer"');

    const resetUrl = 'https://app.example.com/reset-password?token=def456&next=/login';
    const reset = email.buildPasswordResetEmail(resetUrl, 'ES');
    expect(reset.text).toContain(resetUrl);
    expect(reset.html).toContain('href="https://app.example.com/reset-password?token=def456&amp;next=/login"');
  });
});
