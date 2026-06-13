import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OfferStatus, RequestStatus } from '@prisma/client';
import { parsePagination, toPaginatedResult } from '@buyseekk/shared';
import { toPaginatedResponse } from '../common/utils/paginated-response';
import { assertEmailVerified } from '../common/utils/assert-email-verified';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChatDetailQueryDto, resolveMessagesPagination } from './chat-detail.query.dto';
import { SendMessageDto } from './chats.dto';

@Injectable()
export class ChatsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  private formatPartner(
    offer: {
      seller: { id: string; name: string; avatarUrl: string | null };
      request: { user: { id: string; name: string; avatarUrl: string | null } };
    },
    myRole: 'buyer' | 'seller',
  ) {
    if (myRole === 'buyer') {
      return {
        id: offer.seller.id,
        name: offer.seller.name,
        avatarUrl: offer.seller.avatarUrl,
        role: 'seller' as const,
      };
    }
    return {
      id: offer.request.user.id,
      name: offer.request.user.name,
      avatarUrl: offer.request.user.avatarUrl,
      role: 'buyer' as const,
    };
  }

  private assertParticipant(
    chat: {
      offer: {
        status: OfferStatus;
        sellerId: string;
        request: { userId: string };
      };
    },
    userId: string,
  ) {
    if (chat.offer.status !== OfferStatus.ACEPTADA) {
      throw new ForbiddenException('El chat solo está disponible para ofertas aceptadas');
    }
    if (chat.offer.request.userId === userId) return 'buyer' as const;
    if (chat.offer.sellerId === userId) return 'seller' as const;
    throw new ForbiddenException();
  }

  async list(userId: string, page?: number, limit?: number) {
    const { page: safePage, limit: safeLimit, skip } = parsePagination(page, limit);

    const where = {
      offer: {
        status: OfferStatus.ACEPTADA,
        OR: [{ sellerId: userId }, { request: { userId } }],
      },
    };

    const [chats, total] = await Promise.all([
      this.prisma.chat.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
        include: {
          offer: {
            include: {
              seller: { select: { id: true, name: true, avatarUrl: true } },
              request: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
            },
          },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
      this.prisma.chat.count({ where }),
    ]);

    const items = chats.map((chat) => {
      const myRole =
        chat.offer.request.userId === userId ? ('buyer' as const) : ('seller' as const);
      const last = chat.messages[0];
      return {
        id: chat.id,
        offerId: chat.offerId,
        requestTitle: chat.offer.requestTitle,
        partner: this.formatPartner(chat.offer, myRole),
        lastMessage: last
          ? { text: last.text, fromRole: last.fromRole, createdAt: last.createdAt }
          : null,
        updatedAt: last?.createdAt ?? chat.createdAt,
      };
    });

    return toPaginatedResult(items, total, safePage, safeLimit);
  }

  async getOne(chatId: string, userId: string, query: ChatDetailQueryDto = {}) {
    const full = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        offer: {
          include: {
            seller: { select: { id: true, name: true, avatarUrl: true } },
            request: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
          },
        },
      },
    });
    if (!full) throw new NotFoundException('Chat no encontrado');

    const role = this.assertParticipant(full, userId);

    const totalMessages = await this.prisma.message.count({ where: { chatId } });
    const { page, limit, skip } = resolveMessagesPagination(
      totalMessages,
      query.messagesPage,
      query.messagesLimit,
    );

    const messages = await this.prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
      skip,
      take: limit,
    });

    const totalPages = totalMessages === 0 ? 0 : Math.ceil(totalMessages / limit);

    return {
      id: full.id,
      offerId: full.offerId,
      requestTitle: full.offer.requestTitle,
      myRole: role,
      partner: this.formatPartner(full.offer, role),
      messages: messages.map((m) => ({
        id: m.id,
        fromRole: m.fromRole,
        text: m.text,
        createdAt: m.createdAt,
      })),
      messagesMeta: {
        total: totalMessages,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasOlderPage: page > 1,
      },
    };
  }

  async send(chatId: string, userId: string, dto: SendMessageDto) {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        offer: { include: { request: { select: { userId: true } } } },
      },
    });
    if (!chat) throw new NotFoundException('Chat no encontrado');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ForbiddenException();
    assertEmailVerified(user);

    const role = this.assertParticipant(chat, userId);
    const message = await this.prisma.message.create({
      data: { chatId, fromRole: role, text: dto.text.trim() },
    });

    await this.notifyMessageRecipient(chatId, userId, role);

    // Solo la actividad del comprador renueva el ciclo de vida
    if (role === 'buyer') {
      const now = new Date();
      await this.prisma.request.update({
        where: { id: chat.offer.requestId },
        data: { lastBuyerActivityAt: now, lastActivityAt: now },
      });
      await this.prisma.request.updateMany({
        where: { id: chat.offer.requestId, status: RequestStatus.ACTIVA },
        data: { status: RequestStatus.NEGOCIANDO },
      });
    }

    return {
      id: message.id,
      fromRole: message.fromRole,
      text: message.text,
      createdAt: message.createdAt,
    };
  }

  async notifyMessageRecipient(chatId: string, senderId: string, senderRole: 'buyer' | 'seller') {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        offer: {
          include: {
            seller: { select: { id: true, name: true, locale: true } },
            request: { include: { user: { select: { id: true, name: true, locale: true } } } },
          },
        },
      },
    });
    if (!chat) return;

    const recipient =
      senderRole === 'buyer'
        ? { id: chat.offer.seller.id, locale: chat.offer.seller.locale, senderName: chat.offer.request.user.name }
        : { id: chat.offer.request.user.id, locale: chat.offer.request.user.locale, senderName: chat.offer.seller.name };

    if (recipient.id === senderId) return;

    await this.notifications.notifyNewMessage(
      recipient.id,
      recipient.locale,
      chatId,
      recipient.senderName,
    );
  }
}
