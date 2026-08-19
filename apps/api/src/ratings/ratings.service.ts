import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OfferStatus, RatingType } from '@prisma/client';
import { parsePagination } from '@buyseekk/shared';
import { toPaginatedResponse } from '../common/utils/paginated-response';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRatingDto } from './ratings.dto';

export type UserRatingStats = {
  avgStars: number | null;
  reviewCount: number;
  noResponseCount: number;
};

@Injectable()
export class RatingsService {
  constructor(private prisma: PrismaService) {}

  private emptyStats(): UserRatingStats {
    return { avgStars: null, reviewCount: 0, noResponseCount: 0 };
  }

  async getStats(userId: string): Promise<UserRatingStats> {
    const map = await this.getStatsForUsers([userId]);
    return map[userId] ?? this.emptyStats();
  }

  async getStatsForUsers(userIds: string[]): Promise<Record<string, UserRatingStats>> {
    const unique = [...new Set(userIds)];
    if (unique.length === 0) return {};

    const [reviewStats, noResponses] = await Promise.all([
      this.prisma.rating.groupBy({
        by: ['toUserId'],
        where: { toUserId: { in: unique }, type: RatingType.REVIEW, stars: { not: null } },
        _avg: { stars: true },
        _count: { stars: true },
      }),
      this.prisma.rating.groupBy({
        by: ['toUserId'],
        where: { toUserId: { in: unique }, type: RatingType.NO_RESPONSE },
        _count: { _all: true },
      }),
    ]);

    const result: Record<string, UserRatingStats> = {};
    for (const id of unique) {
      result[id] = this.emptyStats();
    }

    for (const row of reviewStats) {
      const reviewCount = row._count.stars;
      const avg = row._avg.stars;
      result[row.toUserId] = {
        avgStars: avg != null ? Math.round(avg * 10) / 10 : null,
        reviewCount,
        noResponseCount: result[row.toUserId]?.noResponseCount ?? 0,
      };
    }
    for (const row of noResponses) {
      const current = result[row.toUserId] ?? this.emptyStats();
      result[row.toUserId] = { ...current, noResponseCount: row._count._all };
    }

    return result;
  }

  private async getNegotiationOfferContext(offerId: string, userId: string) {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        chat: { include: { messages: { select: { fromRole: true } } } },
        request: { select: { userId: true } },
      },
    });
    if (!offer) throw new NotFoundException('Oferta no encontrada');
    if (offer.status !== OfferStatus.ACEPTADA) {
      throw new BadRequestException('Solo podés valorar después de aceptar una oferta');
    }
    if (!offer.chat) {
      throw new BadRequestException('Se requiere contacto por chat (oferta aceptada)');
    }

    const isBuyer = offer.request.userId === userId;
    const isSeller = offer.sellerId === userId;
    if (!isBuyer && !isSeller) throw new ForbiddenException();

    const toUserId = isBuyer ? offer.sellerId : offer.request.userId;
    return { offer, isBuyer, isSeller, toUserId, chat: offer.chat };
  }

  private async getCompletedOfferContext(offerId: string, userId: string) {
    const ctx = await this.getNegotiationOfferContext(offerId, userId);
    if (!ctx.offer.dealCompletedAt) {
      throw new BadRequestException(
        'Solo podés dejar una valoración después de concretar la operación',
      );
    }
    return ctx;
  }

  async create(fromUserId: string, dto: CreateRatingDto) {
    const existing = await this.prisma.rating.findUnique({
      where: { fromUserId_offerId: { fromUserId, offerId: dto.offerId } },
    });
    if (existing) throw new ConflictException('Ya valoraste esta oferta');

    if (dto.type === RatingType.NO_RESPONSE) {
      const { offer, isSeller, toUserId, chat } = await this.getNegotiationOfferContext(
        dto.offerId,
        fromUserId,
      );
      if (offer.negotiationEndedAt) {
        throw new BadRequestException('La negociación ya fue finalizada');
      }
      if (!isSeller) {
        throw new ForbiddenException('Solo el vendedor puede marcar falta de respuesta');
      }
      const buyerReplied = chat.messages.some((m) => m.fromRole === 'buyer');
      if (buyerReplied) {
        throw new BadRequestException(
          'El comprador respondió en el chat — usá una valoración con estrellas',
        );
      }
      return this.prisma.rating.create({
        data: {
          fromUserId,
          toUserId,
          offerId: offer.id,
          type: RatingType.NO_RESPONSE,
          comment: dto.comment?.trim() || 'El comprador no respondió en el chat',
        },
      });
    }

    const { toUserId } = await this.getCompletedOfferContext(dto.offerId, fromUserId);

    if (!dto.stars || dto.stars < 1 || dto.stars > 5) {
      throw new BadRequestException('Las valoraciones requieren entre 1 y 5 estrellas');
    }

    return this.prisma.rating.create({
      data: {
        fromUserId,
        toUserId,
        offerId: dto.offerId,
        type: RatingType.REVIEW,
        stars: dto.stars,
        comment: dto.comment?.trim(),
      },
    });
  }

  async pending(userId: string, page?: number, limit?: number) {
    const { page: safePage, limit: safeLimit, skip } = parsePagination(page, limit);

    const offers = await this.prisma.offer.findMany({
      where: {
        dealCompletedAt: { not: null },
        status: OfferStatus.ACEPTADA,
        chat: { isNot: null },
        OR: [{ sellerId: userId }, { request: { userId } }],
      },
      include: {
        chat: { select: { id: true } },
        seller: { select: { id: true, name: true, avatarUrl: true } },
        request: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
      },
      orderBy: { dealCompletedAt: 'desc' },
    });

    const rated = await this.prisma.rating.findMany({
      where: { fromUserId: userId, offerId: { in: offers.map((o) => o.id) } },
      select: { offerId: true },
    });
    const ratedSet = new Set(rated.map((r) => r.offerId));

    const pending = offers
      .filter((o) => !ratedSet.has(o.id))
      .map((o) => {
        const isBuyer = o.request.userId === userId;
        return {
          offerId: o.id,
          requestTitle: o.requestTitle,
          chatId: o.chat?.id,
          partner: isBuyer
            ? { id: o.seller.id, name: o.seller.name, avatarUrl: o.seller.avatarUrl, role: 'seller' as const }
            : { id: o.request.user.id, name: o.request.user.name, avatarUrl: o.request.user.avatarUrl, role: 'buyer' as const },
          myRole: isBuyer ? ('buyer' as const) : ('seller' as const),
        };
      });

    const total = pending.length;
    const items = pending.slice(skip, skip + safeLimit);
    return toPaginatedResponse(items, total, safePage, safeLimit);
  }

  async forOffer(offerId: string, userId: string) {
    const { offer, isBuyer, toUserId, chat } = await this.getNegotiationOfferContext(
      offerId,
      userId,
    );
    const partner = await this.prisma.user.findUnique({
      where: { id: toUserId },
      select: { id: true, name: true, avatarUrl: true },
    });
    if (!partner) throw new NotFoundException();

    const mine = await this.prisma.rating.findUnique({
      where: { fromUserId_offerId: { fromUserId: userId, offerId } },
    });
    const partnerStats = await this.getStats(toUserId);
    const buyerReplied = chat.messages.some((m) => m.fromRole === 'buyer');
    const dealCompleted = offer.dealCompletedAt != null;
    const negotiationEnded = offer.negotiationEndedAt != null;

    return {
      offerId,
      myRole: isBuyer ? ('buyer' as const) : ('seller' as const),
      partner: { ...partner, stats: partnerStats },
      myRating: mine,
      canMarkNoResponse: !isBuyer && !buyerReplied && !mine && !dealCompleted && !negotiationEnded,
      canReview: dealCompleted && !mine,
      dealCompleted,
      negotiationEnded,
    };
  }
}
