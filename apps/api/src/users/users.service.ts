import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BusinessType, Locale, RatingType, SellerType, UserMode, UserRole } from '@prisma/client';
import {
  canEnterMode,
  canSendOffers,
  hasCompletedSellerProfile,
  mergeNotificationPreferences,
  parseNotificationPreferences,
  parseSellerFiltersJson,
  roleAfterEnablingSeller,
} from '@buyseekk/shared';
import { validateImageUrls, assertOwnedImageUrls } from '../common/utils/image-urls';
import { assertAccountActive } from '../common/utils/assert-not-blocked';
import { toAccountUser } from '../common/utils/account-avatars';
import { RatingsService } from '../ratings/ratings.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageObjectsService } from '../storage/storage-objects.service';
import { LastSearchFiltersDto, SellerProfileDto, UpdatePreferencesDto, UpdateProfileDto, UpdateSellerChatSettingsDto, UpdateSellerProfileDto } from './users.dto';

const PUBLIC_PROFILE_SELECT = {
  id: true,
  name: true,
  role: true,
  sellerType: true,
  sellerCategory: true,
  businessType: true,
  country: true,
  buyerAvatarUrl: true,
  sellerAvatarUrl: true,
  bio: true,
  businessName: true,
  website: true,
  state: true,
  city: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private ratings: RatingsService,
    private storageObjects: StorageObjectsService,
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
          dealCompletedAt: { not: null },
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
          fromUser: { select: { id: true, name: true, buyerAvatarUrl: true } },
        },
      }),
    ]);

    return {
      ...user,
      rating,
      completedDeals,
      avatarUrl: user.sellerAvatarUrl ?? user.buyerAvatarUrl ?? null,
      recentReviews: recentReviews.map((review) => ({
        ...review,
        fromUser: {
          id: review.fromUser.id,
          name: review.fromUser.name,
          avatarUrl: review.fromUser.buyerAvatarUrl,
        },
      })),
    };
  }

  private cleanOptional(value?: string) {
    if (value === undefined) return undefined;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const current = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!current) throw new NotFoundException('Usuario no encontrado');
    assertAccountActive(current);

    if (dto.buyerAvatarUrl?.trim() || dto.avatarUrl?.trim()) {
      const nextBuyer = (dto.buyerAvatarUrl ?? dto.avatarUrl)!.trim();
      validateImageUrls([nextBuyer]);
      assertOwnedImageUrls([nextBuyer], userId, current.buyerAvatarUrl ? [current.buyerAvatarUrl] : []);
    }

    const isCompany = current.sellerType === SellerType.COMPANY;
    const nextBuyerAvatar =
      dto.buyerAvatarUrl !== undefined
        ? this.cleanOptional(dto.buyerAvatarUrl)
        : dto.avatarUrl !== undefined
          ? this.cleanOptional(dto.avatarUrl)
          : undefined;
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name?.trim() || undefined,
        bio: this.cleanOptional(dto.bio),
        state: this.cleanOptional(dto.state),
        city: this.cleanOptional(dto.city),
        buyerAvatarUrl: nextBuyerAvatar,
        businessName: isCompany ? this.cleanOptional(dto.businessName) : undefined,
        businessType: isCompany && dto.businessType !== undefined ? dto.businessType : undefined,
        website: isCompany ? this.cleanOptional(dto.website) : undefined,
      },
    });

    await this.storageObjects.deleteRemovedBestEffort(
      [current.buyerAvatarUrl],
      [updated.buyerAvatarUrl],
      userId,
    );
    return this.toSafeUser(updated);
  }

  private toSafeUser<T extends { passwordHash: string; buyerAvatarUrl?: string | null }>(user: T) {
    return toAccountUser(user);
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

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    assertAccountActive(user);

    const data: {
      preferredMode?: UserMode;
      notificationPreferences?: ReturnType<typeof mergeNotificationPreferences>;
    } = {};

    if (dto.preferredMode !== undefined) {
      if (!canEnterMode(dto.preferredMode, user)) {
        throw new BadRequestException('Necesitás completar tu perfil de vendedor');
      }
      data.preferredMode = dto.preferredMode;
    }

    if (dto.notificationPreferences) {
      const current = parseNotificationPreferences(user.notificationPreferences);
      data.notificationPreferences = mergeNotificationPreferences(current, dto.notificationPreferences);
    }

    if (!Object.keys(data).length) return this.toSafeUser(user);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
    });
    return this.toSafeUser(updated);
  }

  async updateActiveMode(userId: string, activeMode: UserMode) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (!canEnterMode(activeMode, user)) {
      throw new BadRequestException('Necesitás completar tu perfil de vendedor');
    }

    if (user.activeMode === activeMode) return this.toSafeUser(user);

    const data: { activeMode: UserMode; preferredMode: UserMode; role?: UserRole } = {
      activeMode,
      preferredMode: activeMode,
    };
    if (activeMode === UserMode.BUYER && user.role === UserRole.SELLER) {
      data.role = UserRole.BOTH;
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
    });
    return this.toSafeUser(updated);
  }

  private sellerProfileData(dto: SellerProfileDto | UpdateSellerProfileDto) {
    const isCompany = dto.sellerType === SellerType.COMPANY;
    return {
      sellerType: dto.sellerType,
      sellerCategory: dto.sellerCategory,
      ...(dto.state !== undefined ? { state: dto.state.trim() } : {}),
      ...(dto.city !== undefined ? { city: dto.city.trim() } : {}),
      ...(dto.sellerAvatarUrl !== undefined ? { sellerAvatarUrl: this.cleanOptional(dto.sellerAvatarUrl) } : {}),
      ...(isCompany
        ? {
            ...(dto.businessName !== undefined
              ? { businessName: dto.businessName?.trim() || null }
              : {}),
            ...(dto.businessType !== undefined ? { businessType: dto.businessType } : {}),
            ...(dto.website !== undefined ? { website: this.cleanOptional(dto.website) } : {}),
          }
        : {}),
    };
  }

  async createSellerProfile(userId: string, dto: SellerProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    assertAccountActive(user);

    if (dto.sellerAvatarUrl?.trim()) {
      validateImageUrls([dto.sellerAvatarUrl.trim()]);
      assertOwnedImageUrls(
        [dto.sellerAvatarUrl.trim()],
        userId,
        user.sellerAvatarUrl ? [user.sellerAvatarUrl] : [],
      );
    }

    const nextRole = roleAfterEnablingSeller(user.role);
    const profileData = this.sellerProfileData(dto);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        role: nextRole,
        activeMode: UserMode.SELLER,
        ...profileData,
      },
    });
    await this.storageObjects.deleteRemovedBestEffort(
      [user.sellerAvatarUrl],
      [updated.sellerAvatarUrl],
      userId,
    );
    return this.toSafeUser(updated);
  }

  async updateSellerProfile(userId: string, dto: UpdateSellerProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    assertAccountActive(user);
    if (!hasCompletedSellerProfile(user)) {
      throw new BadRequestException('Todavía no tenés un perfil de vendedor');
    }

    if (dto.sellerAvatarUrl?.trim()) {
      validateImageUrls([dto.sellerAvatarUrl.trim()]);
      assertOwnedImageUrls(
        [dto.sellerAvatarUrl.trim()],
        userId,
        user.sellerAvatarUrl ? [user.sellerAvatarUrl] : [],
      );
    }

    const profileData = this.sellerProfileData(dto);
    if (dto.sellerType === SellerType.COMPANY) {
      const nextBusinessName =
        dto.businessName !== undefined ? dto.businessName.trim() : user.businessName?.trim();
      if (!nextBusinessName) {
        throw new BadRequestException('Completá el nombre comercial');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: profileData,
    });
    await this.storageObjects.deleteRemovedBestEffort(
      [user.sellerAvatarUrl],
      [updated.sellerAvatarUrl],
      userId,
    );
    return this.toSafeUser(updated);
  }

  canUserSendOffers(user: {
    role: UserRole;
    sellerType: SellerType | null;
    sellerCategory: string | null;
    businessName: string | null;
    businessType: BusinessType | null;
    state: string | null;
    city: string | null;
  }) {
    return canSendOffers(user);
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

  async updateSellerChatSettings(userId: string, dto: UpdateSellerChatSettingsDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    assertAccountActive(user);
    if (!hasCompletedSellerProfile(user)) {
      throw new BadRequestException('Todavía no tenés un perfil de vendedor');
    }

    let defaultAcceptMessage: string | null | undefined;
    if (dto.defaultAcceptMessage !== undefined) {
      const trimmed = dto.defaultAcceptMessage?.trim() ?? '';
      if (trimmed.length > 0 && trimmed.length < 5) {
        throw new BadRequestException('El mensaje debe tener al menos 5 caracteres');
      }
      defaultAcceptMessage = trimmed.length > 0 ? trimmed : null;
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { defaultAcceptMessage },
    });
    return this.toSafeUser(updated);
  }
}
