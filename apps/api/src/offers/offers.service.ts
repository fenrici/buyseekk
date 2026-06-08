import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OfferStatus } from '@prisma/client';
import { comparePrices, MAX_IMAGES_PER_ENTITY } from '../lib/business-rules';
import { RatingsService } from '../ratings/ratings.service';
import { PrismaService } from '../prisma/prisma.service';
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
    if (request.userId === sellerId) {
      throw new BadRequestException('No podés ofertar en tu propia solicitud');
    }
    if (request.offers.length > 0) {
      throw new ConflictException('Ya enviaste una oferta para esta solicitud');
    }
    if (!dto.imageUrls?.length) {
      throw new BadRequestException('Subí al menos una foto del producto');
    }
    if (dto.imageUrls.length > MAX_IMAGES_PER_ENTITY) {
      throw new BadRequestException(`Máximo ${MAX_IMAGES_PER_ENTITY} imágenes por oferta`);
    }

    const offer = await this.prisma.offer.create({
      data: {
        requestId: dto.requestId,
        sellerId,
        price: dto.price,
        currency: dto.currency,
        message: dto.message,
        imageUrls: dto.imageUrls,
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

    return this.withComparison(offer);
  }

  async received(userId: string) {
    const offers = await this.prisma.offer.findMany({
      where: {
        status: OfferStatus.PENDIENTE,
        request: { userId, active: true },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        seller: { select: { id: true, name: true, country: true } },
        request: { select: { id: true, title: true, imageUrls: true, currency: true } },
      },
    });
    return Promise.all(
      offers.map(async (o) => ({
        ...this.withComparison(o),
        seller: {
          ...o.seller,
          rating: await this.ratings.getStats(o.sellerId),
        },
      })),
    );
  }

  async sent(sellerId: string) {
    const offers = await this.prisma.offer.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
      include: {
        seller: { select: { id: true, name: true } },
        request: { select: { id: true, title: true, imageUrls: true, user: { select: { id: true, name: true } } } },
        chat: { select: { id: true } },
      },
    });
    return offers.map((o) => ({
      ...this.withComparison(o),
      chatId: o.chat?.id ?? null,
    }));
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
    if (offer.status !== OfferStatus.PENDIENTE) {
      throw new BadRequestException('La oferta ya fue procesada');
    }

    const { updated, chat } = await this.prisma.$transaction(async (tx) => {
      await tx.offer.updateMany({
        where: {
          requestId: offer.requestId,
          id: { not: offerId },
          status: OfferStatus.PENDIENTE,
        },
        data: { status: OfferStatus.RECHAZADA },
      });
      const updatedOffer = await tx.offer.update({
        where: { id: offerId },
        data: { status: OfferStatus.ACEPTADA, acceptedAt: new Date() },
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
    if (offer.status !== OfferStatus.PENDIENTE) {
      throw new BadRequestException('La oferta ya fue procesada');
    }

    const updated = await this.prisma.offer.update({
      where: { id: offerId },
      data: { status: OfferStatus.RECHAZADA },
    });
    return this.withComparison(updated);
  }
}
