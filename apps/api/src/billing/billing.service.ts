import {
  BadGatewayException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BillingCheckoutStatus,
  Prisma,
  SubscriptionProvider,
} from '@prisma/client';
import {
  BILLING_CHECKOUT_TTL_MS,
  isStripeBillingEnabled,
  requireStripePlusPriceId,
  requireWebUrl,
  stripeCheckoutCancelUrl,
  stripeCheckoutIdempotencyKey,
  stripeCheckoutSuccessUrl,
  stripeCustomerIdempotencyKey,
} from './billing.config';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { isDefinitiveStripeBillingError } from './stripe/stripe-billing.errors';
import {
  STRIPE_BILLING_PROVIDER,
  type StripeBillingProvider,
} from './stripe/stripe-billing.provider';

export const BILLING_UNAVAILABLE_MESSAGE =
  'Billing is temporarily unavailable. Stripe Checkout is not enabled.';

export const ALREADY_PLUS_MESSAGE =
  'Ya tenés Buyseek Plus activo. No hace falta crear otro checkout.';

export const CHECKOUT_PROVIDER_FAILED_MESSAGE =
  'No pudimos iniciar el checkout con el proveedor de pagos. Intentá de nuevo.';

const PLUS_PLAN = 'PLUS';

@Injectable()
export class BillingService {
  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private subscriptions: SubscriptionService,
    @Inject(STRIPE_BILLING_PROVIDER) private stripe: StripeBillingProvider,
  ) {}

  billingEnabled(): boolean {
    return isStripeBillingEnabled(this.config);
  }

  /**
   * Creates or reuses a Stripe Hosted Checkout Session for Buyseek Plus.
   * Does NOT grant Plus — webhooks (Phase 3) own entitlement.
   */
  async createPlusCheckoutSession(userId: string): Promise<{ url: string; sessionId: string }> {
    if (!this.billingEnabled()) {
      throw new ServiceUnavailableException({
        statusCode: 503,
        code: 'BILLING_UNAVAILABLE',
        message: BILLING_UNAVAILABLE_MESSAGE,
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (await this.subscriptions.hasPlusEntitlement({ id: user.id })) {
      throw new ConflictException({
        statusCode: 409,
        code: 'ALREADY_PLUS',
        message: ALREADY_PLUS_MESSAGE,
      });
    }

    const customer = await this.getOrCreateStripeCustomer(user);
    const open = await this.getOrCreateOpenCheckoutSession({
      userId: user.id,
      customerId: customer.providerCustomerId,
    });

    return { url: open.checkoutUrl!, sessionId: open.providerSessionId! };
  }

  /**
   * Resolve BillingCustomer for STRIPE with Stripe idempotency + DB unique.
   * If Stripe created the Customer but DB insert crashed, retry with the same
   * `billing-customer:stripe:{userId}` key recovers the same remote Customer.
   */
  async getOrCreateStripeCustomer(user: {
    id: string;
    email: string;
    name: string;
  }) {
    const existing = await this.prisma.billingCustomer.findUnique({
      where: {
        userId_provider: { userId: user.id, provider: SubscriptionProvider.STRIPE },
      },
    });
    if (existing) return existing;

    const stripeCustomer = await this.stripe.createCustomer({
      email: user.email,
      name: user.name,
      userId: user.id,
      idempotencyKey: stripeCustomerIdempotencyKey(user.id),
    });

    try {
      return await this.prisma.billingCustomer.create({
        data: {
          userId: user.id,
          provider: SubscriptionProvider.STRIPE,
          providerCustomerId: stripeCustomer.id,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const raced = await this.prisma.billingCustomer.findUnique({
          where: {
            userId_provider: { userId: user.id, provider: SubscriptionProvider.STRIPE },
          },
        });
        if (raced) return raced;
      }
      throw err;
    }
  }

  /**
   * Reuse an OPEN non-expired checkout, or attach a Stripe Session to an incomplete OPEN.
   *
   * Incomplete OPEN (no providerSessionId/url): retry Stripe with the SAME
   * `billing-checkout:{attemptId}` key so a prior Stripe success + API crash recovers
   * the same Session instead of creating another.
   *
   * Definitive Stripe errors: mark attempt CANCELED so the user is not blocked forever.
   */
  async getOrCreateOpenCheckoutSession(input: {
    userId: string;
    customerId: string;
    now?: Date;
  }) {
    const now = input.now ?? new Date();
    await this.expireStaleOpenCheckouts(input.userId, now);

    const reusable = await this.findOpenCheckout(input.userId, now);
    if (this.isCompleteOpenCheckout(reusable)) {
      return reusable!;
    }

    let row = reusable;
    if (!row) {
      row = await this.claimOpenCheckoutRow(input.userId, now);
    }

    if (this.isCompleteOpenCheckout(row)) {
      return row;
    }

    return this.attachStripeCheckoutToAttempt({
      row,
      customerId: input.customerId,
      userId: input.userId,
      now,
    });
  }

  private isCompleteOpenCheckout(
    row: { checkoutUrl: string | null; providerSessionId: string | null } | null | undefined,
  ): boolean {
    return !!(row?.checkoutUrl && row.providerSessionId);
  }

  private async attachStripeCheckoutToAttempt(input: {
    row: { id: string };
    customerId: string;
    userId: string;
    now: Date;
  }) {
    const priceId = requireStripePlusPriceId(this.config);
    const webUrl = requireWebUrl(this.config);
    const idempotencyKey = stripeCheckoutIdempotencyKey(input.row.id);

    let session;
    try {
      session = await this.stripe.createCheckoutSession({
        customerId: input.customerId,
        priceId,
        successUrl: stripeCheckoutSuccessUrl(webUrl),
        cancelUrl: stripeCheckoutCancelUrl(webUrl),
        userId: input.userId,
        plan: PLUS_PLAN,
        idempotencyKey,
      });
    } catch (err) {
      if (isDefinitiveStripeBillingError(err)) {
        await this.prisma.billingCheckoutSession.updateMany({
          where: {
            id: input.row.id,
            status: BillingCheckoutStatus.OPEN,
            providerSessionId: null,
          },
          data: { status: BillingCheckoutStatus.CANCELED },
        });
        throw new BadGatewayException({
          statusCode: 502,
          code: 'CHECKOUT_PROVIDER_FAILED',
          message: CHECKOUT_PROVIDER_FAILED_MESSAGE,
        });
      }
      // Transient (timeout/connection): leave OPEN incomplete for idempotent retry.
      throw err;
    }

    // Prefer Stripe's real expires_at so we never keep OPEN longer than Stripe.
    const expiresAt =
      session.expiresAtUnix != null
        ? new Date(session.expiresAtUnix * 1000)
        : new Date(input.now.getTime() + BILLING_CHECKOUT_TTL_MS);

    return this.prisma.billingCheckoutSession.update({
      where: { id: input.row.id },
      data: {
        providerSessionId: session.id,
        checkoutUrl: session.url,
        expiresAt,
        status: BillingCheckoutStatus.OPEN,
      },
    });
  }

  private async expireStaleOpenCheckouts(userId: string, now: Date) {
    await this.prisma.billingCheckoutSession.updateMany({
      where: {
        userId,
        provider: SubscriptionProvider.STRIPE,
        plan: PLUS_PLAN,
        status: BillingCheckoutStatus.OPEN,
        expiresAt: { lte: now },
      },
      data: { status: BillingCheckoutStatus.EXPIRED },
    });
  }

  private findOpenCheckout(userId: string, now: Date) {
    return this.prisma.billingCheckoutSession.findFirst({
      where: {
        userId,
        provider: SubscriptionProvider.STRIPE,
        plan: PLUS_PLAN,
        status: BillingCheckoutStatus.OPEN,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async claimOpenCheckoutRow(userId: string, now: Date) {
    try {
      return await this.prisma.billingCheckoutSession.create({
        data: {
          userId,
          provider: SubscriptionProvider.STRIPE,
          plan: PLUS_PLAN,
          status: BillingCheckoutStatus.OPEN,
          // Placeholder until Stripe returns expires_at; incomplete attempts stay retryable.
          expiresAt: new Date(now.getTime() + BILLING_CHECKOUT_TTL_MS),
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const raced = await this.findOpenCheckout(userId, now);
        if (raced) return raced;
      }
      throw err;
    }
  }
}
