import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OfferStatus, RequestStatus } from '@prisma/client';
import {
  comparePrices,
  parsePagination,
  pickOfferHighlights,
  type OfferForHighlight,
  toPaginatedResult,
} from '@buyseekk/shared';
import { assertValidMoneyAmount } from '../common/utils/money-limits';
import { assertCleanPublicText, assertOfferSpamLimits } from '../common/utils/spam-content';
import { assertValidImageUrls } from '../common/utils/image-urls';
import { RatingsService } from '../ratings/ratings.service';
import { PrismaService } from '../prisma/prisma.service';
import { inactiveCutoff } from '../requests/request-status';
import { CreateOfferDto } from './offers.dto';

@Injectable()
export class OffersService {
  constructor(
    private prisma: PrismaService,
    private ratings: RatingsService,
  ) {}

  private withComparison<T extends { price: number; currency: string; requestBudget: number }>(offer: T) {
    const comparison = comparePrices(
      offer.requestBudget,
      offer.price,
      offer.currency as 'ARS' | 'USD',
    );
    return { ...offer, comparison };
  }

  async create(sellerId: string, dto: CreateOfferDto) {
    const request = await this.prisma.request.findUnique({
      where: { id: dto.requestId },
      include: { offers: { where: { sellerId } } },
    });

    if (!request || !request.active) throw new NotFoundException('Solicitud no encontrada');
    if (request.status === RequestStatus.CERRADA) {
      throw new BadRequestException('La solicitud está cerrada y no acepta nuevas ofertas');
    }
    if (request.lastActivityAt < inactiveCutoff()) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    const seller = await this.prisma.user.findUnique({ where: { id: sellerId } });
    if (!seller) throw new ForbiddenException();
    if (seller.country !== request.country) {
      throw new ForbiddenException('Solo podés ofertar en solicitudes de tu país');
    }

    if (request.userId === sellerId) {
      throw new BadRequestException('No podés ofertar en tu propia solicitud');
    }
    if (request.offers.length > 0) {
      throw new ConflictException('Ya enviaste una oferta para esta solicitud');
    }
    assertValidImageUrls(dto.imageUrls, 'producto');
    assertCleanPublicText(dto.message, 'la propuesta');
    assertValidMoneyAmount(
      dto.price,
      dto.currency,
      'precio',
      request.budgetPeriod != null || request.operation === 'ALQUILER',
    );
    await assertOfferSpamLimits(this.prisma, sellerId, dto.message);

    const offer = await this.prisma.offer.create({
      data: {
        requestId: dto.requestId,
        sellerId,
        price: dto.price,
        currency: dto.currency,
        message: dto.message,
        imageUrls: dto.imageUrls!,
        requestTitle: request.title,
        requestBudget: request.budget,
        requestBudgetPeriod: request.budgetPeriod,
        requestRequirements: request.requirements,
        requestLocation: request.location,
      },
      include: {
        seller: { select: { id: true, name: true, country: true } },
        request: { select: { id: true, title: true, imageUrls: true } },
      },
    });

    // Una oferta nueva cuenta como actividad de la solicitud
    await this.prisma.request.update({
      where: { id: dto.requestId },
      data: { lastActivityAt: new Date() },
    });

    return this.withComparison(offer);
  }

  async received(userId: string, page?: number, limit?: number) {
    const { page: safePage, limit: safeLimit, skip } = parsePagination(page, limit);

    const where = {
      status: OfferStatus.PENDIENTE,
      request: { userId, active: true },
    };

    const [offers, total] = await Promise.all([
      this.prisma.offer.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
        include: {
          seller: { select: { id: true, name: true, country: true, avatarUrl: true, sellerType: true, businessName: true } },
          request: { select: { id: true, title: true, imageUrls: true, currency: true } },
        },
      }),
      this.prisma.offer.count({ where }),
    ]);

    const ratingMap = await this.ratings.getStatsForUsers(offers.map((o) => o.sellerId));

    const items = offers.map((o) => ({
      ...this.withComparison(o),
      seller: {
        ...o.seller,
        rating: ratingMap[o.sellerId] ?? { avgStars: null, reviewCount: 0, noResponseCount: 0 },
      },
    }));

    return toPaginatedResult(items, total, safePage, safeLimit);
  }

  async receivedHighlights(userId: string) {
    const offers = await this.prisma.offer.findMany({
      where: {
        status: OfferStatus.PENDIENTE,
        request: { userId, active: true },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            sellerType: true,
            businessName: true,
          },
        },
        request: { select: { imageUrls: true } },
      },
    });

    if (!offers.length) return { highlights: [] as ReturnType<typeof pickOfferHighlights> };

    const ratingMap = await this.ratings.getStatsForUsers(offers.map((o) => o.sellerId));

    const forHighlight: OfferForHighlight[] = offers.map((o) => ({
      id: o.id,
      price: o.price,
      currency: o.currency,
      message: o.message,
      imageUrls: o.imageUrls,
      requestImageUrls: o.request.imageUrls,
      requestTitle: o.requestTitle,
      requestBudget: o.requestBudget,
      requestBudgetPeriod: o.requestBudgetPeriod,
      requestRequirements: o.requestRequirements,
      requestLocation: o.requestLocation,
      seller: {
        name: o.seller.name,
        businessName: o.seller.businessName,
        avatarUrl: o.seller.avatarUrl,
        sellerType: o.seller.sellerType,
        rating: ratingMap[o.sellerId] ?? { avgStars: null, reviewCount: 0, noResponseCount: 0 },
      },
    }));

    return { highlights: pickOfferHighlights(forHighlight) };
  }

  async sent(sellerId: string, page?: number, limit?: number) {
    const { page: safePage, limit: safeLimit, skip } = parsePagination(page, limit);

    const where = { sellerId };

    const [offers, total] = await Promise.all([
      this.prisma.offer.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
        include: {
          seller: { select: { id: true, name: true } },
          request: {
            select: {
              id: true,
              title: true,
              imageUrls: true,
              user: { select: { id: true, name: true, avatarUrl: true } },
            },
          },
          chat: { select: { id: true } },
        },
      }),
      this.prisma.offer.count({ where }),
    ]);

    const items = offers.map((o) => ({
      ...this.withComparison(o),
      chatId: o.chat?.id ?? null,
    }));

    return toPaginatedResult(items, total, safePage, safeLimit);
  }

  async getComparison(offerId: string, userId: string) {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        seller: { select: { id: true, name: true } },
        request: { select: { id: true, userId: true, title: true, imageUrls: true } },
      },
    });
    if (!offer) throw new NotFoundException('Oferta no encontrada');

    const isBuyer = offer.request.userId === userId;
    const isSeller = offer.sellerId === userId;
    if (!isBuyer && !isSeller) throw new ForbiddenException();

    return {
      offer: this.withComparison(offer),
      request: {
        title: offer.requestTitle,
        budget: offer.requestBudget,
        budgetPeriod: offer.requestBudgetPeriod,
        requirements: offer.requestRequirements,
        location: offer.requestLocation,
        imageUrls: offer.request.imageUrls,
      },
    };
  }

  async accept(offerId: string, buyerId: string) {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: { request: true },
    });
    if (!offer) throw new NotFoundException('Oferta no encontrada');
    if (offer.request.userId !== buyerId) throw new ForbiddenException();

    const { updated, chat } = await this.prisma.$transaction(async (tx) => {
      const alreadyAccepted = await tx.offer.findFirst({
        where: { requestId: offer.requestId, status: OfferStatus.ACEPTADA },
      });
      if (alreadyAccepted) {
        throw new BadRequestException('Ya hay una oferta aceptada para esta solicitud');
      }

      const acceptResult = await tx.offer.updateMany({
        where: { id: offerId, status: OfferStatus.PENDIENTE },
        data: { status: OfferStatus.ACEPTADA, acceptedAt: new Date() },
      });
      if (acceptResult.count === 0) {
        throw new BadRequestException('La oferta ya fue procesada');
      }

      await tx.offer.updateMany({
        where: {
          requestId: offer.requestId,
          id: { not: offerId },
          status: OfferStatus.PENDIENTE,
        },
        data: { status: OfferStatus.RECHAZADA },
      });

      const updatedOffer = await tx.offer.findUniqueOrThrow({
        where: { id: offerId },
        include: {
          seller: { select: { id: true, name: true } },
          request: { select: { id: true, title: true } },
        },
      });

      const newChat = await tx.chat.create({
        data: {
          offerId,
          messages: {
            create: [
              {
                fromRole: 'system',
                text: `Oferta aceptada. ${offer.requestTitle} — ${offer.price}. ¡Pueden coordinar los detalles!`,
              },
              {
                fromRole: 'seller',
                text: '¡Hola! Gracias por aceptar mi oferta. ¿Cuándo podemos coordinar?',
              },
            ],
          },
        },
      });

      // El comprador abrió la negociación: estado NEGOCIANDO + actividad
      await tx.request.updateMany({
        where: { id: offer.requestId, status: RequestStatus.ACTIVA },
        data: { status: RequestStatus.NEGOCIANDO },
      });
      await tx.request.update({
        where: { id: offer.requestId },
        data: { lastActivityAt: new Date() },
      });

      return { updated: updatedOffer, chat: newChat };
    });

    return { ...this.withComparison(updated), chatId: chat.id };
  }

  async reject(offerId: string, buyerId: string) {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: { request: true },
    });
    if (!offer) throw new NotFoundException('Oferta no encontrada');
    if (offer.request.userId !== buyerId) throw new ForbiddenException();

    const result = await this.prisma.offer.updateMany({
      where: { id: offerId, status: OfferStatus.PENDIENTE },
      data: { status: OfferStatus.RECHAZADA },
    });
    if (result.count === 0) {
      throw new BadRequestException('La oferta ya fue procesada');
    }

    // Rechazar también es respuesta del comprador: cuenta como actividad
    await this.prisma.request.update({
      where: { id: offer.requestId },
      data: { lastActivityAt: new Date() },
    });

    const updated = await this.prisma.offer.findUniqueOrThrow({ where: { id: offerId } });
    return this.withComparison(updated);
  }
}
