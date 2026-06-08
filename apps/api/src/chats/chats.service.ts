import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OfferStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SendMessageDto } from './chats.dto';

@Injectable()
export class ChatsService {
  constructor(private prisma: PrismaService) {}

  private async getParticipantRole(chatId: string, userId: string) {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        offer: {
          include: { request: { select: { userId: true } } },
        },
      },
    });
    if (!chat) throw new NotFoundException('Chat no encontrado');
    if (chat.offer.status !== OfferStatus.ACEPTADA) {
      throw new ForbiddenException('El chat solo está disponible para ofertas aceptadas');
    }

    if (chat.offer.request.userId === userId) return { chat, role: 'buyer' as const };
    if (chat.offer.sellerId === userId) return { chat, role: 'seller' as const };
    throw new ForbiddenException();
  }

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

  async list(userId: string) {
    const chats = await this.prisma.chat.findMany({
      where: {
        offer: {
          status: OfferStatus.ACEPTADA,
          OR: [{ sellerId: userId }, { request: { userId } }],
        },
      },
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
    });

    return chats.map((chat) => {
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
  }

  async getOne(chatId: string, userId: string) {
    const { chat, role } = await this.getParticipantRole(chatId, userId);
    const full = await this.prisma.chat.findUnique({
      where: { id: chat.id },
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
    const { role } = await this.getParticipantRole(chatId, userId);
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
