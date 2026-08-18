import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { OfferStatus, Prisma, RequestStatus, UserMode } from '@prisma/client';
import { parsePagination, toPaginatedResult } from '@buyseekk/shared';
import { assertEmailVerified } from '../common/utils/assert-email-verified';
import { assertAccountActive } from '../common/utils/assert-not-blocked';
import { assertNotAdminForMarketplaceActions } from '../common/utils/assert-not-admin';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChatDetailQueryDto, resolveMessagesPagination } from './chat-detail.query.dto';
import { MAX_CHAT_MESSAGE_LENGTH, SendMessageDto } from './chats.dto';
import { ChatGateway } from './chat.gateway';

const EPOCH = new Date(0);

@Injectable()
export class ChatsService {
  private readonly logger = new Logger(ChatsService.name);

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

  /** Chats visibles según el modo activo: comprador vs vendedor en cuentas BOTH. */
  private chatsWhereForMode(userId: string, activeMode: UserMode) {
    const accepted = { status: OfferStatus.ACEPTADA };
    if (activeMode === UserMode.SELLER) {
      return { offer: { ...accepted, sellerId: userId } };
    }
    return { offer: { ...accepted, request: { userId } } };
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

  private async unreadCountsForChats(
    chats: { id: string; myRole: 'buyer' | 'seller' }[],
    readMap: Map<string, Date>,
  ) {
    const counts = new Map<string, number>();
    if (chats.length === 0) return counts;

    const grouped = await this.prisma.message.groupBy({
      by: ['chatId'],
      where: {
        OR: chats.map((chat) => ({
          chatId: chat.id,
          fromRole: this.partnerRole(chat.myRole),
          createdAt: { gt: readMap.get(chat.id) ?? EPOCH },
        })),
      },
      _count: { _all: true },
    });

    for (const row of grouped) {
      counts.set(row.chatId, row._count._all);
    }
    return counts;
  }

  private formatOutgoingMessage(message: {
    id: string;
    chatId: string;
    fromRole: string;
    text: string;
    createdAt: Date;
  }) {
    return {
      id: message.id,
      chatId: message.chatId,
      fromRole: message.fromRole,
      text: message.text,
      createdAt: message.createdAt,
    };
  }

  private normalizeClientMessageId(raw?: string) {
    const value = raw?.trim();
    return value || undefined;
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

  async getUnreadSummary(userId: string, activeMode: UserMode) {
    const chats = await this.prisma.chat.findMany({
      where: this.chatsWhereForMode(userId, activeMode),
      select: {
        id: true,
        offer: { select: { sellerId: true, request: { select: { userId: true } } } },
      },
    });

    const withRoles = chats.map((chat) => ({
      id: chat.id,
      myRole:
        chat.offer.request.userId === userId ? ('buyer' as const) : ('seller' as const),
    }));

    const readStates = await this.prisma.chatReadState.findMany({
      where: { userId, chatId: { in: withRoles.map((c) => c.id) } },
      select: { chatId: true, lastReadAt: true },
    });
    const readMap = new Map(readStates.map((r) => [r.chatId, r.lastReadAt]));
    const unreadMap = await this.unreadCountsForChats(withRoles, readMap);

    let totalUnread = 0;
    const byChatId: Record<string, number> = {};
    for (const [chatId, unread] of unreadMap) {
      if (unread > 0) {
        byChatId[chatId] = unread;
        totalUnread += unread;
      }
    }

    return { totalUnread, byChatId };
  }

  async emitUnreadToUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { activeMode: true },
    });
    if (!user) return;
    const summary = await this.getUnreadSummary(userId, user.activeMode);
    this.chatGateway.emitUnreadToUser(userId, summary);
  }

  async list(userId: string, activeMode: UserMode, page?: number, limit?: number) {
    const { page: safePage, limit: safeLimit, skip } = parsePagination(page, limit);

    const where = this.chatsWhereForMode(userId, activeMode);

    const [chats, total] = await Promise.all([
      this.prisma.chat.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: { lastMessageAt: 'desc' },
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

    const unreadMap = await this.unreadCountsForChats(
      chats.map((chat) => ({
        id: chat.id,
        myRole:
          chat.offer.request.userId === userId ? ('buyer' as const) : ('seller' as const),
      })),
      readMap,
    );

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
        updatedAt: chat.lastMessageAt,
        unreadCount: unreadMap.get(chat.id) ?? 0,
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
      messages: messages.map((m) => this.formatOutgoingMessage(m)),
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

  /** Join/reconnect: autoriza, marca leído y no recarga el historial. */
  async join(chatId: string, userId: string) {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: { offer: { include: { request: { select: { userId: true } } } } },
    });
    if (!chat) throw new NotFoundException('Chat no encontrado');
    this.assertParticipant(chat, userId);
    const readAt = await this.markChatRead(chatId, userId);
    this.chatGateway.emitPartnerRead(chatId, userId, readAt);
    await this.emitUnreadToUser(userId);
    return { ok: true };
  }

  async send(chatId: string, userId: string, dto: SendMessageDto) {
    const text = dto.text?.trim() ?? '';
    if (!text) throw new BadRequestException('El mensaje no puede estar vacío');
    if (text.length > MAX_CHAT_MESSAGE_LENGTH) {
      throw new BadRequestException(`El mensaje no puede superar ${MAX_CHAT_MESSAGE_LENGTH} caracteres`);
    }
    const clientMessageId = this.normalizeClientMessageId(dto.clientMessageId);

    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        offer: { include: { request: { select: { userId: true } } } },
      },
    });
    if (!chat) throw new NotFoundException('Chat no encontrado');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ForbiddenException();
    assertNotAdminForMarketplaceActions(user);
    assertAccountActive(user);
    assertEmailVerified(user);

    const role = this.assertParticipant(chat, userId);

    if (clientMessageId) {
      const existing = await this.prisma.message.findUnique({
        where: {
          chatId_fromRole_clientMessageId: { chatId, fromRole: role, clientMessageId },
        },
      });
      if (existing) {
        return this.formatOutgoingMessage(existing);
      }
    }

    let message;
    try {
      message = await this.prisma.$transaction(async (tx) => {
        const created = await tx.message.create({
          data: { chatId, fromRole: role, text, clientMessageId },
        });
        await tx.chat.update({
          where: { id: chatId },
          data: { lastMessageAt: created.createdAt },
        });
        return created;
      });
    } catch (err) {
      if (
        clientMessageId &&
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const existing = await this.prisma.message.findUnique({
          where: {
            chatId_fromRole_clientMessageId: { chatId, fromRole: role, clientMessageId },
          },
        });
        if (existing) return this.formatOutgoingMessage(existing);
      }
      throw err;
    }

    await this.markChatRead(chatId, userId);
    try {
      await this.notifyMessageRecipient(chatId, userId, role);
    } catch (err) {
      this.logger.error(
        `Post-commit NEW_MESSAGE notification failed chatId=${chatId} senderId=${userId}`,
        err instanceof Error ? err.stack : err,
      );
    }

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

    const payload = this.formatOutgoingMessage(message);
    this.chatGateway.emitMessage(chatId, payload);
    return payload;
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
