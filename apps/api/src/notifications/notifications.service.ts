import { Injectable, NotFoundException } from '@nestjs/common';
import { Locale, Notification, NotificationEntityType, NotificationType } from '@prisma/client';
import { effectiveRequestStatus } from '@buyseekk/shared';
import { parsePagination, toPaginatedResult } from '@buyseekk/shared';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationGateway } from './notification.gateway';
import {
  EmailNotificationChannel,
  InAppNotificationChannel,
  PushNotificationChannel,
} from './notification-channels';
import { notificationCopy } from './notification-copy';
import { NotificationPayload } from './notification-delivery.interface';

type CreateInput = {
  userId: string;
  type: NotificationType;
  locale: Locale;
  context?: Record<string, string>;
  entityId?: string;
  entityType?: NotificationEntityType;
  title?: string;
  message?: string;
};

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private inApp: InAppNotificationChannel,
    private emailChannel: EmailNotificationChannel,
    private pushChannel: PushNotificationChannel,
    private gateway: NotificationGateway,
  ) {}

  private toPayload(row: Notification): NotificationPayload {
    return {
      id: row.id,
      userId: row.userId,
      type: row.type,
      title: row.title,
      message: row.message,
      entityId: row.entityId,
      entityType: row.entityType,
      read: row.read,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private async unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, read: false } });
  }

  private async dispatch(userId: string, notification: NotificationPayload) {
    const count = await this.unreadCount(userId);
    const channels = [this.inApp, this.emailChannel, this.pushChannel];
    await Promise.all(channels.map((ch) => ch.deliver(userId, notification, count)));
  }

  async create(input: CreateInput) {
    const copy = notificationCopy(input.type, input.locale, input.context ?? {});
    const row = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title ?? copy.title,
        message: input.message ?? copy.message,
        entityId: input.entityId,
        entityType: input.entityType,
      },
    });
    const payload = this.toPayload(row);
    await this.dispatch(input.userId, payload);
    return payload;
  }

  private async hasNotification(userId: string, type: NotificationType, entityId: string) {
    const existing = await this.prisma.notification.findFirst({
      where: { userId, type, entityId },
    });
    return !!existing;
  }

  async notifyNewOffer(buyerId: string, locale: Locale, offerId: string, requestTitle: string) {
    if (await this.hasNotification(buyerId, NotificationType.NEW_OFFER, offerId)) return;
    return this.create({
      userId: buyerId,
      type: NotificationType.NEW_OFFER,
      locale,
      entityId: offerId,
      entityType: NotificationEntityType.OFFER,
      context: { requestTitle },
    });
  }

  async notifyOfferAccepted(sellerId: string, locale: Locale, offerId: string, requestTitle: string) {
    return this.create({
      userId: sellerId,
      type: NotificationType.OFFER_ACCEPTED,
      locale,
      entityId: offerId,
      entityType: NotificationEntityType.OFFER,
      context: { requestTitle },
    });
  }

  async notifyOfferRejected(sellerId: string, locale: Locale, offerId: string, requestTitle: string) {
    return this.create({
      userId: sellerId,
      type: NotificationType.OFFER_REJECTED,
      locale,
      entityId: offerId,
      entityType: NotificationEntityType.OFFER,
      context: { requestTitle },
    });
  }

  async notifyNewMessage(
    recipientId: string,
    locale: Locale,
    chatId: string,
    senderName: string,
  ) {
    return this.create({
      userId: recipientId,
      type: NotificationType.NEW_MESSAGE,
      locale,
      entityId: chatId,
      entityType: NotificationEntityType.CHAT,
      context: { senderName },
    });
  }

  async notifyRequestExpiring(buyerId: string, locale: Locale, requestId: string, requestTitle: string) {
    if (await this.hasNotification(buyerId, NotificationType.REQUEST_EXPIRING, requestId)) return;
    return this.create({
      userId: buyerId,
      type: NotificationType.REQUEST_EXPIRING,
      locale,
      entityId: requestId,
      entityType: NotificationEntityType.REQUEST,
      context: { requestTitle },
    });
  }

  async notifyRequestInactive(buyerId: string, locale: Locale, requestId: string, requestTitle: string) {
    if (await this.hasNotification(buyerId, NotificationType.REQUEST_INACTIVE, requestId)) return;
    return this.create({
      userId: buyerId,
      type: NotificationType.REQUEST_INACTIVE,
      locale,
      entityId: requestId,
      entityType: NotificationEntityType.REQUEST,
      context: { requestTitle },
    });
  }

  async notifyRequestClosed(buyerId: string, locale: Locale, requestId: string, requestTitle: string) {
    return this.create({
      userId: buyerId,
      type: NotificationType.REQUEST_CLOSED,
      locale,
      entityId: requestId,
      entityType: NotificationEntityType.REQUEST,
      context: { requestTitle },
    });
  }

  async notifyEmailVerified(userId: string, locale: Locale) {
    return this.create({
      userId,
      type: NotificationType.EMAIL_VERIFIED,
      locale,
      entityId: userId,
      entityType: NotificationEntityType.USER,
    });
  }

  async list(userId: string, page?: number, limit?: number) {
    const { page: safePage, limit: safeLimit, skip } = parsePagination(page, limit);
    const where = { userId };
    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
      }),
      this.prisma.notification.count({ where }),
    ]);
    return toPaginatedResult(items.map((n) => this.toPayload(n)), total, safePage, safeLimit);
  }

  async recent(userId: string, limit = 20) {
    const rows = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((n) => this.toPayload(n));
  }

  async getUnreadCount(userId: string) {
    return this.unreadCount(userId);
  }

  async markRead(userId: string, id: string) {
    const row = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!row) throw new NotFoundException('Notificación no encontrada');
    if (row.read) return this.toPayload(row);

    const updated = await this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });
    const count = await this.unreadCount(userId);
    this.gateway.emitUnreadCount(userId, count);
    return this.toPayload(updated);
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    this.gateway.emitUnreadCount(userId, 0);
    return { ok: true };
  }

  async remove(userId: string, id: string) {
    const row = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!row) throw new NotFoundException('Notificación no encontrada');
    await this.prisma.notification.delete({ where: { id } });
    const count = await this.unreadCount(userId);
    this.gateway.emitUnreadCount(userId, count);
    return { ok: true };
  }

  async clearAll(userId: string) {
    await this.prisma.notification.deleteMany({ where: { userId } });
    this.gateway.emitUnreadCount(userId, 0);
    return { ok: true };
  }

  /** Escanea solicitudes activas y emite notificaciones de ciclo de vida. */
  async scanRequestLifecycle() {
    const now = Date.now();
    const requests = await this.prisma.request.findMany({
      where: { active: true, status: { not: 'CERRADA' } },
      include: { user: { select: { id: true, locale: true } } },
    });

    for (const req of requests) {
      const status = effectiveRequestStatus({
        status: req.status,
        lastBuyerActivityAt: req.lastBuyerActivityAt,
        pausedAt: req.pausedAt,
      }, now);

      if (status === 'PENDIENTE_DE_CONFIRMACION') {
        await this.notifyRequestExpiring(req.userId, req.user.locale, req.id, req.title);
      } else if (status === 'INACTIVA') {
        await this.notifyRequestInactive(req.userId, req.user.locale, req.id, req.title);
      }
    }
  }
}
