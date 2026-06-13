import { Injectable } from '@nestjs/common';
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

/** Reservado para emails automáticos de notificaciones (fase futura). */
@Injectable()
export class EmailNotificationChannel implements NotificationChannelHandler {
  readonly channel = 'email' as const;

  async deliver() {
    // No-op: canal preparado para fase de emails automáticos.
  }
}

/** Reservado para push notifications móviles (fase futura). */
@Injectable()
export class PushNotificationChannel implements NotificationChannelHandler {
  readonly channel = 'push' as const;

  async deliver() {
    // No-op: canal preparado para push notifications.
  }
}
