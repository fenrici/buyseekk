import type { Locale } from './types';

export const DEFAULT_ACCEPT_MESSAGE_ES =
  '¡Hola! Gracias por aceptar mi oferta. ¿Cuándo podemos coordinar?';

export const DEFAULT_ACCEPT_MESSAGE_EN =
  'Hi! Thanks for accepting my offer. When can we coordinate?';

export function defaultAcceptMessageForLocale(locale: Locale | string): string {
  return locale === 'EN' ? DEFAULT_ACCEPT_MESSAGE_EN : DEFAULT_ACCEPT_MESSAGE_ES;
}
