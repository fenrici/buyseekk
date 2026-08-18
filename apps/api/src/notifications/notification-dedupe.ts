import { NotificationType } from '@prisma/client';

/** Dedupe atómico por usuario. null = sin dedupe (p. ej. NEW_MESSAGE). */
export function notificationDedupeKey(
  type: NotificationType,
  entityId: string,
  opts?: { lastBuyerActivityAt?: Date },
): string | null {
  if (type === NotificationType.NEW_MESSAGE) return null;

  if (type === NotificationType.REQUEST_EXPIRING || type === NotificationType.REQUEST_INACTIVE) {
    if (!opts?.lastBuyerActivityAt) {
      throw new Error(`Lifecycle notification ${type} requires lastBuyerActivityAt for dedupe`);
    }
    return `${type}:${entityId}:${opts.lastBuyerActivityAt.getTime()}`;
  }

  return `${type}:${entityId}`;
}
