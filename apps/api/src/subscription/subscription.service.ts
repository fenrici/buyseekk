import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionStatus, User } from '@prisma/client';
import {
  FREE_DAILY_OFFER_LIMIT,
  FREE_MAX_SMART_ALERTS,
  SUBSCRIPTION_LIMIT_MESSAGES,
  anySubscriptionGrantsPlus,
  planFromPlusEntitlement,
  resolvePlusEntitlement,
  type SubscriptionEntitlementInput,
  type SubscriptionPlan,
} from '@buyseekk/shared';
import { PrismaService } from '../prisma/prisma.service';
import { isPlusFeaturesUnlocked } from './subscription.config';

type EntitlementUser = Pick<User, 'id'>;

/** Statuses that may still grant Plus (including CANCELED until period end). */
const ENTITLEMENT_CANDIDATE_STATUSES: SubscriptionStatus[] = [
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.TRIALING,
  SubscriptionStatus.PAST_DUE,
  SubscriptionStatus.CANCELED,
];

function startOfUtcDay(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

@Injectable()
export class SubscriptionService {
  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  plusFeaturesUnlocked(): boolean {
    return isPlusFeaturesUnlocked(this.config);
  }

  /**
   * Central Plus entitlement (authorization):
   * 1) PLUS_FEATURES_UNLOCKED global bypass
   * 2) provider Subscription rows that currently grant Plus
   * User.subscriptionPlan is never consulted — it is display/cache only.
   */
  async hasPlusEntitlement(user: EntitlementUser, now: Date = new Date()): Promise<boolean> {
    if (this.plusFeaturesUnlocked()) return true;

    const rows = await this.prisma.subscription.findMany({
      where: {
        userId: user.id,
        status: { in: ENTITLEMENT_CANDIDATE_STATUSES },
      },
      select: {
        status: true,
        currentPeriodEnd: true,
      },
    });

    return resolvePlusEntitlement({
      plusFeaturesUnlocked: false,
      subscriptions: rows as SubscriptionEntitlementInput[],
      now,
    });
  }

  /**
   * @deprecated Unlock-only sync helper. Does not read plan cache or Subscription rows.
   * Use hasPlusEntitlement for real authorization.
   */
  canUsePlusFeatures(_user?: Pick<User, 'subscriptionPlan'>): boolean {
    return this.plusFeaturesUnlocked();
  }

  /**
   * @deprecated Enterprise is not sold. Never grants from plan cache.
   * Unlock still bypasses for launch.
   */
  canUseEnterpriseFeatures(_user?: Pick<User, 'subscriptionPlan'>): boolean {
    return this.plusFeaturesUnlocked();
  }

  /**
   * Mirror live Subscription entitlement onto User.subscriptionPlan (FREE | PLUS).
   * Idempotent. ENTERPRISE cache is normalized to FREE when no granting sub exists.
   * Intended for future Stripe/Apple/Google webhook handlers.
   */
  async syncPlanCacheFromEntitlements(userId: string, now: Date = new Date()): Promise<SubscriptionPlan> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, subscriptionPlan: true },
    });
    if (!user) return 'FREE';

    const rows = await this.prisma.subscription.findMany({
      where: {
        userId,
        status: { in: ENTITLEMENT_CANDIDATE_STATUSES },
      },
      select: { status: true, currentPeriodEnd: true },
    });

    const hasPlus = anySubscriptionGrantsPlus(rows as SubscriptionEntitlementInput[], now);
    const next: SubscriptionPlan = planFromPlusEntitlement(hasPlus);

    if (next !== user.subscriptionPlan) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { subscriptionPlan: next },
      });
    }

    return next;
  }

  async assertDailyOfferLimit(seller: EntitlementUser) {
    if (await this.hasPlusEntitlement(seller)) return;

    const count = await this.prisma.offer.count({
      where: {
        sellerId: seller.id,
        createdAt: { gte: startOfUtcDay() },
      },
    });

    if (count >= FREE_DAILY_OFFER_LIMIT) {
      throw new BadRequestException(SUBSCRIPTION_LIMIT_MESSAGES.dailyOffers);
    }
  }

  async assertSavedSearchLimit(user: EntitlementUser) {
    if (await this.hasPlusEntitlement(user)) return;

    const count = await this.prisma.savedSearch.count({ where: { userId: user.id } });
    if (count >= FREE_MAX_SMART_ALERTS) {
      throw new BadRequestException(SUBSCRIPTION_LIMIT_MESSAGES.smartAlerts);
    }
  }
}
