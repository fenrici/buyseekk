/** Claves de preferencias de notificación en perfil (UI). */
export const NOTIFICATION_PREFERENCE_KEYS = [
  'matchingRequests',
  'newOffers',
  'newMessages',
  'requestExpiring',
  'requestInactive',
] as const;

export type NotificationPreferenceKey = (typeof NOTIFICATION_PREFERENCE_KEYS)[number];

export type NotificationPreferences = Record<NotificationPreferenceKey, boolean>;

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  matchingRequests: true,
  newOffers: true,
  newMessages: true,
  requestExpiring: true,
  requestInactive: true,
};

export function parseNotificationPreferences(raw: unknown): NotificationPreferences {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  const o = raw as Record<string, unknown>;
  const out = { ...DEFAULT_NOTIFICATION_PREFERENCES };
  for (const key of NOTIFICATION_PREFERENCE_KEYS) {
    if (typeof o[key] === 'boolean') out[key] = o[key];
  }
  return out;
}

export function mergeNotificationPreferences(
  current: NotificationPreferences,
  patch: Partial<NotificationPreferences>,
): NotificationPreferences {
  const out = { ...current };
  for (const key of NOTIFICATION_PREFERENCE_KEYS) {
    if (typeof patch[key] === 'boolean') out[key] = patch[key]!;
  }
  return out;
}

/** Tipos de notificación controlables por preferencias de usuario. */
export type GatedNotificationType =
  | 'NEW_MATCHING_REQUEST'
  | 'NEW_OFFER'
  | 'NEW_MESSAGE'
  | 'REQUEST_EXPIRING'
  | 'REQUEST_INACTIVE';

/** Mapeo tipo → preferencia de usuario. */
export const NOTIFICATION_TYPE_PREFERENCE: Record<GatedNotificationType, NotificationPreferenceKey> = {
  NEW_MATCHING_REQUEST: 'matchingRequests',
  NEW_OFFER: 'newOffers',
  NEW_MESSAGE: 'newMessages',
  REQUEST_EXPIRING: 'requestExpiring',
  REQUEST_INACTIVE: 'requestInactive',
};

export function isNotificationTypeEnabled(
  prefs: NotificationPreferences,
  type: GatedNotificationType,
): boolean {
  return prefs[NOTIFICATION_TYPE_PREFERENCE[type]];
}

export function isGatedNotificationType(type: string): type is GatedNotificationType {
  return type in NOTIFICATION_TYPE_PREFERENCE;
}
