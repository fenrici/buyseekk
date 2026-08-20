import { NotificationEntityType, NotificationType } from '@prisma/client';

export type NotificationPayload = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityId: string | null;
  entityType: NotificationEntityType | null;
  targetMode: 'BUYER' | 'SELLER';
  read: boolean;
  createdAt: string;
};

export type NotificationDeliveryChannel = 'in_app' | 'email' | 'push';

export interface NotificationChannelHandler {
  readonly channel: NotificationDeliveryChannel;
  deliver(userId: string, notification: NotificationPayload, unreadCount: number): Promise<void>;
}
