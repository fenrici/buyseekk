import type { OfferHighlight, OfferItem } from '@/lib/types';

/** Convierte un destacado del resumen en OfferItem para reutilizar CompareBlock. */
export function highlightToOfferItem(h: OfferHighlight): OfferItem {
  const s = h.comparisonSummary;
  return {
    id: h.offerId,
    price: h.price,
    currency: h.currency,
    message: s.offerMessage,
    imageUrls: s.offerImageUrls,
    status: 'PENDIENTE',
    requestTitle: h.requestTitle,
    requestBudget: s.requestedBudget,
    requestRequirements: s.requestedRequirements,
    requestLocation: s.requestedLocation,
    comparison: s.priceComparison,
    seller: {
      id: '',
      name: h.sellerName,
      rating: h.sellerRating
        ? {
            avgStars: h.sellerRating.avgStars,
            reviewCount: h.sellerRating.reviewCount,
            noResponseCount: 0,
          }
        : undefined,
    },
    request: {
      id: '',
      title: h.requestTitle,
      imageUrls: s.requestImageUrls,
    },
  };
}
