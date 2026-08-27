import { CanActivate, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { PrismaService } from '../src/prisma/prisma.service';
import { SubscriptionService } from '../src/subscription/subscription.service';
import {
  STRIPE_BILLING_PROVIDER,
  type NormalizedStripeSubscription,
  type StripeBillingProvider,
} from '../src/billing/stripe/stripe-billing.provider';
import { StripeWebhookService } from '../src/billing/stripe-webhook.service';
import { registerMulterErrorHandler } from '../src/uploads/multer-exception.filter';
import { authHeader, registerUser, resetDatabase } from './helpers';

const password = 'TestPass123!';

type MockSubState = {
  id: string;
  userId: string;
  customerId: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date;
  status: string;
};

type MockStripe = StripeBillingProvider & {
  subscriptions: Map<string, MockSubState>;
  setCancelCalls: Array<{ subscriptionId: string; cancelAtPeriodEnd: boolean }>;
};

function createMockStripe(): MockStripe {
  const mock: MockStripe = {
    subscriptions: new Map(),
    setCancelCalls: [],
    async createCustomer(input) {
      return { id: `cus_${input.userId.slice(-8)}` };
    },
    async createCheckoutSession() {
      throw new Error('createCheckoutSession not used');
    },
    constructWebhookEvent() {
      throw new Error('constructWebhookEvent not used');
    },
    async retrieveSubscription(subscriptionId: string) {
      const sub = mock.subscriptions.get(subscriptionId);
      if (!sub) throw new Error(`Unknown subscription ${subscriptionId}`);
      return normalizeMockSub(sub);
    },
    async setCancelAtPeriodEnd(subscriptionId: string, cancelAtPeriodEnd: boolean) {
      mock.setCancelCalls.push({ subscriptionId, cancelAtPeriodEnd });
      const sub = mock.subscriptions.get(subscriptionId);
      if (!sub) throw new Error(`Unknown subscription ${subscriptionId}`);
      sub.cancelAtPeriodEnd = cancelAtPeriodEnd;
      return normalizeMockSub(sub);
    },
  };
  return mock;
}

function normalizeMockSub(sub: MockSubState): NormalizedStripeSubscription {
  return {
    id: sub.id,
    customerId: sub.customerId,
    status: sub.status,
    priceId: 'price_plus_monthly_test',
    currentPeriodStart: new Date(sub.currentPeriodEnd.getTime() - 30 * 86400000),
    currentPeriodEnd: sub.currentPeriodEnd,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    canceledAt: null,
    metadataUserId: sub.userId,
    metadataPlan: 'PLUS',
  };
}

async function createBillingMgmtApp(stripe: MockStripe) {
  const previous: Record<string, string | undefined> = {};
  const env = {
    STRIPE_BILLING_ENABLED: 'true',
    STRIPE_SECRET_KEY: 'sk_test_mock',
    STRIPE_PRICE_PLUS_MONTHLY: 'price_plus_monthly_test',
    STRIPE_WEBHOOK_SECRET: 'whsec_test_mock',
    WEB_URL: 'http://localhost:3000',
    PLUS_FEATURES_UNLOCKED: 'false',
  };
  for (const [key, value] of Object.entries(env)) {
    previous[key] = process.env[key];
    process.env[key] = value;
  }

  const allowAll: CanActivate = { canActivate: () => true };
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(APP_GUARD)
    .useValue(allowAll)
    .overrideProvider(STRIPE_BILLING_PROVIDER)
    .useValue(stripe)
    .compile();

  const app = moduleRef.createNestApplication({ rawBody: true });
  configureApp(app);
  await app.init();
  registerMulterErrorHandler(app);

  const originalClose = app.close.bind(app);
  app.close = async () => {
    await originalClose();
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };

  return app as INestApplication<App>;
}

async function seedPlusSubscription(
  app: INestApplication<App>,
  stripe: MockStripe,
  userId: string,
  opts: { cancelAtPeriodEnd?: boolean; stalePlanCache?: boolean } = {},
) {
  const prisma = app.get(PrismaService);
  const periodEnd = new Date('2026-09-26T12:00:00.000Z');
  const subId = `sub_mgmt_${userId.slice(-10)}`;
  const customerId = `cus_mgmt_${userId.slice(-10)}`;

  await prisma.billingCustomer.create({
    data: { userId, provider: 'STRIPE', providerCustomerId: customerId },
  });

  await prisma.subscription.create({
    data: {
      userId,
      provider: 'STRIPE',
      providerCustomerId: customerId,
      providerSubscriptionId: subId,
      status: 'ACTIVE',
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: opts.cancelAtPeriodEnd ?? false,
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { subscriptionPlan: opts.stalePlanCache ? 'FREE' : 'PLUS' },
  });

  stripe.subscriptions.set(subId, {
    id: subId,
    userId,
    customerId,
    cancelAtPeriodEnd: opts.cancelAtPeriodEnd ?? false,
    currentPeriodEnd: periodEnd,
    status: 'active',
  });

  return { subId, periodEnd };
}

describe('Billing subscription management (e2e)', () => {
  const runId = Date.now();

  it('FREE user cannot cancel and GET status is FREE', async () => {
    const stripe = createMockStripe();
    const app = await createBillingMgmtApp(stripe);
    const prisma = app.get(PrismaService);
    await resetDatabase(prisma);

    try {
      const user = await registerUser(app, {
        email: `mgmt-free-${runId}@test.buyseekk.com`,
        password,
        name: 'Free',
        role: 'SELLER',
        country: 'US',
      });

      const status = await request(app.getHttpServer())
        .get('/api/billing/status')
        .set(authHeader(user.token))
        .expect(200);
      expect(status.body.plan).toBe('FREE');
      expect(status.body.canCancelInBuyseek).toBe(false);

      await request(app.getHttpServer())
        .post('/api/billing/cancel')
        .set(authHeader(user.token))
        .send({ subscriptionId: 'sub_evil' })
        .expect(404);

      expect(stripe.setCancelCalls).toHaveLength(0);
    } finally {
      await app.close();
    }
  });

  it('PLUS STRIPE user can schedule cancel_at_period_end and keeps Plus until period end', async () => {
    const stripe = createMockStripe();
    const app = await createBillingMgmtApp(stripe);
    const prisma = app.get(PrismaService);
    await resetDatabase(prisma);

    try {
      const user = await registerUser(app, {
        email: `mgmt-plus-${runId}@test.buyseekk.com`,
        password,
        name: 'Plus',
        role: 'SELLER',
        country: 'US',
      });
      const { subId, periodEnd } = await seedPlusSubscription(app, stripe, user.user.id);

      const res = await request(app.getHttpServer())
        .post('/api/billing/cancel')
        .set(authHeader(user.token))
        .expect(201);

      expect(res.body.plan).toBe('PLUS');
      expect(res.body.cancelAtPeriodEnd).toBe(true);
      expect(res.body.canCancelInBuyseek).toBe(false);
      expect(res.body.canResumeInBuyseek).toBe(true);
      expect(res.body.currentPeriodEnd).toBe(periodEnd.toISOString());
      expect(stripe.setCancelCalls).toEqual([{ subscriptionId: subId, cancelAtPeriodEnd: true }]);

      const row = await prisma.subscription.findFirstOrThrow({
        where: { providerSubscriptionId: subId },
      });
      expect(row.cancelAtPeriodEnd).toBe(true);
      expect(row.lastProviderEventAt).toBeInstanceOf(Date);
      expect(row.lastProviderEventId).toMatch(/^api:cancel:/);

      const entitlements = app.get(SubscriptionService);
      expect(await entitlements.hasPlusEntitlement({ id: user.user.id }, periodEnd)).toBe(true);
    } finally {
      await app.close();
    }
  });

  it('scheduled cancel shows resume capability and resume clears cancel_at_period_end', async () => {
    const stripe = createMockStripe();
    const app = await createBillingMgmtApp(stripe);
    const prisma = app.get(PrismaService);
    await resetDatabase(prisma);

    try {
      const user = await registerUser(app, {
        email: `mgmt-resume-${runId}@test.buyseekk.com`,
        password,
        name: 'Plus',
        role: 'SELLER',
        country: 'US',
      });
      const { subId } = await seedPlusSubscription(app, stripe, user.user.id, {
        cancelAtPeriodEnd: true,
      });

      const status = await request(app.getHttpServer())
        .get('/api/billing/status')
        .set(authHeader(user.token))
        .expect(200);
      expect(status.body.canResumeInBuyseek).toBe(true);
      expect(status.body.canCancelInBuyseek).toBe(false);

      const res = await request(app.getHttpServer())
        .post('/api/billing/resume')
        .set(authHeader(user.token))
        .expect(201);

      expect(res.body.cancelAtPeriodEnd).toBe(false);
      expect(res.body.canCancelInBuyseek).toBe(true);
      expect(stripe.setCancelCalls).toEqual([{ subscriptionId: subId, cancelAtPeriodEnd: false }]);
    } finally {
      await app.close();
    }
  });

  it('another user cannot cancel a subscription they do not own', async () => {
    const stripe = createMockStripe();
    const app = await createBillingMgmtApp(stripe);
    const prisma = app.get(PrismaService);
    await resetDatabase(prisma);

    try {
      const owner = await registerUser(app, {
        email: `mgmt-owner-${runId}@test.buyseekk.com`,
        password,
        name: 'Owner',
        role: 'SELLER',
        country: 'US',
      });
      await seedPlusSubscription(app, stripe, owner.user.id);

      const attacker = await registerUser(app, {
        email: `mgmt-attacker-${runId}@test.buyseekk.com`,
        password,
        name: 'Attacker',
        role: 'SELLER',
        country: 'US',
      });

      await request(app.getHttpServer())
        .post('/api/billing/cancel')
        .set(authHeader(attacker.token))
        .expect(404);

      expect(stripe.setCancelCalls).toHaveLength(0);
    } finally {
      await app.close();
    }
  });

  it('stale User.subscriptionPlan=FREE still allows cancel when Subscription grants Plus', async () => {
    const stripe = createMockStripe();
    const app = await createBillingMgmtApp(stripe);
    const prisma = app.get(PrismaService);
    await resetDatabase(prisma);

    try {
      const user = await registerUser(app, {
        email: `mgmt-stale-${runId}@test.buyseekk.com`,
        password,
        name: 'Plus stale cache',
        role: 'SELLER',
        country: 'US',
      });
      await seedPlusSubscription(app, stripe, user.user.id, { stalePlanCache: true });

      await request(app.getHttpServer())
        .post('/api/billing/cancel')
        .set(authHeader(user.token))
        .expect(201);
      expect(stripe.setCancelCalls).toHaveLength(1);
    } finally {
      await app.close();
    }
  });

  it('reject double cancel when already scheduled', async () => {
    const stripe = createMockStripe();
    const app = await createBillingMgmtApp(stripe);
    const prisma = app.get(PrismaService);
    await resetDatabase(prisma);

    try {
      const user = await registerUser(app, {
        email: `mgmt-double-${runId}@test.buyseekk.com`,
        password,
        name: 'Plus',
        role: 'SELLER',
        country: 'US',
      });
      await seedPlusSubscription(app, stripe, user.user.id, { cancelAtPeriodEnd: true });

      await request(app.getHttpServer())
        .post('/api/billing/cancel')
        .set(authHeader(user.token))
        .expect(409);
    } finally {
      await app.close();
    }
  });

  it('reject resume when cancel is not scheduled', async () => {
    const stripe = createMockStripe();
    const app = await createBillingMgmtApp(stripe);
    const prisma = app.get(PrismaService);
    await resetDatabase(prisma);

    try {
      const user = await registerUser(app, {
        email: `mgmt-resume-none-${runId}@test.buyseekk.com`,
        password,
        name: 'Plus',
        role: 'SELLER',
        country: 'US',
      });
      await seedPlusSubscription(app, stripe, user.user.id);

      await request(app.getHttpServer())
        .post('/api/billing/resume')
        .set(authHeader(user.token))
        .expect(409);

      expect(stripe.setCancelCalls).toHaveLength(0);
    } finally {
      await app.close();
    }
  });

  it('reject double resume when cancel is no longer scheduled', async () => {
    const stripe = createMockStripe();
    const app = await createBillingMgmtApp(stripe);
    const prisma = app.get(PrismaService);
    await resetDatabase(prisma);

    try {
      const user = await registerUser(app, {
        email: `mgmt-double-resume-${runId}@test.buyseekk.com`,
        password,
        name: 'Plus',
        role: 'SELLER',
        country: 'US',
      });
      await seedPlusSubscription(app, stripe, user.user.id, { cancelAtPeriodEnd: true });

      await request(app.getHttpServer())
        .post('/api/billing/resume')
        .set(authHeader(user.token))
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/billing/resume')
        .set(authHeader(user.token))
        .expect(409);

      expect(stripe.setCancelCalls).toHaveLength(1);
    } finally {
      await app.close();
    }
  });

  it('resume API sync wins over stale cancel webhook (ordering)', async () => {
    const stripe = createMockStripe();
    const app = await createBillingMgmtApp(stripe);
    const prisma = app.get(PrismaService);
    const webhooks = app.get(StripeWebhookService);
    await resetDatabase(prisma);

    try {
      const user = await registerUser(app, {
        email: `mgmt-race-resume-${runId}@test.buyseekk.com`,
        password,
        name: 'Plus',
        role: 'SELLER',
        country: 'US',
      });
      const { subId, periodEnd } = await seedPlusSubscription(app, stripe, user.user.id, {
        cancelAtPeriodEnd: true,
      });

      const staleAt = new Date(Date.now() - 60_000);
      await webhooks.syncStripeSubscription(
        normalizeMockSub({
          id: subId,
          userId: user.user.id,
          customerId: `cus_mgmt_${user.user.id.slice(-10)}`,
          cancelAtPeriodEnd: true,
          currentPeriodEnd: periodEnd,
          status: 'active',
        }),
        staleAt,
        'evt_stale_cancel',
      );

      await request(app.getHttpServer())
        .post('/api/billing/resume')
        .set(authHeader(user.token))
        .expect(201);

      const row = await prisma.subscription.findFirstOrThrow({
        where: { providerSubscriptionId: subId },
      });
      expect(row.cancelAtPeriodEnd).toBe(false);
      expect(row.lastProviderEventId).toMatch(/^api:resume:/);
      expect(row.lastProviderEventAt!.getTime()).toBeGreaterThan(staleAt.getTime());
    } finally {
      await app.close();
    }
  });

  it('stale webhook cannot undo API cancel sync (ordering)', async () => {
    const stripe = createMockStripe();
    const app = await createBillingMgmtApp(stripe);
    const prisma = app.get(PrismaService);
    const webhooks = app.get(StripeWebhookService);
    await resetDatabase(prisma);

    try {
      const user = await registerUser(app, {
        email: `mgmt-race-cancel-${runId}@test.buyseekk.com`,
        password,
        name: 'Plus',
        role: 'SELLER',
        country: 'US',
      });
      const { subId, periodEnd } = await seedPlusSubscription(app, stripe, user.user.id);

      await request(app.getHttpServer())
        .post('/api/billing/cancel')
        .set(authHeader(user.token))
        .expect(201);

      const afterApi = await prisma.subscription.findFirstOrThrow({
        where: { providerSubscriptionId: subId },
      });
      expect(afterApi.lastProviderEventId).toMatch(/^api:cancel:/);

      const staleAt = new Date(afterApi.lastProviderEventAt!.getTime() - 60_000);
      const result = await webhooks.syncStripeSubscription(
        normalizeMockSub({
          id: subId,
          userId: user.user.id,
          customerId: `cus_mgmt_${user.user.id.slice(-10)}`,
          cancelAtPeriodEnd: false,
          currentPeriodEnd: periodEnd,
          status: 'active',
        }),
        staleAt,
        'evt_stale_pre_cancel',
      );
      expect(result).toBe('skipped_stale');

      const row = await prisma.subscription.findFirstOrThrow({
        where: { providerSubscriptionId: subId },
      });
      expect(row.cancelAtPeriodEnd).toBe(true);
      expect(row.lastProviderEventId).toMatch(/^api:cancel:/);
    } finally {
      await app.close();
    }
  });

  it('newer webhook can apply after API cancel sync', async () => {
    const stripe = createMockStripe();
    const app = await createBillingMgmtApp(stripe);
    const prisma = app.get(PrismaService);
    const webhooks = app.get(StripeWebhookService);
    await resetDatabase(prisma);

    try {
      const user = await registerUser(app, {
        email: `mgmt-race-webhook-${runId}@test.buyseekk.com`,
        password,
        name: 'Plus',
        role: 'SELLER',
        country: 'US',
      });
      const { subId, periodEnd } = await seedPlusSubscription(app, stripe, user.user.id);

      await request(app.getHttpServer())
        .post('/api/billing/cancel')
        .set(authHeader(user.token))
        .expect(201);

      const afterApi = await prisma.subscription.findFirstOrThrow({
        where: { providerSubscriptionId: subId },
      });
      const newerAt = new Date(afterApi.lastProviderEventAt!.getTime() + 1000);

      await webhooks.syncStripeSubscription(
        normalizeMockSub({
          id: subId,
          userId: user.user.id,
          customerId: `cus_mgmt_${user.user.id.slice(-10)}`,
          cancelAtPeriodEnd: true,
          currentPeriodEnd: periodEnd,
          status: 'active',
        }),
        newerAt,
        'evt_newer_confirm',
      );

      const row = await prisma.subscription.findFirstOrThrow({
        where: { providerSubscriptionId: subId },
      });
      expect(row.cancelAtPeriodEnd).toBe(true);
      expect(row.lastProviderEventId).toBe('evt_newer_confirm');
    } finally {
      await app.close();
    }
  });
});
