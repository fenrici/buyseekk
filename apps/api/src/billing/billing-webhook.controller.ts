import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  Req,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import Stripe from 'stripe';
import { isStripeBillingEnabled } from './billing.config';
import { ConfigService } from '@nestjs/config';
import { StripeWebhookService } from './stripe-webhook.service';

@Controller('billing/webhooks')
export class BillingWebhookController {
  private readonly logger = new Logger(BillingWebhookController.name);

  constructor(
    private webhooks: StripeWebhookService,
    private config: ConfigService,
  ) {}

  /**
   * Stripe-signed webhook. No JWT — authenticity is the Stripe-Signature header
   * verified against the raw request body bytes.
   */
  @SkipThrottle()
  @Post('stripe')
  @HttpCode(200)
  async handleStripe(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string | undefined,
  ) {
    if (!isStripeBillingEnabled(this.config)) {
      throw new ServiceUnavailableException({
        statusCode: 503,
        code: 'BILLING_UNAVAILABLE',
        message: 'Stripe billing is not enabled',
      });
    }

    if (!signature?.trim()) {
      throw new BadRequestException('Missing Stripe-Signature header');
    }

    const rawBody = req.rawBody;
    if (!rawBody || !Buffer.isBuffer(rawBody)) {
      this.logger.error('Stripe webhook missing rawBody — is Nest rawBody enabled?');
      throw new BadRequestException('Raw body required for Stripe signature verification');
    }

    let event: Stripe.Event;
    try {
      event = this.webhooks.verifyAndParse(rawBody, signature);
    } catch (err) {
      this.logger.warn(
        `Invalid Stripe webhook signature: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new BadRequestException('Invalid Stripe webhook signature');
    }

    this.logger.log(`Stripe webhook received id=${event.id} type=${event.type}`);
    return this.webhooks.handleEvent(event);
  }
}
