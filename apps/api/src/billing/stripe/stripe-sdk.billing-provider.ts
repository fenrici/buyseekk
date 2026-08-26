import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { requireStripeSecretKey, requireStripeWebhookSecret } from '../billing.config';
import type {
  CreateStripeCheckoutSessionInput,
  CreateStripeCustomerInput,
  NormalizedStripeSubscription,
  StripeBillingProvider,
  StripeCheckoutSessionResult,
  StripeCustomerResult,
} from './stripe-billing.provider';
import { normalizeStripeSubscription } from './stripe-subscription.mapper';

@Injectable()
export class StripeSdkBillingProvider implements StripeBillingProvider {
  private client: Stripe | null = null;

  constructor(private config: ConfigService) {}

  private stripe(): Stripe {
    if (!this.client) {
      this.client = new Stripe(requireStripeSecretKey(this.config));
    }
    return this.client;
  }

  async createCustomer(input: CreateStripeCustomerInput): Promise<StripeCustomerResult> {
    const customer = await this.stripe().customers.create(
      {
        email: input.email,
        name: input.name,
        metadata: { userId: input.userId },
      },
      { idempotencyKey: input.idempotencyKey },
    );
    return { id: customer.id };
  }

  async createCheckoutSession(
    input: CreateStripeCheckoutSessionInput,
  ): Promise<StripeCheckoutSessionResult> {
    const session = await this.stripe().checkout.sessions.create(
      {
        mode: 'subscription',
        customer: input.customerId,
        line_items: [{ price: input.priceId, quantity: 1 }],
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        client_reference_id: input.userId,
        metadata: {
          userId: input.userId,
          plan: input.plan,
        },
        subscription_data: {
          metadata: {
            userId: input.userId,
            plan: input.plan,
          },
        },
      },
      { idempotencyKey: input.idempotencyKey },
    );

    if (!session.url) {
      throw new Error('Stripe Checkout Session did not return a URL');
    }

    return {
      id: session.id,
      url: session.url,
      expiresAtUnix: session.expires_at ?? null,
    };
  }

  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    return this.stripe().webhooks.constructEvent(
      payload,
      signature,
      requireStripeWebhookSecret(this.config),
    );
  }

  async retrieveSubscription(subscriptionId: string): Promise<NormalizedStripeSubscription> {
    const sub = await this.stripe().subscriptions.retrieve(subscriptionId);
    return normalizeStripeSubscription(sub);
  }
}
