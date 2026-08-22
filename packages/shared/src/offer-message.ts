import { OFFER_MESSAGE_MAX_LENGTH } from './limits';

/** Recorta al máximo permitido sin alterar el contenido previo. */
export function clampOfferMessage(value: string): string {
  if (value.length <= OFFER_MESSAGE_MAX_LENGTH) return value;
  return value.slice(0, OFFER_MESSAGE_MAX_LENGTH);
}

/** Mensaje listo para validar/guardar: trim, sin cambiar espacios internos. */
export function normalizeOfferMessage(value: string): string {
  return value.trim();
}

/** Válido si tras trim no está vacío y no supera el máximo. */
export function isValidOfferMessage(value: string): boolean {
  const normalized = normalizeOfferMessage(value);
  return normalized.length > 0 && normalized.length <= OFFER_MESSAGE_MAX_LENGTH;
}
