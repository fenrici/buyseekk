import { comparePrices, type PriceComparison } from './pricing';

export type OfferHighlightLabel = 'recommended' | 'lowest_price' | 'closest_match';

export type RequirementsMatchLevel = 'full' | 'partial' | 'unknown';

export interface OfferHighlightSeller {
  name: string;
  businessName?: string | null;
  avatarUrl?: string | null;
  sellerType?: 'PERSONAL' | 'BUSINESS' | null;
  rating?: {
    avgStars: number | null;
    reviewCount: number;
  } | null;
}

export interface OfferForHighlight {
  id: string;
  price: number;
  currency: string;
  message: string;
  imageUrls?: string[];
  requestImageUrls?: string[];
  requestTitle: string;
  requestBudget: number;
  requestBudgetPeriod?: string | null;
  requestRequirements: string;
  requestLocation: string;
  seller?: OfferHighlightSeller | null;
}

export interface ComparisonSummary {
  requestedBudget: number;
  offeredPrice: number;
  requestedLocation: string;
  offeredLocation: string | null;
  requestedRequirements: string;
  offerMessage: string;
  imageCount: number;
  offerImageUrls: string[];
  requestImageUrls: string[];
  priceComparison: PriceComparison;
  requirementsMatch: RequirementsMatchLevel;
  locationMatch: boolean;
}

export interface OfferHighlight {
  offerId: string;
  label: OfferHighlightLabel;
  price: number;
  currency: string;
  requestTitle: string;
  sellerName: string;
  sellerRating: { avgStars: number | null; reviewCount: number } | null;
  comparisonSummary: ComparisonSummary;
}

function sellerDisplayName(seller?: OfferHighlightSeller | null): string {
  if (!seller) return '—';
  return seller.businessName?.trim() || seller.name;
}

function priceFitScore(comparison: PriceComparison): number {
  if (comparison.status === 'under') return 32;
  if (comparison.status === 'at') return 28;
  const ratio = comparison.budget > 0 ? comparison.diff / comparison.budget : 1;
  if (ratio <= 0.05) return 18;
  if (ratio <= 0.1) return 10;
  if (ratio <= 0.2) return 4;
  return 0;
}

function ratingScore(seller?: OfferHighlightSeller | null): number {
  const rating = seller?.rating;
  if (!rating?.reviewCount) return 0;
  if (rating.avgStars != null) return Math.min(20, rating.avgStars * 4);
  return 3;
}

function imageScore(imageUrls?: string[]): number {
  const n = imageUrls?.length ?? 0;
  if (n >= 3) return 15;
  if (n >= 1) return 12;
  return 0;
}

function messageScore(message: string): number {
  const len = message.trim().length;
  if (len >= 120) return 15;
  if (len >= 60) return 10;
  if (len >= 30) return 6;
  return 0;
}

function profileScore(seller?: OfferHighlightSeller | null): number {
  if (!seller) return 0;
  let score = 0;
  if (seller.avatarUrl) score += 4;
  if (seller.businessName?.trim()) score += 5;
  if (seller.sellerType === 'BUSINESS') score += 3;
  return score;
}

export function recommendedScore(offer: OfferForHighlight): number {
  const comparison = comparePrices(
    offer.requestBudget,
    offer.price,
    offer.currency as 'ARS' | 'USD',
  );
  return (
    priceFitScore(comparison) +
    ratingScore(offer.seller) +
    imageScore(offer.imageUrls) +
    messageScore(offer.message) +
    profileScore(offer.seller)
  );
}

export function closestMatchScore(offer: OfferForHighlight): number {
  const comparison = comparePrices(
    offer.requestBudget,
    offer.price,
    offer.currency as 'ARS' | 'USD',
  );
  let score = 0;
  if (comparison.status === 'under' || comparison.status === 'at') score += 35;
  else {
    const ratio = comparison.budget > 0 ? comparison.diff / comparison.budget : 1;
    if (ratio <= 0.1) score += 18;
    else if (ratio <= 0.2) score += 8;
  }
  score += imageScore(offer.imageUrls) * 1.2;
  score += messageScore(offer.message) * 1.3;
  score += ratingScore(offer.seller);
  score += profileScore(offer.seller);
  return score;
}

function requirementsMatchLevel(offer: OfferForHighlight): RequirementsMatchLevel {
  const hasImages = (offer.imageUrls?.length ?? 0) > 0;
  const msgLen = offer.message.trim().length;
  if (hasImages && msgLen >= 60) return 'full';
  if (hasImages || msgLen >= 30) return 'partial';
  return 'unknown';
}

export function buildComparisonSummary(offer: OfferForHighlight): ComparisonSummary {
  const priceComparison = comparePrices(
    offer.requestBudget,
    offer.price,
    offer.currency as 'ARS' | 'USD',
  );
  return {
    requestedBudget: offer.requestBudget,
    offeredPrice: offer.price,
    requestedLocation: offer.requestLocation,
    offeredLocation: null,
    requestedRequirements: offer.requestRequirements,
    offerMessage: offer.message,
    imageCount: offer.imageUrls?.length ?? 0,
    offerImageUrls: offer.imageUrls ?? [],
    requestImageUrls: offer.requestImageUrls ?? [],
    priceComparison,
    requirementsMatch: requirementsMatchLevel(offer),
    locationMatch: true,
  };
}

/** Hasta 3 ofertas destacadas sin repetir ID; prioridad: recomendada → más barata → más cercana. */
export function pickOfferHighlights(offers: OfferForHighlight[]): OfferHighlight[] {
  if (!offers.length) return [];
  if (offers.length === 1) {
    const o = offers[0];
    return [
      {
        offerId: o.id,
        label: 'recommended',
        price: o.price,
        currency: o.currency,
        requestTitle: o.requestTitle,
        sellerName: sellerDisplayName(o.seller),
        sellerRating: o.seller?.rating
          ? { avgStars: o.seller.rating.avgStars, reviewCount: o.seller.rating.reviewCount }
          : null,
        comparisonSummary: buildComparisonSummary(o),
      },
    ];
  }

  const used = new Set<string>();
  const slots: { label: OfferHighlightLabel; pick: () => OfferForHighlight | null }[] = [
    {
      label: 'recommended',
      pick: () => {
        const pool = offers.filter((o) => !used.has(o.id));
        if (!pool.length) return null;
        return [...pool].sort((a, b) => recommendedScore(b) - recommendedScore(a))[0];
      },
    },
    {
      label: 'lowest_price',
      pick: () => {
        const pool = offers.filter((o) => !used.has(o.id));
        if (!pool.length) return null;
        return [...pool].sort((a, b) => a.price - b.price)[0];
      },
    },
    {
      label: 'closest_match',
      pick: () => {
        const pool = offers.filter((o) => !used.has(o.id));
        if (!pool.length) return null;
        return [...pool].sort((a, b) => closestMatchScore(b) - closestMatchScore(a))[0];
      },
    },
  ];

  const result: OfferHighlight[] = [];
  for (const slot of slots) {
    if (result.length >= 3) break;
    const offer = slot.pick();
    if (!offer || used.has(offer.id)) continue;
    used.add(offer.id);
    result.push({
      offerId: offer.id,
      label: slot.label,
      price: offer.price,
      currency: offer.currency,
      requestTitle: offer.requestTitle,
      sellerName: sellerDisplayName(offer.seller),
      sellerRating: offer.seller?.rating
        ? { avgStars: offer.seller.rating.avgStars, reviewCount: offer.seller.rating.reviewCount }
        : null,
      comparisonSummary: buildComparisonSummary(offer),
    });
  }

  return result;
}
