import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/types/auth-user';
import { THROTTLE_LIMITS } from '../config/throttle.config';
import { BillingService } from './billing.service';

@Controller('billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private billing: BillingService) {}

  /**
   * Start Stripe Hosted Checkout for Buyseek Plus.
   * Price, customer, and URLs are decided server-side — body must be empty.
   */
  @Throttle({ default: THROTTLE_LIMITS.write })
  @Post('checkout')
  async checkout(@CurrentUser() user: AuthUser) {
    const session = await this.billing.createPlusCheckoutSession(user.id);
    return {
      url: session.url,
      sessionId: session.sessionId,
    };
  }

  /** Public billing snapshot for Plan & Billing (no provider secrets). */
  @Get('status')
  async status(@CurrentUser() user: AuthUser) {
    return this.billing.getBillingStatus(user.id);
  }

  /** Schedule cancel_at_period_end on the user's Stripe subscription. */
  @Throttle({ default: THROTTLE_LIMITS.write })
  @Post('cancel')
  async cancel(@CurrentUser() user: AuthUser) {
    return this.billing.scheduleCancelAtPeriodEnd(user.id);
  }

  /** Undo scheduled cancellation (cancel_at_period_end=false). */
  @Throttle({ default: THROTTLE_LIMITS.write })
  @Post('resume')
  async resume(@CurrentUser() user: AuthUser) {
    return this.billing.resumeSubscription(user.id);
  }
}
