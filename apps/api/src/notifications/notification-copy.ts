import { Locale, NotificationEntityType, NotificationType } from '@prisma/client';

type Copy = { title: string; message: string };

function isEn(locale: Locale) {
  return locale === 'EN';
}

function cityFromLocation(location: string) {
  return location.split(',')[0]?.trim() || location;
}

/** Resumen legible de qué busca el comprador (autos / inmuebles). */
export function matchingRequestMessage(locale: Locale, context: Record<string, string>): string {
  const en = isEn(locale);
  const location = cityFromLocation(context.location ?? '');
  const category = context.category ?? '';

  if (category === 'AUTOS') {
    const brand = context.carBrand?.trim();
    const model = context.carModel?.trim();
    let vehicle = '';
    if (brand && model) {
      vehicle = en ? `a ${brand} ${model}` : `un ${brand} ${model}`;
    } else if (brand) {
      vehicle = en ? `a ${brand}` : `un ${brand}`;
    } else {
      vehicle = context.requestTitle?.trim() || (en ? 'a vehicle' : 'un vehículo');
    }
    return en
      ? `A buyer in ${location} is looking for ${vehicle}.`
      : `Un comprador de ${location} busca ${vehicle}.`;
  }

  if (category === 'INMOBILIARIA') {
    const bedrooms = context.bedrooms?.trim();
    const isRent = context.operation === 'ALQUILER';
    const property = bedrooms
      ? en
        ? `a ${bedrooms}-bedroom property`
        : `un departamento de ${bedrooms} ambientes`
      : en
        ? 'a property'
        : 'un inmueble';
    const operation = isRent ? (en ? 'for rent' : 'en alquiler') : en ? 'to buy' : 'en venta';
    return en
      ? `A buyer in ${location} is looking for ${property} ${operation}.`
      : `Un comprador de ${location} busca ${property} ${operation}.`;
  }

  const title = context.requestTitle?.trim() || (en ? 'a new listing' : 'una nueva solicitud');
  return en
    ? `A buyer in ${location} published ${title}.`
    : `Un comprador de ${location} publicó ${title}.`;
}

function matchingRequestTitle(locale: Locale, context: Record<string, string>): string {
  const en = isEn(locale);
  const location = cityFromLocation(context.location ?? '');
  const category = context.category ?? '';

  if (category === 'AUTOS') {
    const brand = context.carBrand?.trim();
    const model = context.carModel?.trim();
    const vehicle = brand && model ? `${brand} ${model}` : brand || context.requestTitle?.trim() || (en ? 'vehicle' : 'vehículo');
    return en ? `New alert: ${vehicle} in ${location}` : `Nueva alerta: ${vehicle} en ${location}`;
  }

  if (category === 'INMOBILIARIA') {
    return en ? `New alert in ${location}` : `Nueva alerta en ${location}`;
  }

  return en ? 'New matching request' : 'Nueva búsqueda compatible';
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
    case NotificationType.NEW_MATCHING_REQUEST:
      return {
        title: matchingRequestTitle(locale, context),
        message: matchingRequestMessage(locale, context),
      };
    default:
      return en
        ? { title: 'Notification', message: 'You have a new notification' }
        : { title: 'Notificación', message: 'Tenés una nueva notificación' };
  }
}

export { NotificationEntityType, NotificationType };
