import { Injectable, NotFoundException } from '@nestjs/common';
import { OfferStatus, RatingType, SellerType } from '@prisma/client';
import { validateImageUrls } from '../common/utils/image-urls';
import { RatingsService } from '../ratings/ratings.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './users.dto';

const PUBLIC_PROFILE_SELECT = {
  id: true,
  name: true,
  role: true,
  sellerType: true,
  sellerCategory: true,
  country: true,
  avatarUrl: true,
  bio: true,
  businessName: true,
  website: true,
  city: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private ratings: RatingsService,
  ) {}

  async getRatingSummary(userId: string) {
    const stats = await this.ratings.getStats(userId);
    return {
      average: stats.avgStars ?? 0,
      count: stats.reviewCount,
      noResponseCount: stats.noResponseCount,
    };
  }

  async getPublicProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: PUBLIC_PROFILE_SELECT,
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const [rating, completedDeals, recentReviews] = await Promise.all([
      this.ratings.getStats(userId),
      this.prisma.offer.count({
        where: {
          status: OfferStatus.ACEPTADA,
          OR: [{ sellerId: userId }, { request: { userId } }],
        },
      }),
      this.prisma.rating.findMany({
        where: { toUserId: userId, type: RatingType.REVIEW, stars: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          stars: true,
          comment: true,
          createdAt: true,
          fromUser: { select: { id: true, name: true, avatarUrl: true } },
        },
      }),
    ]);

    return { ...user, rating, completedDeals, recentReviews };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const current = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!current) throw new NotFoundException('Usuario no encontrado');

    if (dto.avatarUrl?.trim()) validateImageUrls([dto.avatarUrl.trim()]);

    const clean = (value?: string) => {
      if (value === undefined) return undefined;
      const trimmed = value.trim();
      return trimmed ? trimmed : null;
    };

    const isBusiness = current.sellerType === SellerType.BUSINESS;
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name?.trim() || undefined,
        bio: clean(dto.bio),
        city: clean(dto.city),
        avatarUrl: clean(dto.avatarUrl),
        businessName: isBusiness ? clean(dto.businessName) : undefined,
        website: isBusiness ? clean(dto.website) : undefined,
      },
    });

    const { passwordHash: _, ...safe } = updated;
    return safe;
  }
}
