import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  BillingCheckoutStatus,
  Prisma,
  SubscriptionProvider,
  SubscriptionStatus,
} from '@prisma/client';
import type Stripe from 'stripe';
import { BILLING_EVENT_LEASE_MS } from './billing.config';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionService } from '../subscription/subscription.service';
import {
  STRIPE_BILLING_PROVIDER,
  type NormalizedStripeSubscription,
  type StripeBillingProvider,
} from './stripe/stripe-billing.provider';
import {
  mapStripeSubscriptionStatus,
  normalizeStripeSubscription,
} from './stripe/stripe-subscription.mapper';

export const STRIPE_WEBHOOK_SUPPORTED_TYPES = [
  'checkout.session.completed',
  'checkout.session.expired',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed',
] as const;

export type StripeWebhookSupportedType = (typeof STRIPE_WEBHOOK_SUPPORTED_TYPES)[number];

export type StripeWebhookHandleResult = {
  received: true;
  duplicate?: boolean;
  ignored?: boolean;
  reason?: string;
};

type ClaimResult = 'claimed' | 'duplicate' | 'in_progress';

/**
 * Higher rank wins when two provider events share the same `created` timestamp.
 * Terminal / more restrictive states outrank active ones so a same-second
 * `deleted` is not overwritten by a concurrent `updated`→active.
 */
export function subscriptionStatusRank(status: SubscriptionStatus): number {
  switch (status) {
    case SubscriptionStatus.CANCELED:
      return 60;
    case SubscriptionStatus.EXPIRED:
      return 50;
    case SubscriptionStatus.UNPAID:
      return 40;
    case SubscriptionStatus.INCOMPLETE:
      return 30;
    case SubscriptionStatus.PAST_DUE:
      return 20;
    case SubscriptionStatus.ACTIVE:
    case SubscriptionStatus.TRIALING:
      return 10;
    default:
      return 0;
  }
}

@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);

  constructor(
    private prisma: PrismaService,
    private subscriptions: SubscriptionService,
    @Inject(STRIPE_BILLING_PROVIDER) private stripe: StripeBillingProvider,
  ) {}

  verifyAndParse(payload: Buffer, signature: string): Stripe.Event {
    return this.stripe.constructWebhookEvent(payload, signature);
  }

  /**
   * Idempotent Stripe event processing with DB lease claim.
   * processedAt is set only after successful handling so Stripe can retry on failure.
   */
  async handleEvent(event: Stripe.Event): Promise<StripeWebhookHandleResult> {
    const claim = await this.claimBillingEvent(event);
    if (claim === 'duplicate') {
      this.logger.log(`Stripe event duplicate ignored id=${event.id} type=${event.type}`);
      return { received: true, duplicate: true };
    }
    if (claim === 'in_progress') {
      this.logger.log(`Stripe event in progress elsewhere id=${event.id} type=${event.type}`);
      // Non-2xx so Stripe retries after the active lease finishes or expires.
      throw new ServiceUnavailableException({
        statusCode: 503,
        code: 'WEBHOOK_IN_PROGRESS',
        message: 'Webhook event is already being processed',
      });
    }

    try {
      if (!this.isSupportedType(event.type)) {
        this.logger.log(`Stripe event unsupported (ack) id=${event.id} type=${event.type}`);
        await this.markBillingEventProcessed(event.id);
        return { received: true, ignored: true, reason: 'unsupported_type' };
      }

      await this.dispatchSupportedEvent(event);
      await this.markBillingEventProcessed(event.id);
      return { received: true };
    } catch (err) {
      this.logger.error(
        `Stripe event failed id=${event.id} type=${event.type}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      // Leave processedAt null; lease expires so a later Stripe retry can reclaim.
      throw err;
    }
  }

  private isSupportedType(type: string): type is StripeWebhookSupportedType {
    return (STRIPE_WEBHOOK_SUPPORTED_TYPES as readonly string[]).includes(type);
  }

  /**
   * Exactly one active processor per event across replicas:
   * - insert wins the first claim
   * - completed → duplicate
   * - live lease → in_progress (503)
   * - stale/failed lease → atomic reclaim
   */
  async claimBillingEvent(event: Stripe.Event, now: Date = new Date()): Promise<ClaimResult> {
    try {
      await this.prisma.billingEvent.create({
        data: {
          provider: SubscriptionProvider.STRIPE,
          providerEventId: event.id,
          type: event.type,
          processedAt: null,
          processingStartedAt: now,
          attemptCount: 1,
        },
      });
      return 'claimed';
    } catch (err) {
      if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== 'P2002') {
        throw err;
      }
    }

    const existing = await this.prisma.billingEvent.findUnique({
      where: {
        provider_providerEventId: {
          provider: SubscriptionProvider.STRIPE,
          providerEventId: event.id,
        },
      },
    });
    if (!existing) {
      // Extremely rare race: row vanished — let Stripe retry.
      return 'in_progress';
    }
    if (existing.processedAt) {
      return 'duplicate';
    }

    const leaseCutoff = new Date(now.getTime() - BILLING_EVENT_LEASE_MS);
    const leaseActive =
      existing.processingStartedAt != null &&
      existing.processingStartedAt.getTime() > leaseCutoff.getTime();
    if (leaseActive) {
      return 'in_progress';
    }

    const reclaimed = await this.prisma.billingEvent.updateMany({
      where: {
        provider: SubscriptionProvider.STRIPE,
        providerEventId: event.id,
        processedAt: null,
        OR: [{ processingStartedAt: null }, { processingStartedAt: { lte: leaseCutoff } }],
      },
      data: {
        processingStartedAt: now,
        attemptCount: { increment: 1 },
      },
    });

    if (reclaimed.count === 1) {
      this.logger.log(
        `Stripe event reclaimed after stale/failed lease id=${event.id} type=${event.type}`,
      );
      return 'claimed';
    }
    return 'in_progress';
  }

  private async markBillingEventProcessed(providerEventId: string) {
    await this.prisma.billingEvent.update({
      where: {
        provider_providerEventId: {
          provider: SubscriptionProvider.STRIPE,
          providerEventId,
        },
      },
      data: { processedAt: new Date() },
    });
  }

  private async dispatchSupportedEvent(event: Stripe.Event) {
    const eventAt = new Date(event.created * 1000);

    switch (event.type as StripeWebhookSupportedType) {
      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
          eventAt,
          event.id,
        );
        return;
      case 'checkout.session.expired':
        await this.handleCheckoutSessionExpired(event.data.object as Stripe.Checkout.Session);
        return;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.syncStripeSubscription(
          normalizeStripeSubscription(event.data.object as Stripe.Subscription),
          eventAt,
          event.id,
        );
        return;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
          eventAt,
          event.id,
        );
        return;
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(
          event.data.object as Stripe.Invoice,
          eventAt,
          event.id,
        );
        return;
      default:
        return;
    }
  }

  private async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
    eventAt: Date,
    eventId: string,
  ) {
    this.logger.log(`Stripe checkout.session.completed id=${session.id}`);

    await this.markCheckoutSessionStatus(session.id, BillingCheckoutStatus.COMPLETE);

    if (session.mode !== 'subscription') {
      this.logger.log(`Checkout ${session.id} ignored: mode=${session.mode}`);
      return;
    }

    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
    const subscriptionId =
      typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

    if (!customerId || !subscriptionId) {
      this.logger.warn(`Checkout ${session.id} missing customer/subscription — no Plus granted`);
      return;
    }

    const plan = session.metadata?.plan?.trim();
    if (plan && plan !== 'PLUS') {
      this.logger.warn(`Checkout ${session.id} unexpected plan metadata=${plan}`);
    }

    const stripeSub = await this.stripe.retrieveSubscription(subscriptionId);
    await this.syncStripeSubscription(stripeSub, eventAt, eventId);
  }

  private async handleCheckoutSessionExpired(session: Stripe.Checkout.Session) {
    this.logger.log(`Stripe checkout.session.expired id=${session.id}`);
    await this.markCheckoutSessionStatus(session.id, BillingCheckoutStatus.EXPIRED);
  }

  private async handleSubscriptionDeleted(
    sub: Stripe.Subscription,
    eventAt: Date,
    eventId: string,
  ) {
    const normalized = normalizeStripeSubscription(sub);
    await this.syncStripeSubscription({ ...normalized, status: 'canceled' }, eventAt, eventId);
  }

  private async handleInvoicePaymentFailed(
    invoice: Stripe.Invoice,
    eventAt: Date,
    eventId: string,
  ) {
    const subscriptionId = extractInvoiceSubscriptionId(invoice);
    if (!subscriptionId) {
      this.logger.log(`invoice.payment_failed ${invoice.id} has no subscription — ignore`);
      return;
    }

    const stripeSub = await this.stripe.retrieveSubscription(subscriptionId);
    await this.syncStripeSubscription(stripeSub, eventAt, eventId);
  }

  private async markCheckoutSessionStatus(
    providerSessionId: string,
    status: BillingCheckoutStatus,
  ) {
    const result = await this.prisma.billingCheckoutSession.updateMany({
      where: {
        provider: SubscriptionProvider.STRIPE,
        providerSessionId,
      },
      data: { status },
    });
    if (result.count === 0) {
      this.logger.log(
        `BillingCheckoutSession not found for providerSessionId=${providerSessionId} status=${status}`,
      );
    }
  }

  /**
   * Central Stripe Subscription → Buyseek Subscription upsert.
   * Ownership ONLY via BillingCustomer. Ordering via lastProviderEventAt + status rank + event id.
   */
  async syncStripeSubscription(
    stripeSub: NormalizedStripeSubscription,
    providerEventAt: Date,
    providerEventId: string,
  ): Promise<'synced' | 'skipped_stale' | 'skipped_unknown_status' | 'skipped_no_customer'> {
    const mappedStatus = mapStripeSubscriptionStatus(stripeSub.status);
    if (!mappedStatus) {
      this.logger.warn(
        `Unknown Stripe subscription status="${stripeSub.status}" id=${stripeSub.id} — skip`,
      );
      return 'skipped_unknown_status';
    }

    const billingCustomer = await this.prisma.billingCustomer.findUnique({
      where: {
        provider_providerCustomerId: {
          provider: SubscriptionProvider.STRIPE,
          providerCustomerId: stripeSub.customerId,
        },
      },
    });

    if (!billingCustomer) {
      this.logger.warn(
        `No BillingCustomer for Stripe customer=${stripeSub.customerId} sub=${stripeSub.id}`,
      );
      return 'skipped_no_customer';
    }

    if (stripeSub.metadataUserId && stripeSub.metadataUserId !== billingCustomer.userId) {
      this.logger.error(
        `Ownership mismatch Stripe sub=${stripeSub.id}: metadata.userId=${stripeSub.metadataUserId} BillingCustomer.userId=${billingCustomer.userId} — refuse reassignment`,
      );
      return 'skipped_no_customer';
    }

    const existing = await this.prisma.subscription.findUnique({
      where: {
        provider_providerSubscriptionId: {
          provider: SubscriptionProvider.STRIPE,
          providerSubscriptionId: stripeSub.id,
        },
      },
    });

    if (existing && this.shouldSkipStaleEvent(existing, mappedStatus, providerEventAt, providerEventId)) {
      this.logger.log(
        `Stale/tied Stripe event ignored sub=${stripeSub.id} eventId=${providerEventId} eventAt=${providerEventAt.toISOString()} status=${mappedStatus}`,
      );
      return 'skipped_stale';
    }

    await this.prisma.subscription.upsert({
      where: {
        provider_providerSubscriptionId: {
          provider: SubscriptionProvider.STRIPE,
          providerSubscriptionId: stripeSub.id,
        },
      },
      create: {
        userId: billingCustomer.userId,
        provider: SubscriptionProvider.STRIPE,
        providerCustomerId: stripeSub.customerId,
        providerSubscriptionId: stripeSub.id,
        providerPriceId: stripeSub.priceId,
        status: mappedStatus,
        currentPeriodStart: stripeSub.currentPeriodStart,
        currentPeriodEnd: stripeSub.currentPeriodEnd,
        cancelAtPeriodEnd: stripeSub.cancelAtPeriodEnd,
        canceledAt: stripeSub.canceledAt,
        lastProviderEventAt: providerEventAt,
        lastProviderEventId: providerEventId,
      },
      update: {
        userId: billingCustomer.userId,
        providerCustomerId: stripeSub.customerId,
        providerPriceId: stripeSub.priceId,
        status: mappedStatus,
        currentPeriodStart: stripeSub.currentPeriodStart,
        currentPeriodEnd: stripeSub.currentPeriodEnd,
        cancelAtPeriodEnd: stripeSub.cancelAtPeriodEnd,
        canceledAt: stripeSub.canceledAt,
        lastProviderEventAt: providerEventAt,
        lastProviderEventId: providerEventId,
      },
    });

    await this.subscriptions.syncPlanCacheFromEntitlements(billingCustomer.userId);
    this.logger.log(
      `Subscription synced provider=STRIPE id=${stripeSub.id} userId=${billingCustomer.userId} status=${mappedStatus}`,
    );
    return 'synced';
  }

  /**
   * Ordering:
   * - older created → skip
   * - newer created → apply
   * - same created → higher statusRank wins (CANCELED > ACTIVE); equal rank → higher event id wins
   */
  shouldSkipStaleEvent(
    existing: {
      status: SubscriptionStatus;
      lastProviderEventAt: Date | null;
      lastProviderEventId: string | null;
    },
    incomingStatus: SubscriptionStatus,
    providerEventAt: Date,
    providerEventId: string,
  ): boolean {
    if (!existing.lastProviderEventAt) return false;

    const lastTs = existing.lastProviderEventAt.getTime();
    const nextTs = providerEventAt.getTime();
    if (nextTs < lastTs) return true;
    if (nextTs > lastTs) return false;

    const incomingRank = subscriptionStatusRank(incomingStatus);
    const existingRank = subscriptionStatusRank(existing.status);
    if (incomingRank < existingRank) return true;
    if (incomingRank > existingRank) return false;

    if (existing.lastProviderEventId && providerEventId <= existing.lastProviderEventId) {
      return true;
    }
    return false;
  }
}

function extractInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const raw = invoice as unknown as {
    subscription?: string | { id?: string } | null;
    parent?: { subscription_details?: { subscription?: string | { id?: string } } };
  };
  if (typeof raw.subscription === 'string') return raw.subscription;
  if (raw.subscription && typeof raw.subscription === 'object' && raw.subscription.id) {
    return raw.subscription.id;
  }
  const parentSub = raw.parent?.subscription_details?.subscription;
  if (typeof parentSub === 'string') return parentSub;
  if (parentSub && typeof parentSub === 'object' && parentSub.id) return parentSub.id;
  return null;
}
