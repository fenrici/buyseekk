import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { STRIPE_BILLING_PROVIDER } from './stripe/stripe-billing.provider';
import { StripeSdkBillingProvider } from './stripe/stripe-sdk.billing-provider';

@Module({
  controllers: [BillingController],
  providers: [
    BillingService,
    {
      provide: STRIPE_BILLING_PROVIDER,
      useFactory: (config: ConfigService) => new StripeSdkBillingProvider(config),
      inject: [ConfigService],
    },
  ],
  exports: [BillingService],
})
export class BillingModule {}
