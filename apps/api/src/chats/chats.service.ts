import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OfferStatus } from '@prisma/client';
import { parsePagination, toPaginatedResult } from '@buyseekk/shared';
import { PrismaService } from '../prisma/prisma.service';
import { SendMessageDto } from './chats.dto';

@Injectable()
export class ChatsService {
  constructor(private prisma: PrismaService) {}

  private formatPartner(
    offer: {
      seller: { id: string; name: string };
      request: { user: { id: string; name: string } };
    },
    myRole: 'buyer' | 'seller',
  ) {
    if (myRole === 'buyer') {
      return { id: offer.seller.id, name: offer.seller.name, role: 'seller' as const };
    }
    return { id: offer.request.user.id, name: offer.request.user.name, role: 'buyer' as const };
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
              seller: { select: { id: true, name: true } },
              request: { include: { user: { select: { id: true, name: true } } } },
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

  async getOne(chatId: string, userId: string) {
    const full = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        offer: {
          include: {
            seller: { select: { id: true, name: true } },
            request: { include: { user: { select: { id: true, name: true } } } },
          },
        },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!full) throw new NotFoundException('Chat no encontrado');

    const role = this.assertParticipant(full, userId);

    return {
      id: full.id,
      offerId: full.offerId,
      requestTitle: full.offer.requestTitle,
      myRole: role,
      partner: this.formatPartner(full.offer, role),
      messages: full.messages.map((m) => ({
        id: m.id,
        fromRole: m.fromRole,
        text: m.text,
        createdAt: m.createdAt,
      })),
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

    const role = this.assertParticipant(chat, userId);
    const message = await this.prisma.message.create({
      data: { chatId, fromRole: role, text: dto.text.trim() },
    });
    return {
      id: message.id,
      fromRole: message.fromRole,
      text: message.text,
      createdAt: message.createdAt,
    };
  }
}
