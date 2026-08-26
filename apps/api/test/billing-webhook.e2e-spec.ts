import { CanActivate, INestApplication, ServiceUnavailableException } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { createHmac } from 'crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { StripeWebhookService } from '../src/billing/stripe-webhook.service';
import {
  STRIPE_BILLING_PROVIDER,
  type NormalizedStripeSubscription,
  type StripeBillingProvider,
} from '../src/billing/stripe/stripe-billing.provider';
import { configureApp } from '../src/bootstrap';
import { PrismaService } from '../src/prisma/prisma.service';
import { SubscriptionService } from '../src/subscription/subscription.service';
import { registerMulterErrorHandler } from '../src/uploads/multer-exception.filter';
import { registerUser, resetDatabase } from './helpers';

const WEBHOOK_SECRET = 'whsec_test_phase3';
const runId = Date.now();
const password = 'Testpass123';

type MockStripe = StripeBillingProvider & {
  subscriptions: Map<string, NormalizedStripeSubscription>;
  retrieveCalls: number;
};

function signPayload(payload: string, secret = WEBHOOK_SECRET): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signed = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
  return `t=${timestamp},v1=${signed}`;
}

/** Minimal Stripe-compatible constructEvent for tests (no network). */
function constructTestEvent(payload: Buffer, signature: string, secret: string) {
  const parts = Object.fromEntries(
    signature.split(',').map((p) => {
      const [k, v] = p.split('=');
      return [k, v];
    }),
  );
  const timestamp = parts.t;
  const v1 = parts.v1;
  if (!timestamp || !v1) throw new Error('Invalid signature header');
  const expected = createHmac('sha256', secret)
    .update(`${timestamp}.${payload.toString('utf8')}`)
    .digest('hex');
  if (expected !== v1) throw new Error('Webhook signature verification failed');
  return JSON.parse(payload.toString('utf8'));
}

function makeSub(overrides: Partial<NormalizedStripeSubscription> & { id: string; customerId: string }): NormalizedStripeSubscription {
  const now = Math.floor(Date.now() / 1000);
  return {
    status: 'active',
    priceId: 'price_plus_monthly_test',
    currentPeriodStart: new Date((now - 60) * 1000),
    currentPeriodEnd: new Date((now + 30 * 24 * 3600) * 1000),
    cancelAtPeriodEnd: false,
    canceledAt: null,
    metadataUserId: null,
    metadataPlan: 'PLUS',
    ...overrides,
  };
}

function createMockStripe(): MockStripe {
  const mock: MockStripe = {
    subscriptions: new Map(),
    retrieveCalls: 0,
    async createCustomer() {
      return { id: 'cus_unused' };
    },
    async createCheckoutSession() {
      return { id: 'cs_unused', url: 'https://checkout.stripe.com/c/pay/cs_unused' };
    },
    constructWebhookEvent(payload, signature) {
      return constructTestEvent(payload, signature, WEBHOOK_SECRET) as never;
    },
    async retrieveSubscription(id) {
      mock.retrieveCalls += 1;
      const sub = mock.subscriptions.get(id);
      if (!sub) throw new Error(`Unknown subscription ${id}`);
      return sub;
    },
  };
  return mock;
}

async function createWebhookTestApp(stripe: MockStripe) {
  const previous: Record<string, string | undefined> = {};
  const env = {
    STRIPE_BILLING_ENABLED: 'true',
    STRIPE_SECRET_KEY: 'sk_test_mock',
    STRIPE_PRICE_PLUS_MONTHLY: 'price_plus_monthly_test',
    STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
    WEB_URL: 'http://localhost:3000',
    PLUS_FEATURES_UNLOCKED: 'false',
  };
  for (const [key, value] of Object.entries(env)) {
    previous[key] = process.env[key];
    process.env[key] = value;
  }

  const allowAll: CanActivate = { canActivate: () => true };
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
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
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    return originalClose();
  };

  return app;
}

function stripeEvent(type: string, object: Record<string, unknown>, id: string, created: number) {
  return {
    id,
    object: 'event',
    type,
    created,
    data: { object },
  };
}

function postWebhook(app: INestApplication<App>, event: object) {
  const payload = JSON.stringify(event);
  return request(app.getHttpServer())
    .post('/api/billing/webhooks/stripe')
    .set('Content-Type', 'application/json')
    .set('Stripe-Signature', signPayload(payload))
    .send(payload);
}

describe('Billing Stripe webhooks (e2e)', () => {
  it('rejects invalid signature with 400', async () => {
    const stripe = createMockStripe();
    const app = await createWebhookTestApp(stripe);
    try {
      await request(app.getHttpServer())
        .post('/api/billing/webhooks/stripe')
        .set('Content-Type', 'application/json')
        .set('Stripe-Signature', 't=1,v1=deadbeef')
        .send(JSON.stringify({ id: 'evt_bad' }))
        .expect(400);
    } finally {
      await app.close();
    }
  });

  it('acks unsupported event types without mutating subscriptions', async () => {
    const stripe = createMockStripe();
    const app = await createWebhookTestApp(stripe);
    const prisma = app.get(PrismaService);
    await resetDatabase(prisma);
    try {
      const event = stripeEvent('ping', { id: 'obj' }, `evt_ping_${runId}`, Math.floor(Date.now() / 1000));
      await postWebhook(app, event).expect(200);
      expect(await prisma.billingEvent.count()).toBe(1);
      expect(
        (await prisma.billingEvent.findFirstOrThrow()).processedAt,
      ).toBeTruthy();
      expect(await prisma.subscription.count()).toBe(0);
    } finally {
      await app.close();
    }
  });

  it('idempotently processes events with lease: duplicate, fail→retry, concurrent in_progress', async () => {
    const stripe = createMockStripe();
    const app = await createWebhookTestApp(stripe);
    const prisma = app.get(PrismaService);
    const webhooks = app.get(StripeWebhookService);
    await resetDatabase(prisma);

    try {
      const user = await registerUser(app, {
        email: `wh-idemp-${runId}@test.buyseekk.com`,
        password,
        name: 'Wh Idemp',
        role: 'SELLER',
        country: 'US',
      });
      await prisma.billingCustomer.create({
        data: {
          userId: user.user.id,
          provider: 'STRIPE',
          providerCustomerId: `cus_idemp_${runId}`,
        },
      });
      const sub = makeSub({
        id: `sub_idemp_${runId}`,
        customerId: `cus_idemp_${runId}`,
        metadataUserId: user.user.id,
      });
      stripe.subscriptions.set(sub.id, sub);

      const event = stripeEvent(
        'customer.subscription.created',
        {
          id: sub.id,
          object: 'subscription',
          customer: sub.customerId,
          status: 'active',
          cancel_at_period_end: false,
          canceled_at: null,
          current_period_start: Math.floor(sub.currentPeriodStart!.getTime() / 1000),
          current_period_end: Math.floor(sub.currentPeriodEnd!.getTime() / 1000),
          items: { data: [{ price: { id: 'price_plus_monthly_test' } }] },
          metadata: { userId: user.user.id, plan: 'PLUS' },
        },
        `evt_idemp_${runId}`,
        Math.floor(Date.now() / 1000),
      );

      const first = await postWebhook(app, event).expect(200);
      expect(first.body.duplicate).toBeFalsy();
      const second = await postWebhook(app, event).expect(200);
      expect(second.body.duplicate).toBe(true);
      expect(await prisma.subscription.count({ where: { userId: user.user.id } })).toBe(1);
      expect(await prisma.billingEvent.count()).toBe(1);

      // Failed attempt: processedAt null + stale lease → retry can reclaim.
      await prisma.billingEvent.updateMany({
        data: {
          processedAt: null,
          processingStartedAt: new Date(Date.now() - 10 * 60 * 1000),
        },
      });
      const retry = await postWebhook(app, event).expect(200);
      expect(retry.body.duplicate).toBeFalsy();
      expect((await prisma.billingEvent.findFirstOrThrow()).processedAt).toBeTruthy();
      expect((await prisma.billingEvent.findFirstOrThrow()).attemptCount).toBeGreaterThanOrEqual(2);

      // Live lease: concurrent claim must not double-process.
      await prisma.billingEvent.updateMany({
        data: {
          processedAt: null,
          processingStartedAt: new Date(),
        },
      });
      await expect(webhooks.handleEvent(event as never)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      expect(await prisma.subscription.count({ where: { userId: user.user.id } })).toBe(1);

      // Concurrent first delivery: only one sync effect (other → 503 or duplicate).
      await prisma.billingEvent.deleteMany();
      await prisma.subscription.deleteMany({ where: { userId: user.user.id } });
      const syncSpy = jest.spyOn(webhooks, 'syncStripeSubscription');
      const results = await Promise.allSettled([
        webhooks.handleEvent(event as never),
        webhooks.handleEvent(event as never),
      ]);
      expect(syncSpy).toHaveBeenCalledTimes(1);
      syncSpy.mockRestore();
      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');
      expect(fulfilled.length).toBeGreaterThanOrEqual(1);
      expect(fulfilled.length + rejected.length).toBe(2);
      if (rejected.length > 0) {
        expect(rejected[0].status === 'rejected' && rejected[0].reason).toBeInstanceOf(
          ServiceUnavailableException,
        );
      }
      expect(await prisma.subscription.count({ where: { userId: user.user.id } })).toBe(1);
      expect(await prisma.billingEvent.count()).toBe(1);
    } finally {
      await app.close();
    }
  });

  it('supported processing failure returns non-2xx so Stripe can retry', async () => {
    const stripe = createMockStripe();
    const app = await createWebhookTestApp(stripe);
    const prisma = app.get(PrismaService);
    await resetDatabase(prisma);

    try {
      // Missing retrieve target → handler throws → 500, processedAt stays null.
      const checkoutEvent = stripeEvent(
        'checkout.session.completed',
        {
          id: `cs_fail_${runId}`,
          object: 'checkout.session',
          mode: 'subscription',
          customer: `cus_fail_${runId}`,
          subscription: `sub_fail_retrieve_${runId}`,
          metadata: { plan: 'PLUS' },
        },
        `evt_co_fail_${runId}`,
        Math.floor(Date.now() / 1000),
      );

      await postWebhook(app, checkoutEvent).expect(500);
      const row = await prisma.billingEvent.findFirstOrThrow({
        where: { providerEventId: `evt_co_fail_${runId}` },
      });
      expect(row.processedAt).toBeNull();

      await postWebhook(
        app,
        stripeEvent('ping', { id: 'obj' }, `evt_ping_fail_${runId}`, Math.floor(Date.now() / 1000)),
      ).expect(200);
    } finally {
      await app.close();
    }
  });

  it('checkout.session.completed marks COMPLETE, syncs Subscription, grants Plus; success URL alone does not', async () => {
    const stripe = createMockStripe();
    const app = await createWebhookTestApp(stripe);
    const prisma = app.get(PrismaService);
    const entitlements = app.get(SubscriptionService);
    await resetDatabase(prisma);

    try {
      const user = await registerUser(app, {
        email: `wh-co-${runId}@test.buyseekk.com`,
        password,
        name: 'Wh Co',
        role: 'SELLER',
        country: 'US',
      });
      await prisma.billingCustomer.create({
        data: {
          userId: user.user.id,
          provider: 'STRIPE',
          providerCustomerId: `cus_co_${runId}`,
        },
      });
      await prisma.billingCheckoutSession.create({
        data: {
          userId: user.user.id,
          provider: 'STRIPE',
          plan: 'PLUS',
          providerSessionId: `cs_co_${runId}`,
          checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_co',
          status: 'OPEN',
          expiresAt: new Date(Date.now() + 3600_000),
        },
      });

      expect(await entitlements.hasPlusEntitlement({ id: user.user.id })).toBe(false);

      const sub = makeSub({
        id: `sub_co_${runId}`,
        customerId: `cus_co_${runId}`,
        metadataUserId: user.user.id,
      });
      stripe.subscriptions.set(sub.id, sub);

      const event = stripeEvent(
        'checkout.session.completed',
        {
          id: `cs_co_${runId}`,
          object: 'checkout.session',
          mode: 'subscription',
          customer: `cus_co_${runId}`,
          subscription: sub.id,
          metadata: { userId: user.user.id, plan: 'PLUS' },
        },
        `evt_co_${runId}`,
        Math.floor(Date.now() / 1000),
      );

      await postWebhook(app, event).expect(200);

      const checkout = await prisma.billingCheckoutSession.findFirstOrThrow({
        where: { providerSessionId: `cs_co_${runId}` },
      });
      expect(checkout.status).toBe('COMPLETE');
      expect(stripe.retrieveCalls).toBe(1);
      expect(await entitlements.hasPlusEntitlement({ id: user.user.id })).toBe(true);
      expect(
        (await prisma.user.findUniqueOrThrow({ where: { id: user.user.id } })).subscriptionPlan,
      ).toBe('PLUS');
    } finally {
      await app.close();
    }
  });

  it('checkout.session.expired marks EXPIRED without granting Plus', async () => {
    const stripe = createMockStripe();
    const app = await createWebhookTestApp(stripe);
    const prisma = app.get(PrismaService);
    await resetDatabase(prisma);

    try {
      const user = await registerUser(app, {
        email: `wh-exp-${runId}@test.buyseekk.com`,
        password,
        name: 'Wh Exp',
        role: 'SELLER',
        country: 'US',
      });
      await prisma.billingCheckoutSession.create({
        data: {
          userId: user.user.id,
          provider: 'STRIPE',
          plan: 'PLUS',
          providerSessionId: `cs_exp_${runId}`,
          checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_exp',
          status: 'OPEN',
          expiresAt: new Date(Date.now() + 3600_000),
        },
      });

      const event = stripeEvent(
        'checkout.session.expired',
        { id: `cs_exp_${runId}`, object: 'checkout.session' },
        `evt_exp_${runId}`,
        Math.floor(Date.now() / 1000),
      );
      await postWebhook(app, event).expect(200);
      expect(
        (
          await prisma.billingCheckoutSession.findFirstOrThrow({
            where: { providerSessionId: `cs_exp_${runId}` },
          })
        ).status,
      ).toBe('EXPIRED');
      expect(await prisma.subscription.count()).toBe(0);
    } finally {
      await app.close();
    }
  });

  it('ownership: refuses metadata mismatch and missing BillingCustomer', async () => {
    const stripe = createMockStripe();
    const app = await createWebhookTestApp(stripe);
    const prisma = app.get(PrismaService);
    const webhooks = app.get(StripeWebhookService);
    await resetDatabase(prisma);

    try {
      const owner = await registerUser(app, {
        email: `wh-own-${runId}@test.buyseekk.com`,
        password,
        name: 'Owner',
        role: 'SELLER',
        country: 'US',
      });
      const attacker = await registerUser(app, {
        email: `wh-atk-${runId}@test.buyseekk.com`,
        password,
        name: 'Attacker',
        role: 'SELLER',
        country: 'US',
      });
      await prisma.billingCustomer.create({
        data: {
          userId: owner.user.id,
          provider: 'STRIPE',
          providerCustomerId: `cus_own_${runId}`,
        },
      });

      const mismatch = makeSub({
        id: `sub_mm_${runId}`,
        customerId: `cus_own_${runId}`,
        metadataUserId: attacker.user.id,
      });
      expect(
        await webhooks.syncStripeSubscription(mismatch, new Date(), 'evt_mm'),
      ).toBe('skipped_no_customer');
      expect(await prisma.subscription.count()).toBe(0);

      const orphan = makeSub({
        id: `sub_or_${runId}`,
        customerId: `cus_missing_${runId}`,
        metadataUserId: owner.user.id,
      });
      expect(await webhooks.syncStripeSubscription(orphan, new Date(), 'evt_or')).toBe(
        'skipped_no_customer',
      );
    } finally {
      await app.close();
    }
  });

  it('maps entitlement statuses and cancel_at_period_end correctly', async () => {
    const stripe = createMockStripe();
    const app = await createWebhookTestApp(stripe);
    const prisma = app.get(PrismaService);
    const webhooks = app.get(StripeWebhookService);
    const entitlements = app.get(SubscriptionService);
    await resetDatabase(prisma);

    try {
      const user = await registerUser(app, {
        email: `wh-status-${runId}@test.buyseekk.com`,
        password,
        name: 'Wh Status',
        role: 'SELLER',
        country: 'US',
      });
      await prisma.billingCustomer.create({
        data: {
          userId: user.user.id,
          provider: 'STRIPE',
          providerCustomerId: `cus_st_${runId}`,
        },
      });

      const now = new Date('2026-08-26T15:00:00.000Z');
      const future = new Date('2026-09-26T15:00:00.000Z');
      const past = new Date('2026-07-01T00:00:00.000Z');
      const base = {
        id: `sub_st_${runId}`,
        customerId: `cus_st_${runId}`,
        metadataUserId: user.user.id,
      };
      // Increasing eventAt so status-mapping steps are not blocked by same-ts rank ties.
      let tick = now.getTime();
      const nextAt = () => new Date(++tick);

      await webhooks.syncStripeSubscription(makeSub({ ...base, status: 'trialing' }), nextAt(), 'evt_t');
      expect(await entitlements.hasPlusEntitlement({ id: user.user.id }, now)).toBe(true);

      await webhooks.syncStripeSubscription(makeSub({ ...base, status: 'past_due' }), nextAt(), 'evt_pd');
      expect(await entitlements.hasPlusEntitlement({ id: user.user.id }, now)).toBe(true);

      await webhooks.syncStripeSubscription(
        makeSub({
          ...base,
          status: 'active',
          cancelAtPeriodEnd: true,
          currentPeriodEnd: future,
        }),
        nextAt(),
        'evt_cap',
      );
      expect(await entitlements.hasPlusEntitlement({ id: user.user.id }, now)).toBe(true);

      await webhooks.syncStripeSubscription(
        makeSub({
          ...base,
          status: 'canceled',
          currentPeriodEnd: future,
          canceledAt: now,
        }),
        nextAt(),
        'evt_canc_future',
      );
      expect(await entitlements.hasPlusEntitlement({ id: user.user.id }, now)).toBe(true);

      await webhooks.syncStripeSubscription(
        makeSub({
          ...base,
          status: 'canceled',
          currentPeriodEnd: past,
          canceledAt: past,
        }),
        nextAt(),
        'evt_canc_past',
      );
      expect(await entitlements.hasPlusEntitlement({ id: user.user.id }, now)).toBe(false);
      expect(
        (await prisma.user.findUniqueOrThrow({ where: { id: user.user.id } })).subscriptionPlan,
      ).toBe('FREE');

      await webhooks.syncStripeSubscription(
        makeSub({ ...base, status: 'unpaid' }),
        nextAt(),
        'evt_unpaid',
      );
      expect(await entitlements.hasPlusEntitlement({ id: user.user.id }, now)).toBe(false);

      await webhooks.syncStripeSubscription(
        makeSub({ ...base, status: 'incomplete' }),
        nextAt(),
        'evt_inc',
      );
      expect(await entitlements.hasPlusEntitlement({ id: user.user.id }, now)).toBe(false);

      await webhooks.syncStripeSubscription(
        makeSub({ ...base, status: 'active' }),
        nextAt(),
        'evt_react',
      );
      expect(await entitlements.hasPlusEntitlement({ id: user.user.id }, now)).toBe(true);
      expect(
        (await prisma.user.findUniqueOrThrow({ where: { id: user.user.id } })).subscriptionPlan,
      ).toBe('PLUS');
    } finally {
      await app.close();
    }
  });

  it('ignores stale events after a newer deleted event', async () => {
    const stripe = createMockStripe();
    const app = await createWebhookTestApp(stripe);
    const prisma = app.get(PrismaService);
    const webhooks = app.get(StripeWebhookService);
    const entitlements = app.get(SubscriptionService);
    await resetDatabase(prisma);

    try {
      const user = await registerUser(app, {
        email: `wh-order-${runId}@test.buyseekk.com`,
        password,
        name: 'Wh Order',
        role: 'SELLER',
        country: 'US',
      });
      await prisma.billingCustomer.create({
        data: {
          userId: user.user.id,
          provider: 'STRIPE',
          providerCustomerId: `cus_ord_${runId}`,
        },
      });

      const newer = new Date('2026-08-26T18:00:00.000Z');
      const older = new Date('2026-08-26T12:00:00.000Z');
      const same = new Date('2026-08-26T18:00:00.000Z');
      const base = {
        id: `sub_ord_${runId}`,
        customerId: `cus_ord_${runId}`,
        metadataUserId: user.user.id,
      };

      await webhooks.syncStripeSubscription(
        makeSub({
          ...base,
          status: 'canceled',
          currentPeriodEnd: new Date('2026-07-01T00:00:00.000Z'),
        }),
        newer,
        'evt_deleted_new',
      );
      expect(await entitlements.hasPlusEntitlement({ id: user.user.id }, newer)).toBe(false);

      const result = await webhooks.syncStripeSubscription(
        makeSub({ ...base, status: 'active' }),
        older,
        'evt_updated_old',
      );
      expect(result).toBe('skipped_stale');
      expect(await entitlements.hasPlusEntitlement({ id: user.user.id }, newer)).toBe(false);
      expect(
        (await prisma.subscription.findFirstOrThrow({ where: { userId: user.user.id } })).status,
      ).toBe('CANCELED');

      // Same timestamp: CANCELED rank beats ACTIVE — do not reactivate.
      const sameTs = await webhooks.syncStripeSubscription(
        makeSub({ ...base, status: 'active' }),
        same,
        'evt_same_ts_active',
      );
      expect(sameTs).toBe('skipped_stale');
      expect(
        (await prisma.subscription.findFirstOrThrow({ where: { userId: user.user.id } })).status,
      ).toBe('CANCELED');
    } finally {
      await app.close();
    }
  });

  it('invoice.payment_failed syncs real subscription status without deleting', async () => {
    const stripe = createMockStripe();
    const app = await createWebhookTestApp(stripe);
    const prisma = app.get(PrismaService);
    await resetDatabase(prisma);

    try {
      const user = await registerUser(app, {
        email: `wh-inv-${runId}@test.buyseekk.com`,
        password,
        name: 'Wh Inv',
        role: 'SELLER',
        country: 'US',
      });
      await prisma.billingCustomer.create({
        data: {
          userId: user.user.id,
          provider: 'STRIPE',
          providerCustomerId: `cus_inv_${runId}`,
        },
      });
      const sub = makeSub({
        id: `sub_inv_${runId}`,
        customerId: `cus_inv_${runId}`,
        status: 'past_due',
        metadataUserId: user.user.id,
      });
      stripe.subscriptions.set(sub.id, sub);

      await prisma.subscription.create({
        data: {
          userId: user.user.id,
          provider: 'STRIPE',
          providerCustomerId: sub.customerId,
          providerSubscriptionId: sub.id,
          status: 'ACTIVE',
          currentPeriodEnd: sub.currentPeriodEnd,
        },
      });

      const event = stripeEvent(
        'invoice.payment_failed',
        {
          id: `in_fail_${runId}`,
          object: 'invoice',
          subscription: sub.id,
        },
        `evt_inv_${runId}`,
        Math.floor(Date.now() / 1000),
      );
      await postWebhook(app, event).expect(200);

      const row = await prisma.subscription.findFirstOrThrow({
        where: { providerSubscriptionId: sub.id },
      });
      expect(row.status).toBe('PAST_DUE');
      expect(await prisma.subscription.count({ where: { userId: user.user.id } })).toBe(1);
    } finally {
      await app.close();
    }
  });
});
