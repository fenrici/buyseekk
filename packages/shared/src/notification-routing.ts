export type NotificationTargetMode = 'BUYER' | 'SELLER';
export type ChatParticipantRole = 'buyer' | 'seller';

const BUYER_NOTIFICATION_TYPES = new Set([
  'NEW_OFFER',
  'REQUEST_EXPIRING',
  'REQUEST_INACTIVE',
  'REQUEST_CLOSED',
  'EMAIL_VERIFIED',
]);

const SELLER_NOTIFICATION_TYPES = new Set([
  'OFFER_ACCEPTED',
  'OFFER_REJECTED',
  'DEAL_COMPLETED',
  'NEW_MATCHING_REQUEST',
]);

export function notificationTargetMode(
  type: string,
  opts?: { recipientRole?: ChatParticipantRole },
): NotificationTargetMode {
  if (opts?.recipientRole === 'buyer') return 'BUYER';
  if (opts?.recipientRole === 'seller') return 'SELLER';
  if (BUYER_NOTIFICATION_TYPES.has(type)) return 'BUYER';
  if (SELLER_NOTIFICATION_TYPES.has(type)) return 'SELLER';
  return 'BUYER';
}

/** Existing web paths so a future native app can open the right screen and switch mode. */
export function notificationDeepLinkPath(type: string, entityId: string | null): string {
  switch (type) {
    case 'NEW_OFFER':
      return '/buyer/offers';
    case 'OFFER_ACCEPTED':
    case 'OFFER_REJECTED':
      return '/seller/offers';
    case 'DEAL_COMPLETED':
      return entityId ? `/chats/${entityId}` : '/seller/offers';
    case 'NEGOTIATION_ENDED':
      return entityId ? `/chats/${entityId}` : '/chats';
    case 'NEW_MESSAGE':
      return entityId ? `/chats/${entityId}` : '/chats';
    case 'NEW_MATCHING_REQUEST':
      return entityId ? `/requests/${entityId}` : '/seller';
    case 'REQUEST_EXPIRING':
    case 'REQUEST_INACTIVE':
    case 'REQUEST_CLOSED':
      return '/buyer?tab=mine';
    case 'EMAIL_VERIFIED':
      return '/profile';
    default:
      return '/profile';
  }
}
