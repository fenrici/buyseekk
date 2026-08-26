import { CanActivate, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import {
  stripeCheckoutIdempotencyKey,
  stripeCustomerIdempotencyKey,
} from '../src/billing/billing.config';
import { BillingService } from '../src/billing/billing.service';
import { StripeBillingFatalError } from '../src/billing/stripe/stripe-billing.errors';
import {
  STRIPE_BILLING_PROVIDER,
  type CreateStripeCheckoutSessionInput,
  type CreateStripeCustomerInput,
  type StripeBillingProvider,
} from '../src/billing/stripe/stripe-billing.provider';
import { configureApp } from '../src/bootstrap';
import { PrismaService } from '../src/prisma/prisma.service';
import { registerMulterErrorHandler } from '../src/uploads/multer-exception.filter';
import { authHeader, registerUser, resetDatabase } from './helpers';

type MockStripe = StripeBillingProvider & {
  createCustomerCalls: number;
  createCheckoutCalls: number;
  lastCustomerInput: CreateStripeCustomerInput | null;
  lastCheckoutInput: CreateStripeCheckoutSessionInput | null;
  customersByKey: Map<string, string>;
  checkoutsByKey: Map<string, { id: string; url: string; expiresAtUnix: number }>;
  failNextCheckout?: Error | null;
  failCheckoutTimes?: number;
};

function createMockStripe(): MockStripe {
  const mock: MockStripe = {
    createCustomerCalls: 0,
    createCheckoutCalls: 0,
    lastCustomerInput: null,
    lastCheckoutInput: null,
    customersByKey: new Map(),
    checkoutsByKey: new Map(),
    failNextCheckout: null,
    failCheckoutTimes: 0,
    async createCustomer(input) {
      mock.createCustomerCalls += 1;
      mock.lastCustomerInput = input;
      const existing = mock.customersByKey.get(input.idempotencyKey);
      if (existing) return { id: existing };
      const id = `cus_mock_${mock.customersByKey.size + 1}_${input.userId.slice(-6)}`;
      mock.customersByKey.set(input.idempotencyKey, id);
      return { id };
    },
    async createCheckoutSession(input) {
      mock.createCheckoutCalls += 1;
      mock.lastCheckoutInput = input;
      if (mock.failNextCheckout && (mock.failCheckoutTimes ?? 0) > 0) {
        mock.failCheckoutTimes! -= 1;
        const err = mock.failNextCheckout;
        if (mock.failCheckoutTimes === 0) mock.failNextCheckout = null;
        throw err;
      }
      const existing = mock.checkoutsByKey.get(input.idempotencyKey);
      if (existing) {
        return {
          id: existing.id,
          url: existing.url,
          expiresAtUnix: existing.expiresAtUnix,
        };
      }
      const id = `cs_mock_${mock.checkoutsByKey.size + 1}`;
      const expiresAtUnix = Math.floor(Date.now() / 1000) + 60 * 60;
      const result = {
        id,
        url: `https://checkout.stripe.com/c/pay/${id}`,
        expiresAtUnix,
      };
      mock.checkoutsByKey.set(input.idempotencyKey, result);
      return result;
    },
  };
  return mock;
}

async function createBillingTestApp(options: {
  stripe?: MockStripe;
  env?: Record<string, string | undefined>;
}): Promise<{ app: INestApplication<App>; stripe: MockStripe }> {
  const previous: Record<string, string | undefined> = {};
  const env = {
    STRIPE_BILLING_ENABLED: 'true',
    STRIPE_SECRET_KEY: 'sk_test_mock',
    STRIPE_PRICE_PLUS_MONTHLY: 'price_plus_monthly_test',
    WEB_URL: 'http://localhost:3000',
    PLUS_FEATURES_UNLOCKED: 'false',
    ...options.env,
  };
  for (const [key, value] of Object.entries(env)) {
    previous[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  const stripe = options.stripe ?? createMockStripe();
  const allowAll: CanActivate = { canActivate: () => true };
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(APP_GUARD)
    .useValue(allowAll)
    .overrideProvider(STRIPE_BILLING_PROVIDER)
    .useValue(stripe)
    .compile();

  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  registerMulterErrorHandler(app);

  const originalClose = app.close.bind(app);
  app.close = async () => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    return originalClose();
  };

  return { app, stripe };
}

describe('Billing Stripe Checkout (e2e)', () => {
  const runId = Date.now();
  const password = 'Testpass123';

  it('returns BILLING_UNAVAILABLE when Stripe billing is disabled', async () => {
    const { app } = await createBillingTestApp({
      env: {
        STRIPE_BILLING_ENABLED: 'false',
        STRIPE_SECRET_KEY: undefined,
        STRIPE_PRICE_PLUS_MONTHLY: undefined,
      },
    });
    const prisma = app.get(PrismaService);
    await resetDatabase(prisma);

    try {
      const user = await registerUser(app, {
        email: `billing-off-${runId}@test.buyseekk.com`,
        password,
        name: 'Billing Off',
        role: 'SELLER',
        country: 'US',
      });

      const res = await request(app.getHttpServer())
        .post('/api/billing/checkout')
        .set(authHeader(user.token))
        .send({})
        .expect(503);

      expect(JSON.stringify(res.body)).toMatch(/BILLING_UNAVAILABLE|unavailable/i);
    } finally {
      await app.close();
    }
  });

  it('creates Stripe Customer + Checkout and reuses OPEN checkout on second request', async () => {
    const stripe = createMockStripe();
    const { app } = await createBillingTestApp({ stripe });
    const prisma = app.get(PrismaService);
    await resetDatabase(prisma);

    try {
      const user = await registerUser(app, {
        email: `billing-free-${runId}@test.buyseekk.com`,
        password,
        name: 'Billing Free',
        role: 'SELLER',
        country: 'US',
      });

      const first = await request(app.getHttpServer())
        .post('/api/billing/checkout')
        .set(authHeader(user.token))
        .send({})
        .expect(201);

      expect(first.body.url).toMatch(/^https:\/\/checkout\.stripe\.com\//);
      expect(stripe.createCustomerCalls).toBe(1);
      expect(stripe.createCheckoutCalls).toBe(1);
      expect(stripe.lastCustomerInput?.idempotencyKey).toBe(
        stripeCustomerIdempotencyKey(user.user.id),
      );
      expect(stripe.lastCheckoutInput?.idempotencyKey).toMatch(/^billing-checkout:/);
      expect(stripe.lastCheckoutInput?.priceId).toBe('price_plus_monthly_test');

      const second = await request(app.getHttpServer())
        .post('/api/billing/checkout')
        .set(authHeader(user.token))
        .send({})
        .expect(201);

      expect(second.body.url).toBe(first.body.url);
      expect(second.body.sessionId).toBe(first.body.sessionId);
      expect(stripe.createCustomerCalls).toBe(1);
      expect(stripe.createCheckoutCalls).toBe(1);

      expect(await prisma.subscription.count({ where: { userId: user.user.id } })).toBe(0);
      const me = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set(authHeader(user.token))
        .expect(200);
      expect(me.body.subscriptionPlan).toBe('FREE');
    } finally {
      await app.close();
    }
  });

  it('uses stable customer idempotency key and one BillingCustomer under concurrency', async () => {
    const stripe = createMockStripe();
    const { app } = await createBillingTestApp({ stripe });
    const prisma = app.get(PrismaService);
    await resetDatabase(prisma);
    const billing = app.get(BillingService);

    try {
      const user = await registerUser(app, {
        email: `billing-race-cus-${runId}@test.buyseekk.com`,
        password,
        name: 'Billing Race Cus',
        role: 'SELLER',
        country: 'US',
      });

      const [a, b] = await Promise.all([
        billing.getOrCreateStripeCustomer({
          id: user.user.id,
          email: user.user.email,
          name: 'Billing Race Cus',
        }),
        billing.getOrCreateStripeCustomer({
          id: user.user.id,
          email: user.user.email,
          name: 'Billing Race Cus',
        }),
      ]);

      expect(a.providerCustomerId).toBe(b.providerCustomerId);
      expect(stripe.customersByKey.size).toBe(1);
      expect(stripe.customersByKey.get(stripeCustomerIdempotencyKey(user.user.id))).toBe(
        a.providerCustomerId,
      );
      expect(
        await prisma.billingCustomer.count({
          where: { userId: user.user.id, provider: 'STRIPE' },
        }),
      ).toBe(1);

      const other = await registerUser(app, {
        email: `billing-other-cus-${runId}@test.buyseekk.com`,
        password,
        name: 'Other User',
        role: 'SELLER',
        country: 'US',
      });
      const otherCustomer = await billing.getOrCreateStripeCustomer({
        id: other.user.id,
        email: other.user.email,
        name: 'Other User',
      });
      expect(otherCustomer.providerCustomerId).not.toBe(a.providerCustomerId);
      expect(stripe.customersByKey.size).toBe(2);
    } finally {
      await app.close();
    }
  });

  it('concurrent checkout requests share one OPEN Stripe Checkout Session', async () => {
    const stripe = createMockStripe();
    const { app } = await createBillingTestApp({ stripe });
    const prisma = app.get(PrismaService);
    await resetDatabase(prisma);

    try {
      const user = await registerUser(app, {
        email: `billing-race-co-${runId}@test.buyseekk.com`,
        password,
        name: 'Billing Race Co',
        role: 'SELLER',
        country: 'US',
      });

      const [a, b] = await Promise.all([
        request(app.getHttpServer())
          .post('/api/billing/checkout')
          .set(authHeader(user.token))
          .send({}),
        request(app.getHttpServer())
          .post('/api/billing/checkout')
          .set(authHeader(user.token))
          .send({}),
      ]);

      expect(a.status).toBe(201);
      expect(b.status).toBe(201);
      expect(a.body.url).toBe(b.body.url);
      expect(a.body.sessionId).toBe(b.body.sessionId);
      expect(stripe.checkoutsByKey.size).toBe(1);
      expect(stripe.createCheckoutCalls).toBeGreaterThanOrEqual(1);
      // Stripe idempotency may be hit twice; still one logical session.
      expect(stripe.checkoutsByKey.size).toBe(1);

      const openRows = await prisma.billingCheckoutSession.findMany({
        where: { userId: user.user.id, status: 'OPEN' },
      });
      expect(openRows).toHaveLength(1);
      expect(openRows[0].providerSessionId).toBe(a.body.sessionId);
      expect(openRows[0].checkoutUrl).toBe(a.body.url);
      expect(stripeCheckoutIdempotencyKey(openRows[0].id)).toBe(
        stripe.lastCheckoutInput?.idempotencyKey,
      );
    } finally {
      await app.close();
    }
  });

  it('allows a new Checkout after the OPEN session expires', async () => {
    const stripe = createMockStripe();
    const { app } = await createBillingTestApp({ stripe });
    const prisma = app.get(PrismaService);
    await resetDatabase(prisma);

    try {
      const user = await registerUser(app, {
        email: `billing-exp-${runId}@test.buyseekk.com`,
        password,
        name: 'Billing Exp',
        role: 'SELLER',
        country: 'US',
      });

      const first = await request(app.getHttpServer())
        .post('/api/billing/checkout')
        .set(authHeader(user.token))
        .send({})
        .expect(201);

      await prisma.billingCheckoutSession.updateMany({
        where: { userId: user.user.id, status: 'OPEN' },
        data: { expiresAt: new Date('2020-01-01T00:00:00.000Z') },
      });

      const second = await request(app.getHttpServer())
        .post('/api/billing/checkout')
        .set(authHeader(user.token))
        .send({})
        .expect(201);

      expect(second.body.sessionId).not.toBe(first.body.sessionId);
      expect(second.body.url).not.toBe(first.body.url);
      expect(stripe.checkoutsByKey.size).toBe(2);

      const statuses = await prisma.billingCheckoutSession.findMany({
        where: { userId: user.user.id },
        select: { status: true },
      });
      expect(statuses.filter((s) => s.status === 'EXPIRED')).toHaveLength(1);
      expect(statuses.filter((s) => s.status === 'OPEN')).toHaveLength(1);
    } finally {
      await app.close();
    }
  });

  it('rejects checkout when user already has Plus entitlement', async () => {
    const stripe = createMockStripe();
    const { app } = await createBillingTestApp({ stripe });
    const prisma = app.get(PrismaService);
    await resetDatabase(prisma);

    try {
      const user = await registerUser(app, {
        email: `billing-plus-${runId}@test.buyseekk.com`,
        password,
        name: 'Billing Plus',
        role: 'SELLER',
        country: 'US',
      });

      await prisma.subscription.create({
        data: {
          userId: user.user.id,
          provider: 'STRIPE',
          providerSubscriptionId: `sub_active_billing_${runId}`,
          status: 'ACTIVE',
          currentPeriodEnd: new Date('2099-01-01T00:00:00.000Z'),
        },
      });

      await request(app.getHttpServer())
        .post('/api/billing/checkout')
        .set(authHeader(user.token))
        .send({})
        .expect(409);

      expect(stripe.createCustomerCalls).toBe(0);
      expect(stripe.createCheckoutCalls).toBe(0);
    } finally {
      await app.close();
    }
  });

  it('allows checkout with stale User.subscriptionPlan=PLUS and no entitlement', async () => {
    const stripe = createMockStripe();
    const { app } = await createBillingTestApp({ stripe });
    const prisma = app.get(PrismaService);
    await resetDatabase(prisma);

    try {
      const user = await registerUser(app, {
        email: `billing-stale-${runId}@test.buyseekk.com`,
        password,
        name: 'Billing Stale',
        role: 'SELLER',
        country: 'US',
      });

      await prisma.user.update({
        where: { id: user.user.id },
        data: { subscriptionPlan: 'PLUS' },
      });

      const res = await request(app.getHttpServer())
        .post('/api/billing/checkout')
        .set(authHeader(user.token))
        .send({})
        .expect(201);

      expect(res.body.url).toBeTruthy();
      expect(stripe.createCheckoutCalls).toBe(1);
      expect(await prisma.subscription.count({ where: { userId: user.user.id } })).toBe(0);
    } finally {
      await app.close();
    }
  });

  it('requires auth for checkout', async () => {
    const { app } = await createBillingTestApp({});
    try {
      await request(app.getHttpServer()).post('/api/billing/checkout').send({}).expect(401);
    } finally {
      await app.close();
    }
  });

  it('ignores client-supplied priceId / amount / userId in body', async () => {
    const stripe = createMockStripe();
    const { app } = await createBillingTestApp({ stripe });
    const prisma = app.get(PrismaService);
    await resetDatabase(prisma);

    try {
      const user = await registerUser(app, {
        email: `billing-body-${runId}@test.buyseekk.com`,
        password,
        name: 'Billing Body',
        role: 'SELLER',
        country: 'US',
      });

      await request(app.getHttpServer())
        .post('/api/billing/checkout')
        .set(authHeader(user.token))
        .send({
          priceId: 'price_evil',
          amount: 1,
          userId: 'someone-else',
          email: 'attacker@evil.com',
        })
        .expect(201);

      expect(stripe.lastCheckoutInput?.priceId).toBe('price_plus_monthly_test');
      expect(stripe.lastCheckoutInput?.userId).toBe(user.user.id);
    } finally {
      await app.close();
    }
  });

  it('retries incomplete OPEN with the same idempotency key after timeout', async () => {
    const stripe = createMockStripe();
    stripe.failNextCheckout = new Error('ETIMEDOUT');
    stripe.failCheckoutTimes = 1;
    const { app } = await createBillingTestApp({ stripe });
    const prisma = app.get(PrismaService);
    await resetDatabase(prisma);
    const billing = app.get(BillingService);

    try {
      const user = await registerUser(app, {
        email: `billing-timeout-${runId}@test.buyseekk.com`,
        password,
        name: 'Billing Timeout',
        role: 'SELLER',
        country: 'US',
      });

      const customer = await billing.getOrCreateStripeCustomer({
        id: user.user.id,
        email: user.user.email,
        name: 'Billing Timeout',
      });

      await expect(
        billing.getOrCreateOpenCheckoutSession({
          userId: user.user.id,
          customerId: customer.providerCustomerId,
        }),
      ).rejects.toThrow(/ETIMEDOUT/);

      const incomplete = await prisma.billingCheckoutSession.findFirst({
        where: { userId: user.user.id, status: 'OPEN' },
      });
      expect(incomplete).toBeTruthy();
      expect(incomplete!.providerSessionId).toBeNull();
      expect(incomplete!.checkoutUrl).toBeNull();

      const recovered = await billing.getOrCreateOpenCheckoutSession({
        userId: user.user.id,
        customerId: customer.providerCustomerId,
      });

      expect(recovered.id).toBe(incomplete!.id);
      expect(recovered.checkoutUrl).toMatch(/^https:\/\/checkout\.stripe\.com\//);
      expect(stripe.lastCheckoutInput?.idempotencyKey).toBe(
        stripeCheckoutIdempotencyKey(incomplete!.id),
      );
      expect(stripe.checkoutsByKey.size).toBe(1);
    } finally {
      await app.close();
    }
  });

  it('recovers same Stripe Session after crash between Stripe create and DB persist', async () => {
    const stripe = createMockStripe();
    const { app } = await createBillingTestApp({ stripe });
    const prisma = app.get(PrismaService);
    await resetDatabase(prisma);
    const billing = app.get(BillingService);

    try {
      const user = await registerUser(app, {
        email: `billing-crash-${runId}@test.buyseekk.com`,
        password,
        name: 'Billing Crash',
        role: 'SELLER',
        country: 'US',
      });

      const customer = await billing.getOrCreateStripeCustomer({
        id: user.user.id,
        email: user.user.email,
        name: 'Billing Crash',
      });

      const attempt = await prisma.billingCheckoutSession.create({
        data: {
          userId: user.user.id,
          provider: 'STRIPE',
          plan: 'PLUS',
          status: 'OPEN',
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      // Simulate Stripe already created the session (API crashed before persist).
      const key = stripeCheckoutIdempotencyKey(attempt.id);
      stripe.checkoutsByKey.set(key, {
        id: 'cs_preexisting_crash',
        url: 'https://checkout.stripe.com/c/pay/cs_preexisting_crash',
        expiresAtUnix: Math.floor(Date.now() / 1000) + 3600,
      });

      const recovered = await billing.getOrCreateOpenCheckoutSession({
        userId: user.user.id,
        customerId: customer.providerCustomerId,
      });

      expect(recovered.id).toBe(attempt.id);
      expect(recovered.providerSessionId).toBe('cs_preexisting_crash');
      expect(recovered.checkoutUrl).toBe(
        'https://checkout.stripe.com/c/pay/cs_preexisting_crash',
      );
      expect(stripe.checkoutsByKey.size).toBe(1);
      expect(stripe.lastCheckoutInput?.idempotencyKey).toBe(key);
    } finally {
      await app.close();
    }
  });

  it('releases OPEN on definitive Stripe error so a new attempt can start', async () => {
    const stripe = createMockStripe();
    stripe.failNextCheckout = new StripeBillingFatalError('price_invalid');
    stripe.failCheckoutTimes = 1;
    const { app } = await createBillingTestApp({ stripe });
    const prisma = app.get(PrismaService);
    await resetDatabase(prisma);

    try {
      const user = await registerUser(app, {
        email: `billing-fatal-${runId}@test.buyseekk.com`,
        password,
        name: 'Billing Fatal',
        role: 'SELLER',
        country: 'US',
      });

      await request(app.getHttpServer())
        .post('/api/billing/checkout')
        .set(authHeader(user.token))
        .send({})
        .expect(502);

      const canceled = await prisma.billingCheckoutSession.findMany({
        where: { userId: user.user.id },
      });
      expect(canceled).toHaveLength(1);
      expect(canceled[0].status).toBe('CANCELED');
      expect(canceled[0].providerSessionId).toBeNull();

      const retry = await request(app.getHttpServer())
        .post('/api/billing/checkout')
        .set(authHeader(user.token))
        .send({})
        .expect(201);

      expect(retry.body.url).toMatch(/^https:\/\/checkout\.stripe\.com\//);
      const open = await prisma.billingCheckoutSession.findMany({
        where: { userId: user.user.id, status: 'OPEN' },
      });
      expect(open).toHaveLength(1);
      expect(open[0].id).not.toBe(canceled[0].id);
      expect(stripe.checkoutsByKey.size).toBe(1);
    } finally {
      await app.close();
    }
  });

  it('persists Stripe expires_at on OPEN checkout', async () => {
    const stripe = createMockStripe();
    const { app } = await createBillingTestApp({ stripe });
    const prisma = app.get(PrismaService);
    await resetDatabase(prisma);

    try {
      const user = await registerUser(app, {
        email: `billing-expats-${runId}@test.buyseekk.com`,
        password,
        name: 'Billing Expats',
        role: 'SELLER',
        country: 'US',
      });

      const before = Date.now();
      await request(app.getHttpServer())
        .post('/api/billing/checkout')
        .set(authHeader(user.token))
        .send({})
        .expect(201);

      const row = await prisma.billingCheckoutSession.findFirstOrThrow({
        where: { userId: user.user.id, status: 'OPEN' },
      });
      const key = stripeCheckoutIdempotencyKey(row.id);
      const stripeExpiry = stripe.checkoutsByKey.get(key)!.expiresAtUnix * 1000;
      expect(Math.abs(row.expiresAt.getTime() - stripeExpiry)).toBeLessThan(2000);
      expect(row.expiresAt.getTime()).toBeGreaterThan(before);
    } finally {
      await app.close();
    }
  });

  it('customer retry after Stripe success without DB row reuses same Customer', async () => {
    const stripe = createMockStripe();
    const { app } = await createBillingTestApp({ stripe });
    const prisma = app.get(PrismaService);
    await resetDatabase(prisma);
    const billing = app.get(BillingService);

    try {
      const user = await registerUser(app, {
        email: `billing-cus-retry-${runId}@test.buyseekk.com`,
        password,
        name: 'Billing Cus Retry',
        role: 'SELLER',
        country: 'US',
      });

      // Simulate: Stripe Customer created, BillingCustomer never persisted.
      const key = stripeCustomerIdempotencyKey(user.user.id);
      stripe.customersByKey.set(key, 'cus_orphan_recovered');

      const first = await billing.getOrCreateStripeCustomer({
        id: user.user.id,
        email: user.user.email,
        name: 'Billing Cus Retry',
      });
      expect(first.providerCustomerId).toBe('cus_orphan_recovered');
      expect(stripe.customersByKey.size).toBe(1);

      const second = await billing.getOrCreateStripeCustomer({
        id: user.user.id,
        email: user.user.email,
        name: 'Billing Cus Retry',
      });
      expect(second.providerCustomerId).toBe('cus_orphan_recovered');
      expect(
        await prisma.billingCustomer.count({
          where: { userId: user.user.id, provider: 'STRIPE' },
        }),
      ).toBe(1);
    } finally {
      await app.close();
    }
  });
});
