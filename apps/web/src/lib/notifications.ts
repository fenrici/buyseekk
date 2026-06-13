export type NotificationType =
  | 'NEW_OFFER'
  | 'OFFER_ACCEPTED'
  | 'OFFER_REJECTED'
  | 'NEW_MESSAGE'
  | 'REQUEST_EXPIRING'
  | 'REQUEST_INACTIVE'
  | 'REQUEST_CLOSED'
  | 'EMAIL_VERIFIED';

export type NotificationEntityType = 'REQUEST' | 'OFFER' | 'CHAT' | 'USER';

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityId: string | null;
  entityType: NotificationEntityType | null;
  read: boolean;
  createdAt: string;
}

export function notificationHref(item: NotificationItem, activeMode?: 'BUYER' | 'SELLER') {
  switch (item.type) {
    case 'NEW_OFFER':
      return '/buyer/offers';
    case 'OFFER_ACCEPTED':
    case 'OFFER_REJECTED':
      return '/seller/offers?tab=sent';
    case 'NEW_MESSAGE':
      return item.entityId ? `/chats/${item.entityId}` : '/chats';
    case 'REQUEST_EXPIRING':
    case 'REQUEST_INACTIVE':
    case 'REQUEST_CLOSED':
      return item.entityId ? `/requests/${item.entityId}` : activeMode === 'SELLER' ? '/seller' : '/buyer?tab=mine';
    case 'EMAIL_VERIFIED':
      return '/profile';
    default:
      return '/notifications';
  }
}
