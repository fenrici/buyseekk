import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Locale, OfferStatus, RatingType, SellerType, UserMode } from '@prisma/client';
import {
  canEnterMode,
  hasCompletedSellerProfile,
  parseSellerFiltersJson,
  roleAfterEnablingSeller,
} from '@buyseekk/shared';
import { validateImageUrls } from '../common/utils/image-urls';
import { assertAccountActive } from '../common/utils/assert-not-blocked';
import { RatingsService } from '../ratings/ratings.service';
import { PrismaService } from '../prisma/prisma.service';
import { LastSearchFiltersDto, SellerProfileDto, UpdateProfileDto } from './users.dto';

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
    assertAccountActive(current);

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

  private toSafeUser<T extends { passwordHash: string }>(user: T) {
    const { passwordHash: _drop, ...safe } = user;
    return safe;
  }

  async getSettings(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return this.toSafeUser(user);
  }

  async updateLanguage(userId: string, locale: Locale) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { locale },
    });
    return this.toSafeUser(updated);
  }

  /**
   * Cambia el modo de uso activo. No otorga permisos: para entrar en modo vendedor
   * la cuenta debe tener la capacidad SELLER (role BOTH/SELLER) y un perfil de vendedor.
   */
  async updateActiveMode(userId: string, activeMode: UserMode) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (!canEnterMode(activeMode, user)) {
      throw new BadRequestException('Necesitás completar tu perfil de vendedor');
    }

    if (user.activeMode === activeMode) return this.toSafeUser(user);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { activeMode },
    });
    return this.toSafeUser(updated);
  }

  /**
   * Onboarding de vendedor (una sola vez): habilita la capacidad SELLER conservando
   * la de comprador (role BOTH), guarda tipo y rubro, y activa el modo vendedor.
   */
  async createSellerProfile(userId: string, dto: SellerProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    assertAccountActive(user);

    const isBusiness = dto.sellerType === SellerType.BUSINESS;
    const nextRole = roleAfterEnablingSeller(user.role);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        role: nextRole,
        activeMode: UserMode.SELLER,
        sellerType: dto.sellerType,
        sellerCategory: dto.sellerCategory,
        businessName: isBusiness ? dto.businessName?.trim() || null : null,
        city: dto.city?.trim() || user.city || null,
      },
    });
    return this.toSafeUser(updated);
  }

  async updateSellerProfile(userId: string, dto: SellerProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    assertAccountActive(user);
    if (!hasCompletedSellerProfile(user)) {
      throw new BadRequestException('Todavía no tenés un perfil de vendedor');
    }

    const isBusiness = dto.sellerType === SellerType.BUSINESS;
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        sellerType: dto.sellerType,
        sellerCategory: dto.sellerCategory,
        businessName: isBusiness ? dto.businessName?.trim() || null : null,
        city: dto.city?.trim() || user.city || null,
      },
    });
    return this.toSafeUser(updated);
  }

  async updateLastSearchFilters(userId: string, dto: LastSearchFiltersDto) {
    const parsed = parseSellerFiltersJson(dto.filters);
    if (!parsed) throw new BadRequestException('Filtros inválidos');
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { lastSellerFilters: parsed },
    });
    return this.toSafeUser(updated);
  }
}
