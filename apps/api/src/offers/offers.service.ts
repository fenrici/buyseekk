import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { OfferStatus, RequestStatus, Locale, Prisma, NegotiationEndedBy } from '@prisma/client';
import {
  comparePrices,
  defaultAcceptMessageForLocale,
  OFFER_HIGHLIGHTS_POOL_LIMIT,
  OFFER_MESSAGE_MAX_LENGTH,
  parsePagination,
  pickOfferHighlights,
  SELLER_PROFILE_INCOMPLETE_CODE,
  canSendOffers,
  normalizeOfferMessage,
  type OfferForHighlight,
  toPaginatedResult,
} from '@buyseekk/shared';
import { assertValidMoneyAmount } from '../common/utils/money-limits';
import { assertCleanPublicText, assertOfferSpamLimits } from '../common/utils/spam-content';
import { assertValidImageUrls, assertOwnedImageUrls } from '../common/utils/image-urls';
import { assertEmailVerified } from '../common/utils/assert-email-verified';
import { assertAccountActive } from '../common/utils/assert-not-blocked';
import { withBuyerAvatar, withSellerAvatar } from '../common/utils/account-avatars';
import { RatingsService } from '../ratings/ratings.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageObjectsService } from '../storage/storage-objects.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { isOfferable, isVisibleToSellers, toLifecycleInput } from '../requests/request-status';
import { CreateOfferDto } from './offers.dto';

@Injectable()
export class OffersService {
  private readonly logger = new Logger(OffersService.name);

  constructor(
    private prisma: PrismaService,
    private ratings: RatingsService,
    private notifications: NotificationsService,
    private subscription: SubscriptionService,
    private storageObjects: StorageObjectsService,
  ) {}

  private async afterCommitNotify(label: string, work: () => Promise<unknown>) {
    try {
      await work();
    } catch (err) {
      this.logger.error(
        `Post-commit notification failed ${label}`,
        err instanceof Error ? err.stack : err,
      );
    }
  }

  private withComparison<T extends { price: number; currency: string; requestBudget: number }>(offer: T) {
    const comparison = comparePrices(
      offer.requestBudget,
      offer.price,
      offer.currency as 'ARS' | 'USD',
    );
    const mapped = { ...offer, comparison } as T & { comparison: ReturnType<typeof comparePrices> } & {
      seller?: Record<string, unknown>;
      request?: Record<string, unknown>;
    };
    const seller = (offer as { seller?: { sellerAvatarUrl?: string | null } }).seller;
    if (seller && 'sellerAvatarUrl' in seller) {
      mapped.seller = withSellerAvatar(seller) as Record<string, unknown>;
    }
    const request = (offer as { request?: { user?: { buyerAvatarUrl?: string | null } } }).request;
    if (request?.user && 'buyerAvatarUrl' in request.user) {
      mapped.request = { ...request, user: withBuyerAvatar(request.user) } as Record<string, unknown>;
    }
    return mapped;
  }

  private async syncRequestNegotiationStatus(tx: Prisma.TransactionClient, requestId: string) {
    const req = await tx.request.findUnique({
      where: { id: requestId },
      select: { status: true, pausedAt: true, active: true },
    });
    if (!req || !req.active || req.status === RequestStatus.CERRADA) return;

    const activeCount = await tx.offer.count({
      where: {
        requestId,
        status: OfferStatus.ACEPTADA,
        dealCompletedAt: null,
        negotiationEndedAt: null,
      },
    });

    if (activeCount > 0) {
      await tx.request.updateMany({
        where: { id: requestId, status: RequestStatus.ACTIVA },
        data: { status: RequestStatus.NEGOCIANDO },
      });
      return;
    }

    if (req.status === RequestStatus.NEGOCIANDO && !req.pausedAt) {
      await tx.request.updateMany({
        where: { id: requestId, status: RequestStatus.NEGOCIANDO },
        data: { status: RequestStatus.ACTIVA },
      });
    }
  }

  async create(sellerId: string, dto: CreateOfferDto) {
    const request = await this.prisma.request.findUnique({
      where: { id: dto.requestId },
      include: { offers: { where: { sellerId } } },
    });

    if (!request || !request.active) throw new NotFoundException('Solicitud no encontrada');
    if (request.hiddenByModeration) throw new NotFoundException('Solicitud no encontrada');
    if (request.status === RequestStatus.CERRADA) {
      throw new BadRequestException('La solicitud está cerrada y no acepta nuevas ofertas');
    }
    const lifecycle = toLifecycleInput(request);
    if (!isOfferable(lifecycle)) {
      if (!isVisibleToSellers(lifecycle)) {
        throw new NotFoundException('Solicitud no encontrada');
      }
      throw new BadRequestException('La solicitud no acepta nuevas ofertas');
    }

    const seller = await this.prisma.user.findUnique({ where: { id: sellerId } });
    if (!seller) throw new ForbiddenException();
    assertAccountActive(seller);
    assertEmailVerified(seller);
    if (!canSendOffers(seller)) {
      throw new BadRequestException({
        message: 'Completá tu perfil de vendedor para enviar ofertas',
        code: SELLER_PROFILE_INCOMPLETE_CODE,
      });
    }
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
    assertOwnedImageUrls(dto.imageUrls, sellerId);
    const message = normalizeOfferMessage(dto.message);
    if (!message) {
      throw new BadRequestException('La propuesta es obligatoria');
    }
    if (message.length > OFFER_MESSAGE_MAX_LENGTH) {
      throw new BadRequestException(
        `La propuesta no puede superar ${OFFER_MESSAGE_MAX_LENGTH} caracteres`,
      );
    }
    assertCleanPublicText(message, 'la propuesta');
    assertValidMoneyAmount(
      dto.price,
      dto.currency,
      'precio',
      request.budgetPeriod != null || request.operation === 'ALQUILER',
    );
    await assertOfferSpamLimits(this.prisma, sellerId, message);
    await this.subscription.assertDailyOfferLimit(seller);

    let offer;
    try {
      offer = await this.storageObjects.withCreateCompensation(dto.imageUrls, sellerId, () =>
        this.prisma.offer.create({
          data: {
            requestId: dto.requestId,
            sellerId,
            price: dto.price,
            currency: dto.currency,
            message,
            imageUrls: dto.imageUrls!,
            requestTitle: request.title,
            requestBudget: request.budget,
            requestBudgetPeriod: request.budgetPeriod,
            requestRequirements: request.requirements,
            requestLocation: request.location,
          },
          include: {
            seller: { select: { id: true, name: true, country: true } },
            request: {
              select: {
                id: true,
                title: true,
                imageUrls: true,
                userId: true,
                user: { select: { locale: true } },
              },
            },
          },
        }),
      );
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Ya enviaste una oferta para esta solicitud');
      }
      throw err;
    }

    await this.afterCommitNotify(`NEW_OFFER offerId=${offer.id}`, () =>
      this.notifications.notifyNewOffer(
        request.userId,
        offer.request.user.locale,
        offer.id,
        offer.requestTitle,
      ),
    );

    return this.withComparison(offer);
  }

  async received(userId: string, page?: number, limit?: number, status?: OfferStatus) {
    const { page: safePage, limit: safeLimit, skip } = parsePagination(page, limit);

    const where = {
      status: status ?? OfferStatus.PENDIENTE,
      hiddenByModeration: false,
      buyerDeletedAt: null,
      request: { userId, active: true },
    };

    const [offers, total] = await Promise.all([
      this.prisma.offer.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
        include: {
          seller: {
            select: {
              id: true,
              name: true,
              country: true,
              sellerAvatarUrl: true,
              sellerType: true,
              businessName: true,
              businessType: true,
              state: true,
              city: true,
            },
          },
          request: { select: { id: true, title: true, imageUrls: true, currency: true, status: true } },
          chat: { select: { id: true } },
        },
      }),
      this.prisma.offer.count({ where }),
    ]);

    const ratingMap = await this.ratings.getStatsForUsers(offers.map((o) => o.sellerId));

    const items = offers.map((o) => {
      const mapped = this.withComparison(o);
      return {
        ...mapped,
        chatId: o.chat?.id ?? null,
        seller: {
          ...mapped.seller,
          rating: ratingMap[o.sellerId] ?? { avgStars: null, reviewCount: 0, noResponseCount: 0 },
        },
      };
    });

    return toPaginatedResult(items, total, safePage, safeLimit);
  }

  async receivedHighlights(userId: string) {
    const offers = await this.prisma.offer.findMany({
      where: {
        status: OfferStatus.PENDIENTE,
        hiddenByModeration: false,
        request: { userId, active: true },
      },
      orderBy: { createdAt: 'desc' },
      take: OFFER_HIGHLIGHTS_POOL_LIMIT,
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            sellerAvatarUrl: true,
            sellerType: true,
            businessName: true,
            state: true,
            city: true,
            country: true,
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
        avatarUrl: o.seller.sellerAvatarUrl,
        sellerType: o.seller.sellerType,
        state: o.seller.state,
        city: o.seller.city,
        country: o.seller.country,
        rating: ratingMap[o.sellerId] ?? { avgStars: null, reviewCount: 0, noResponseCount: 0 },
      },
    }));

    return { highlights: pickOfferHighlights(forHighlight) };
  }

  async sent(sellerId: string, page?: number, limit?: number, status?: OfferStatus) {
    const { page: safePage, limit: safeLimit, skip } = parsePagination(page, limit);

    const where = {
      sellerId,
      dismissedBySeller: false,
      sellerDeletedAt: null,
      ...(status ? { status } : {}),
    };

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
              status: true,
              user: { select: { id: true, name: true, buyerAvatarUrl: true } },
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
    if (!offer.request.active) throw new NotFoundException('Oferta no encontrada');
    if (offer.request.status === RequestStatus.CERRADA && offer.status !== OfferStatus.ACEPTADA) {
      throw new BadRequestException('La solicitud está cerrada');
    }

    const { updated, chat, didTransition } = await this.prisma.$transaction(async (tx) => {
      const acceptResult = await tx.offer.updateMany({
        where: { id: offerId, status: OfferStatus.PENDIENTE },
        data: { status: OfferStatus.ACEPTADA, acceptedAt: new Date() },
      });
      const didTransition = acceptResult.count > 0;

      if (!didTransition) {
        const current = await tx.offer.findUnique({ where: { id: offerId } });
        if (!current || current.status !== OfferStatus.ACEPTADA) {
          throw new BadRequestException('La oferta ya fue procesada');
        }
      }

      const updatedOffer = await tx.offer.findUniqueOrThrow({
        where: { id: offerId },
        include: {
          seller: {
            select: { id: true, name: true, locale: true, defaultAcceptMessage: true },
          },
          request: { select: { id: true, title: true } },
        },
      });

      const sellerGreeting =
        updatedOffer.seller.defaultAcceptMessage?.trim() ||
        defaultAcceptMessageForLocale(updatedOffer.seller.locale ?? Locale.ES);

      const newChat = await tx.chat.upsert({
        where: { offerId },
        create: {
          offerId,
          messages: {
            create: [
              {
                fromRole: 'system',
                text: `Oferta aceptada. ${offer.requestTitle} — ${offer.price}. ¡Pueden coordinar los detalles!`,
              },
              {
                fromRole: 'seller',
                text: sellerGreeting,
              },
            ],
          },
        },
        update: {},
      });

      if (didTransition) {
        await tx.request.updateMany({
          where: { id: offer.requestId, status: RequestStatus.ACTIVA },
          data: { status: RequestStatus.NEGOCIANDO },
        });
        await tx.request.update({
          where: { id: offer.requestId },
          data: { lastBuyerActivityAt: new Date(), lastActivityAt: new Date() },
        });
      }

      return { updated: updatedOffer, chat: newChat, didTransition };
    });

    if (didTransition) {
      await this.afterCommitNotify(`OFFER_ACCEPTED offerId=${updated.id}`, () =>
        this.notifications.notifyOfferAccepted(
          updated.sellerId,
          updated.seller.locale,
          updated.id,
          updated.requestTitle,
        ),
      );
    }

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

    const now = new Date();
    await this.prisma.request.update({
      where: { id: offer.requestId },
      data: { lastBuyerActivityAt: now, lastActivityAt: now },
    });

    const updated = await this.prisma.offer.findUniqueOrThrow({
      where: { id: offerId },
      include: { seller: { select: { locale: true } } },
    });

    await this.afterCommitNotify(`OFFER_REJECTED offerId=${updated.id}`, () =>
      this.notifications.notifyOfferRejected(
        updated.sellerId,
        updated.seller.locale,
        updated.id,
        updated.requestTitle,
      ),
    );

    return this.withComparison(updated);
  }

  /** El comprador confirma que concretó la operación con este vendedor. */
  async complete(offerId: string, buyerId: string) {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        request: true,
        chat: { select: { id: true } },
        seller: { select: { id: true, locale: true } },
      },
    });
    if (!offer) throw new NotFoundException('Oferta no encontrada');
    if (offer.request.userId !== buyerId) throw new ForbiddenException();
    if (!offer.request.active) throw new NotFoundException('Oferta no encontrada');
    if (offer.status !== OfferStatus.ACEPTADA) {
      throw new BadRequestException('Solo podés concretar una oferta aceptada');
    }
    if (!offer.chat) {
      throw new BadRequestException('Se requiere un chat para concretar la operación');
    }
    const chatId = offer.chat.id;

    if (offer.dealCompletedAt) {
      return {
        ...this.withComparison(offer),
        chatId: offer.chat.id,
        requestId: offer.requestId,
        requestStatus: offer.request.status,
      };
    }
    if (offer.negotiationEndedAt) {
      throw new BadRequestException('La negociación ya fue finalizada');
    }

    const otherCompleted = await this.prisma.offer.findFirst({
      where: {
        requestId: offer.requestId,
        dealCompletedAt: { not: null },
        id: { not: offerId },
      },
      select: { id: true },
    });
    if (otherCompleted) {
      throw new BadRequestException(
        'Ya concretaste la operación con otro vendedor en esta solicitud',
      );
    }

    if (offer.request.status === RequestStatus.CERRADA) {
      throw new BadRequestException('La solicitud ya está cerrada');
    }

    let didComplete = false;
    let updated;
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const completeResult = await tx.offer.updateMany({
          where: {
            id: offerId,
            status: OfferStatus.ACEPTADA,
            dealCompletedAt: null,
            negotiationEndedAt: null,
          },
          data: { dealCompletedAt: new Date() },
        });

        if (completeResult.count === 0) {
          const current = await tx.offer.findUnique({ where: { id: offerId } });
          if (current?.negotiationEndedAt) {
            throw new BadRequestException('La negociación ya fue finalizada');
          }
          if (!current?.dealCompletedAt) {
            throw new BadRequestException('No se pudo concretar la operación');
          }
          return { updated: current, didComplete: false };
        }

        const now = new Date();
        await tx.request.update({
          where: { id: offer.requestId },
          data: {
            status: RequestStatus.CERRADA,
            closedAt: now,
            pausedAt: null,
            lastBuyerActivityAt: now,
            lastActivityAt: now,
          },
        });

        const fresh = await tx.offer.findUniqueOrThrow({
          where: { id: offerId },
          include: {
            seller: { select: { id: true, locale: true } },
            request: { select: { status: true } },
          },
        });
        return { updated: fresh, didComplete: true };
      });
      updated = result.updated;
      didComplete = result.didComplete;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException(
          'Ya concretaste la operación con otro vendedor en esta solicitud',
        );
      }
      throw err;
    }

    if (didComplete) {
      await this.afterCommitNotify(`DEAL_COMPLETED offerId=${offer.id}`, () =>
        this.notifications.notifyDealCompleted(
          offer.sellerId,
          offer.seller.locale,
          chatId,
          offer.id,
          offer.requestTitle,
        ),
      );
    }

    return {
      ...this.withComparison(updated),
      chatId,
      requestId: offer.requestId,
      requestStatus: RequestStatus.CERRADA,
    };
  }

  /** Finaliza una negociación aceptada sin concretar la operación. */
  async endNegotiation(offerId: string, userId: string) {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        request: true,
        chat: { select: { id: true } },
        seller: { select: { id: true, locale: true } },
      },
    });
    if (!offer) throw new NotFoundException('Oferta no encontrada');
    if (!offer.request.active) throw new NotFoundException('Oferta no encontrada');

    const isBuyer = offer.request.userId === userId;
    const isSeller = offer.sellerId === userId;
    if (!isBuyer && !isSeller) throw new ForbiddenException();

    if (offer.status !== OfferStatus.ACEPTADA) {
      throw new BadRequestException('Solo podés finalizar una oferta aceptada en negociación');
    }
    if (offer.dealCompletedAt) {
      throw new BadRequestException('La operación ya fue concretada');
    }
    if (offer.negotiationEndedAt) {
      return {
        ...this.withComparison(offer),
        chatId: offer.chat?.id ?? null,
        requestId: offer.requestId,
        requestStatus: offer.request.status,
      };
    }

    const endedBy = isBuyer ? NegotiationEndedBy.BUYER : NegotiationEndedBy.SELLER;
    const endedByRole = isBuyer ? ('buyer' as const) : ('seller' as const);
    const systemText =
      endedBy === NegotiationEndedBy.BUYER
        ? 'La negociación fue finalizada por el comprador.'
        : 'La negociación fue finalizada por el vendedor.';

    let didEnd = false;
    let updated;
    let chatId = offer.chat?.id ?? null;

    const result = await this.prisma.$transaction(async (tx) => {
      const endResult = await tx.offer.updateMany({
        where: {
          id: offerId,
          status: OfferStatus.ACEPTADA,
          dealCompletedAt: null,
          negotiationEndedAt: null,
        },
        data: {
          negotiationEndedAt: new Date(),
          negotiationEndedBy: endedBy,
        },
      });

      if (endResult.count === 0) {
        const current = await tx.offer.findUnique({
          where: { id: offerId },
          include: { request: { select: { status: true } }, chat: { select: { id: true } } },
        });
        if (!current) throw new NotFoundException('Oferta no encontrada');
        if (current.dealCompletedAt) {
          throw new BadRequestException('La operación ya fue concretada');
        }
        if (!current.negotiationEndedAt) {
          throw new BadRequestException('No se pudo finalizar la negociación');
        }
        return { updated: current, didEnd: false, chatId: current.chat?.id ?? null };
      }

      const chat = await tx.chat.upsert({
        where: { offerId },
        create: {
          offerId,
          messages: { create: { fromRole: 'system', text: systemText } },
        },
        update: {
          messages: { create: { fromRole: 'system', text: systemText } },
        },
        select: { id: true },
      });

      await this.syncRequestNegotiationStatus(tx, offer.requestId);

      const fresh = await tx.offer.findUniqueOrThrow({
        where: { id: offerId },
        include: {
          request: { select: { status: true } },
          seller: { select: { id: true, locale: true } },
        },
      });
      return { updated: fresh, didEnd: true, chatId: chat.id };
    });

    updated = result.updated;
    didEnd = result.didEnd;
    chatId = result.chatId;

    if (didEnd) {
      const recipientId = isBuyer ? offer.sellerId : offer.request.userId;
      let recipientLocale = offer.seller.locale;
      if (!isBuyer) {
        const buyer = await this.prisma.user.findUnique({
          where: { id: offer.request.userId },
          select: { locale: true },
        });
        recipientLocale = buyer?.locale ?? Locale.ES;
      }
      if (chatId) {
        await this.afterCommitNotify(`NEGOTIATION_ENDED offerId=${offer.id}`, () =>
          this.notifications.notifyNegotiationEnded(
            recipientId,
            recipientLocale,
            chatId,
            offer.id,
            offer.requestTitle,
            endedByRole,
          ),
        );
      }
    }

    return {
      ...this.withComparison(updated),
      chatId,
      requestId: offer.requestId,
      requestStatus: updated.request.status,
    };
  }

  /** Elimina una oferta del listado del comprador o vendedor (soft-delete por parte). */
  async removeFromListing(offerId: string, userId: string) {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: { request: { select: { userId: true } }, chat: { select: { id: true } } },
    });
    if (!offer) throw new NotFoundException('Oferta no encontrada');

    const isBuyer = offer.request.userId === userId;
    const isSeller = offer.sellerId === userId;
    if (!isBuyer && !isSeller) throw new ForbiddenException();

    if (offer.status === OfferStatus.RECHAZADA && isSeller) {
      return this.dismiss(offerId, userId);
    }

    if (offer.status === OfferStatus.PENDIENTE) {
      throw new BadRequestException('No podés eliminar una oferta pendiente');
    }

    if (
      offer.status === OfferStatus.ACEPTADA &&
      !offer.dealCompletedAt &&
      !offer.negotiationEndedAt
    ) {
      throw new BadRequestException('No podés eliminar una negociación activa');
    }

    const removable =
      offer.dealCompletedAt != null ||
      (offer.negotiationEndedAt != null && offer.dealCompletedAt == null);

    if (!removable) {
      throw new BadRequestException('Solo podés eliminar ofertas con operación concretada o negociación finalizada');
    }

    if (isBuyer) {
      if (offer.buyerDeletedAt) return { ok: true };
      await this.prisma.offer.update({
        where: { id: offerId },
        data: { buyerDeletedAt: new Date() },
      });
      return { ok: true };
    }

    if (offer.sellerDeletedAt) return { ok: true };
    await this.prisma.offer.update({
      where: { id: offerId },
      data: { sellerDeletedAt: new Date() },
    });
    return { ok: true };
  }

  /** El vendedor descarta de su lista una oferta rechazada (soft-dismiss). */
  async dismiss(offerId: string, sellerId: string) {
    const offer = await this.prisma.offer.findUnique({ where: { id: offerId } });
    if (!offer || offer.sellerId !== sellerId) {
      throw new NotFoundException('Oferta no encontrada');
    }
    if (offer.status !== OfferStatus.RECHAZADA) {
      throw new BadRequestException('Solo podés descartar ofertas rechazadas');
    }

    await this.prisma.offer.update({
      where: { id: offerId },
      data: { dismissedBySeller: true },
    });

    return { ok: true };
  }
}
