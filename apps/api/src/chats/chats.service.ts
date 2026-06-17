import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { OfferStatus, RequestStatus } from '@prisma/client';
import { parsePagination, toPaginatedResult } from '@buyseekk/shared';
import { assertEmailVerified } from '../common/utils/assert-email-verified';
import { assertAccountActive } from '../common/utils/assert-not-blocked';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChatDetailQueryDto, resolveMessagesPagination } from './chat-detail.query.dto';
import { SendMessageDto } from './chats.dto';
import { ChatGateway } from './chat.gateway';

const EPOCH = new Date(0);

@Injectable()
export class ChatsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    @Inject(forwardRef(() => ChatGateway))
    private chatGateway: ChatGateway,
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

  private partnerRole(myRole: 'buyer' | 'seller') {
    return myRole === 'buyer' ? 'seller' : 'buyer';
  }

  private partnerUserId(
    chat: { offer: { sellerId: string; request: { userId: string } } },
    userId: string,
  ) {
    if (chat.offer.request.userId === userId) return chat.offer.sellerId;
    if (chat.offer.sellerId === userId) return chat.offer.request.userId;
    throw new ForbiddenException();
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

  private async getLastReadAt(chatId: string, userId: string): Promise<Date> {
    const state = await this.prisma.chatReadState.findUnique({
      where: { chatId_userId: { chatId, userId } },
      select: { lastReadAt: true },
    });
    return state?.lastReadAt ?? EPOCH;
  }

  async countUnreadForChat(
    chatId: string,
    userId: string,
    myRole: 'buyer' | 'seller',
    lastReadAt?: Date,
  ) {
    const readAt = lastReadAt ?? (await this.getLastReadAt(chatId, userId));
    return this.prisma.message.count({
      where: {
        chatId,
        createdAt: { gt: readAt },
        fromRole: this.partnerRole(myRole),
      },
    });
  }

  async markChatRead(chatId: string, userId: string) {
    const now = new Date();
    await this.prisma.chatReadState.upsert({
      where: { chatId_userId: { chatId, userId } },
      create: { chatId, userId, lastReadAt: now },
      update: { lastReadAt: now },
    });
    return now;
  }

  async getPartnerLastReadAt(
    chat: { id: string; offer: { sellerId: string; request: { userId: string } } },
    userId: string,
  ) {
    const partnerId = this.partnerUserId(chat, userId);
    const state = await this.prisma.chatReadState.findUnique({
      where: { chatId_userId: { chatId: chat.id, userId: partnerId } },
      select: { lastReadAt: true },
    });
    return state?.lastReadAt ?? null;
  }

  async getUnreadSummary(userId: string) {
    const chats = await this.prisma.chat.findMany({
      where: {
        offer: {
          status: OfferStatus.ACEPTADA,
          OR: [{ sellerId: userId }, { request: { userId } }],
        },
      },
      select: {
        id: true,
        offer: { select: { sellerId: true, request: { select: { userId: true } } } },
      },
    });

    let totalUnread = 0;
    const byChatId: Record<string, number> = {};

    await Promise.all(
      chats.map(async (chat) => {
        const myRole =
          chat.offer.request.userId === userId ? ('buyer' as const) : ('seller' as const);
        const unread = await this.countUnreadForChat(chat.id, userId, myRole);
        if (unread > 0) {
          byChatId[chat.id] = unread;
          totalUnread += unread;
        }
      }),
    );

    return { totalUnread, byChatId };
  }

  async emitUnreadToUser(userId: string) {
    const summary = await this.getUnreadSummary(userId);
    this.chatGateway.emitUnreadToUser(userId, summary);
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

    const readStates = await this.prisma.chatReadState.findMany({
      where: { userId, chatId: { in: chats.map((c) => c.id) } },
      select: { chatId: true, lastReadAt: true },
    });
    const readMap = new Map(readStates.map((r) => [r.chatId, r.lastReadAt]));

    const items = await Promise.all(
      chats.map(async (chat) => {
        const myRole =
          chat.offer.request.userId === userId ? ('buyer' as const) : ('seller' as const);
        const last = chat.messages[0];
        const unreadCount = await this.countUnreadForChat(
          chat.id,
          userId,
          myRole,
          readMap.get(chat.id),
        );
        return {
          id: chat.id,
          offerId: chat.offerId,
          requestTitle: chat.offer.requestTitle,
          partner: this.formatPartner(chat.offer, myRole),
          lastMessage: last
            ? { text: last.text, fromRole: last.fromRole, createdAt: last.createdAt }
            : null,
          updatedAt: last?.createdAt ?? chat.createdAt,
          unreadCount,
        };
      }),
    );

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
    const partnerLastReadAt = await this.getPartnerLastReadAt(full, userId);

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

    const readAt = await this.markChatRead(chatId, userId);
    this.chatGateway.emitPartnerRead(chatId, userId, readAt);
    await this.emitUnreadToUser(userId);

    return {
      id: full.id,
      offerId: full.offerId,
      requestTitle: full.offer.requestTitle,
      myRole: role,
      partner: this.formatPartner(full.offer, role),
      partnerLastReadAt,
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
    assertAccountActive(user);
    assertEmailVerified(user);

    const role = this.assertParticipant(chat, userId);
    const message = await this.prisma.message.create({
      data: { chatId, fromRole: role, text: dto.text.trim() },
    });

    await this.markChatRead(chatId, userId);

    await this.notifyMessageRecipient(chatId, userId, role);

    const recipientId = this.partnerUserId(chat, userId);
    await this.emitUnreadToUser(recipientId);

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
