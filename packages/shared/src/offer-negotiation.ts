import type { OfferStatus } from './types';

export type NegotiationEndedBy = 'BUYER' | 'SELLER';

export type OfferNegotiationFields = {
  status: OfferStatus | string;
  dealCompletedAt?: Date | string | null;
  negotiationEndedAt?: Date | string | null;
};

/** Oferta aceptada con negociación todavía abierta (sin deal ni cierre manual). */
export function isActiveNegotiation(offer: OfferNegotiationFields): boolean {
  return (
    offer.status === 'ACEPTADA' && !offer.dealCompletedAt && !offer.negotiationEndedAt
  );
}

/** Negociación cerrada manualmente sin operación concretada. */
export function isNegotiationEndedWithoutDeal(offer: OfferNegotiationFields): boolean {
  return (
    offer.status === 'ACEPTADA' && !offer.dealCompletedAt && !!offer.negotiationEndedAt
  );
}

/** Filtro Prisma-friendly para negociaciones activas. */
export const ACTIVE_NEGOTIATION_FILTER = {
  status: 'ACEPTADA' as const,
  dealCompletedAt: null,
  negotiationEndedAt: null,
};

/** True si la solicitud tiene al menos una negociación activa. */
export function requestHasActiveNegotiation(
  offers: OfferNegotiationFields[] | undefined | null,
): boolean {
  return (offers ?? []).some(isActiveNegotiation);
}
