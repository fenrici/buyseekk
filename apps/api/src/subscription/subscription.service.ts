import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import {
  canUseEnterpriseFeatures as canUseEnterpriseFeaturesShared,
  canUsePlusFeatures as canUsePlusFeaturesShared,
  FREE_DAILY_OFFER_LIMIT,
  FREE_MAX_SMART_ALERTS,
  SUBSCRIPTION_LIMIT_MESSAGES,
} from '@buyseekk/shared';
import { PrismaService } from '../prisma/prisma.service';
import { isPlusFeaturesUnlocked } from './subscription.config';

type PlanUser = Pick<User, 'id' | 'subscriptionPlan'>;

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

  canUsePlusFeatures(user: Pick<User, 'subscriptionPlan'>): boolean {
    return canUsePlusFeaturesShared(user, this.plusFeaturesUnlocked());
  }

  canUseEnterpriseFeatures(user: Pick<User, 'subscriptionPlan'>): boolean {
    return canUseEnterpriseFeaturesShared(user, this.plusFeaturesUnlocked());
  }

  async assertDailyOfferLimit(seller: PlanUser) {
    if (this.canUsePlusFeatures(seller)) return;

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

  async assertSavedSearchLimit(user: PlanUser) {
    if (this.canUsePlusFeatures(user)) return;

    const count = await this.prisma.savedSearch.count({ where: { userId: user.id } });
    if (count >= FREE_MAX_SMART_ALERTS) {
      throw new BadRequestException(SUBSCRIPTION_LIMIT_MESSAGES.smartAlerts);
    }
  }
}
