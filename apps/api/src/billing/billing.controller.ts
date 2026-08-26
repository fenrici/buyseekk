import { Controller, Post, UseGuards } from '@nestjs/common';
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
}
