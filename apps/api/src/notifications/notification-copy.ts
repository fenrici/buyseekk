import { Locale, NotificationEntityType, NotificationType } from '@prisma/client';

type Copy = { title: string; message: string };

function isEn(locale: Locale) {
  return locale === 'EN';
}

export function notificationCopy(
  type: NotificationType,
  locale: Locale,
  context: Record<string, string>,
): Copy {
  const en = isEn(locale);

  switch (type) {
    case NotificationType.NEW_OFFER:
      return en
        ? {
            title: 'New offer received',
            message: `You received a new offer for ${context.requestTitle ?? 'your request'}`,
          }
        : {
            title: 'Nueva oferta recibida',
            message: `Recibiste una nueva oferta para ${context.requestTitle ?? 'tu solicitud'}`,
          };
    case NotificationType.OFFER_ACCEPTED:
      return en
        ? {
            title: 'Offer accepted',
            message: `Your offer for ${context.requestTitle ?? 'a request'} was accepted`,
          }
        : {
            title: 'Oferta aceptada',
            message: `Tu oferta para ${context.requestTitle ?? 'una solicitud'} fue aceptada`,
          };
    case NotificationType.OFFER_REJECTED:
      return en
        ? {
            title: 'Offer rejected',
            message: `Your offer for ${context.requestTitle ?? 'a request'} was rejected`,
          }
        : {
            title: 'Oferta rechazada',
            message: `Tu oferta para ${context.requestTitle ?? 'una solicitud'} fue rechazada`,
          };
    case NotificationType.NEW_MESSAGE:
      return en
        ? {
            title: 'New message',
            message: context.senderName
              ? `You received a new message from ${context.senderName}`
              : 'You received a new message',
          }
        : {
            title: 'Nuevo mensaje',
            message: context.senderName
              ? `Recibiste un nuevo mensaje de ${context.senderName}`
              : 'Recibiste un nuevo mensaje',
          };
    case NotificationType.REQUEST_EXPIRING:
      return en
        ? {
            title: 'Request expiring soon',
            message: `Your request "${context.requestTitle ?? ''}" needs confirmation soon`,
          }
        : {
            title: 'Solicitud por vencer',
            message: `Tu solicitud "${context.requestTitle ?? ''}" necesita confirmación pronto`,
          };
    case NotificationType.REQUEST_INACTIVE:
      return en
        ? {
            title: 'Request inactive',
            message: `Your request "${context.requestTitle ?? ''}" is now inactive`,
          }
        : {
            title: 'Solicitud inactiva',
            message: `Tu solicitud "${context.requestTitle ?? ''}" pasó a inactiva`,
          };
    case NotificationType.REQUEST_CLOSED:
      return en
        ? {
            title: 'Request closed',
            message: `Your request "${context.requestTitle ?? ''}" was closed`,
          }
        : {
            title: 'Solicitud cerrada',
            message: `Tu solicitud "${context.requestTitle ?? ''}" fue cerrada`,
          };
    case NotificationType.EMAIL_VERIFIED:
      return en
        ? {
            title: 'Email verified',
            message: 'Your email was verified. All features are now unlocked.',
          }
        : {
            title: 'Email verificado',
            message: 'Tu email fue verificado. Ya podés usar todas las funciones.',
          };
    default:
      return en
        ? { title: 'Notification', message: 'You have a new notification' }
        : { title: 'Notificación', message: 'Tenés una nueva notificación' };
  }
}

export { NotificationEntityType, NotificationType };
