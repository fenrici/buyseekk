export const MAX_ACTIVE_REQUESTS = 5;
/** Máximo de ofertas que un vendedor puede enviar por hora. */
export const MAX_OFFERS_PER_HOUR = 8;
/** Ventana (días) para detectar solicitudes u ofertas con texto duplicado. */
export const SPAM_DUPLICATE_DAYS = 7;
export const MAX_IMAGES_PER_ENTITY = 5;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

/** Días sin actividad del comprador antes de Pendiente de confirmación. */
export const REQUEST_CONFIRMATION_DAYS = 7;
/** Horas en Pendiente sin respuesta del comprador antes de pasar a Inactiva. */
export const REQUEST_INACTIVE_AFTER_CONFIRM_HOURS = 24;
/** Días sin actividad del comprador antes de archivar. */
export const REQUEST_ARCHIVE_DAYS = 10;

/** @deprecated Usar REQUEST_CONFIRMATION_DAYS */
export const REQUEST_REMINDER_DAYS = REQUEST_CONFIRMATION_DAYS;
