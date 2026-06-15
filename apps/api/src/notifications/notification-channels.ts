import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationType } from '@prisma/client';
import { EmailService } from '../auth/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationGateway } from './notification.gateway';
import {
  NotificationChannelHandler,
  NotificationPayload,
} from './notification-delivery.interface';

@Injectable()
export class InAppNotificationChannel implements NotificationChannelHandler {
  readonly channel = 'in_app' as const;

  constructor(private gateway: NotificationGateway) {}

  async deliver(userId: string, notification: NotificationPayload, unreadCount: number) {
    this.gateway.emitToUser(userId, notification, unreadCount);
  }
}

const EMAIL_TYPES = new Set<NotificationType>([
  NotificationType.NEW_OFFER,
  NotificationType.OFFER_ACCEPTED,
  NotificationType.OFFER_REJECTED,
  NotificationType.NEW_MESSAGE,
  NotificationType.NEW_MATCHING_REQUEST,
  NotificationType.REQUEST_EXPIRING,
]);

function notificationPath(type: NotificationType, entityId: string | null): string {
  switch (type) {
    case NotificationType.NEW_OFFER:
      return '/buyer/offers';
    case NotificationType.OFFER_ACCEPTED:
    case NotificationType.OFFER_REJECTED:
      return '/seller/offers?tab=sent';
    case NotificationType.NEW_MESSAGE:
      return entityId ? `/chats/${entityId}` : '/chats';
    case NotificationType.NEW_MATCHING_REQUEST:
      return entityId ? `/requests/${entityId}` : '/seller';
    case NotificationType.REQUEST_EXPIRING:
    case NotificationType.REQUEST_INACTIVE:
    case NotificationType.REQUEST_CLOSED:
      return entityId ? `/requests/${entityId}` : '/buyer?tab=mine';
    default:
      return '/notifications';
  }
}

@Injectable()
export class EmailNotificationChannel implements NotificationChannelHandler {
  readonly channel = 'email' as const;
  private readonly logger = new Logger(EmailNotificationChannel.name);

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
    private config: ConfigService,
  ) {}

  async deliver(userId: string, notification: NotificationPayload, _unreadCount: number) {
    const enabled = (this.config.get<string>('NOTIFICATION_EMAILS_ENABLED') ?? 'true').toLowerCase() === 'true';
    if (!enabled || !EMAIL_TYPES.has(notification.type)) return;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, locale: true, emailVerified: true },
    });
    if (!user?.emailVerified) return;

    const webUrl = (this.config.get<string>('WEB_URL') ?? 'http://localhost:3000').replace(/\/$/, '');
    const path = notificationPath(notification.type, notification.entityId);
    const actionUrl = `${webUrl}${path}`;
    const en = user.locale === 'EN';

    const subject = notification.title;
    const text = en
      ? `${notification.message}\n\nOpen Buyseek: ${actionUrl}`
      : `${notification.message}\n\nAbrir Buyseek: ${actionUrl}`;
    const html = en
      ? `<p>${notification.message}</p><p><a href="${actionUrl}">Open in Buyseek</a></p>`
      : `<p>${notification.message}</p><p><a href="${actionUrl}">Abrir en Buyseek</a></p>`;

    try {
      await this.email.send({ to: user.email, subject, text, html });
    } catch (err) {
      this.logger.error(`Email notification failed for user ${userId}`, err);
    }
  }
}

@Injectable()
export class PushNotificationChannel implements NotificationChannelHandler {
  readonly channel = 'push' as const;

  async deliver() {
    // Reservado para push notifications móviles.
  }
}
