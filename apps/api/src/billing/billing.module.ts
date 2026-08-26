import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BillingController } from './billing.controller';
import { BillingWebhookController } from './billing-webhook.controller';
import { BillingService } from './billing.service';
import { StripeWebhookService } from './stripe-webhook.service';
import { STRIPE_BILLING_PROVIDER } from './stripe/stripe-billing.provider';
import { StripeSdkBillingProvider } from './stripe/stripe-sdk.billing-provider';

@Module({
  controllers: [BillingController, BillingWebhookController],
  providers: [
    BillingService,
    StripeWebhookService,
    {
      provide: STRIPE_BILLING_PROVIDER,
      useFactory: (config: ConfigService) => new StripeSdkBillingProvider(config),
      inject: [ConfigService],
    },
  ],
  exports: [BillingService, StripeWebhookService],
})
export class BillingModule {}
