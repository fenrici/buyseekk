import type { CarCondition } from '@buyseekk/shared';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage?: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'BUYER' | 'SELLER' | 'BOTH' | 'ADMIN';
  activeMode: 'BUYER' | 'SELLER';
  sellerType?: 'INDIVIDUAL' | 'COMPANY' | null;
  sellerCategory?: 'AUTOS' | 'INMOBILIARIA' | null;
  businessType?: 'DEALERSHIP' | 'REAL_ESTATE_AGENCY' | 'OTHER' | null;
  country: 'AR' | 'US';
  locale: 'ES' | 'EN';
  currency: 'ARS' | 'USD';
  buyerAvatarUrl?: string | null;
  sellerAvatarUrl?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  businessName?: string | null;
  phone?: string | null;
  website?: string | null;
  state?: string | null;
  city?: string | null;
  lastSellerFilters?: Record<string, unknown> | null;
  emailVerified: boolean;
  emailVerifiedAt?: string | null;
  blocked?: boolean;
  blockedAt?: string | null;
  blockedReason?: string | null;
  suspended?: boolean;
  suspendedAt?: string | null;
  suspendedReason?: string | null;
  subscriptionPlan?: 'FREE' | 'PLUS' | 'ENTERPRISE';
  preferredMode?: 'BUYER' | 'SELLER';
  notificationPreferences?: import('@buyseekk/shared').NotificationPreferences;
  defaultAcceptMessage?: string | null;
}

export interface PublicProfile {
  id: string;
  name: string;
  role: 'BUYER' | 'SELLER' | 'BOTH';
  sellerType?: 'INDIVIDUAL' | 'COMPANY' | null;
  sellerCategory?: 'AUTOS' | 'INMOBILIARIA' | null;
  businessType?: 'DEALERSHIP' | 'REAL_ESTATE_AGENCY' | 'OTHER' | null;
  country: 'AR' | 'US';
  buyerAvatarUrl?: string | null;
  sellerAvatarUrl?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  businessName?: string | null;
  website?: string | null;
  state?: string | null;
  city?: string | null;
  createdAt: string;
  rating: UserRatingStats;
  completedDeals: number;
  recentReviews: {
    id: string;
    stars: number | null;
    comment?: string | null;
    createdAt: string;
    fromUser: { id: string; name: string; avatarUrl?: string | null };
  }[];
}

export type RequestStatusValue =
  | 'ACTIVA'
  | 'NEGOCIANDO'
  | 'PAUSADA'
  | 'PENDIENTE_DE_CONFIRMACION'
  | 'INACTIVA'
  | 'CERRADA'
  | 'ARCHIVADA';

export interface RequestItem {
  id: string;
  status?: RequestStatusValue;
  lastActivityAt?: string;
  lastBuyerActivityAt?: string;
  conversationsCount?: number;
  createdAt?: string;
  title: string;
  requirements: string;
  budget: number;
  budgetPeriod?: string | null;
  negotiable: boolean;
  currency: string;
  location: string;
  state?: string | null;
  zone?: string | null;
  bedrooms?: number | null;
  minSqm?: number | null;
  maxSqm?: number | null;
  country: string;
  category: string;
  operation: string;
  imageUrls?: string[];
  carBrand?: string | null;
  carModel?: string | null;
  carColor?: string | null;
  carYearMin?: number | null;
  carCondition?: CarCondition | null;
  maxMileage?: number | null;
  offersCount: number;
  pendingOffersCount: number;
  hasOffers: boolean;
  hiddenByModeration?: boolean;
  moderationReviewRequired?: boolean;
  offers?: {
    id: string;
    status: string;
    dealCompletedAt?: string | null;
    negotiationEndedAt?: string | null;
  }[];
  isSaved?: boolean;
  savedAt?: string | null;
  myOffer?: { id: string; status: string; chatId?: string | null } | null;
  user: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    rating?: { avgStars: number | null; reviewCount: number; noResponseCount: number };
  };
}

/** Solicitud sanitizada del listado público (sin auth). */
export interface PublicRequestItem {
  id: string;
  status?: RequestStatusValue;
  lastActivityAt?: string;
  lastBuyerActivityAt?: string;
  conversationsCount?: number;
  category: string;
  operation: string;
  title: string;
  requirements: string;
  budget: number;
  budgetPeriod?: string | null;
  negotiable: boolean;
  currency: string;
  location: string;
  state?: string | null;
  zone?: string | null;
  country: string;
  bedrooms?: number | null;
  minSqm?: number | null;
  maxSqm?: number | null;
  carBrand?: string | null;
  carModel?: string | null;
  carColor?: string | null;
  carYearMin?: number | null;
  carCondition?: CarCondition | null;
  maxMileage?: number | null;
  imageUrls?: string[];
  createdAt: string;
  offersCount: number;
  buyerInitials: string;
}

export interface ChatPartner {
  id: string;
  name: string;
  role: 'buyer' | 'seller';
  avatarUrl?: string | null;
  identityTitle?: string;
  identityDetail?: string;
}

export interface ChatPreview {
  id: string;
  offerId: string;
  requestTitle: string;
  partner: ChatPartner;
  lastMessage: { text: string; fromRole: string; createdAt: string } | null;
  updatedAt: string;
  unreadCount?: number;
}

export interface ChatMessage {
  id: string;
  chatId?: string;
  fromRole: string;
  text: string;
  createdAt: string;
}

export interface UserRatingStats {
  avgStars: number | null;
  reviewCount: number;
  noResponseCount: number;
}

export interface ChatDetail {
  id: string;
  offerId: string;
  requestTitle: string;
  myRole: 'buyer' | 'seller';
  partner: ChatPartner;
  partnerLastReadAt?: string | null;
  negotiationEndedAt?: string | null;
  dealCompletedAt?: string | null;
  messagingEnabled?: boolean;
  messages: ChatMessage[];
  messagesMeta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasOlderPage: boolean;
  };
}

export interface PendingRatingItem {
  offerId: string;
  requestTitle: string;
  chatId?: string | null;
  partner: ChatPartner;
  myRole: 'buyer' | 'seller';
}

export type OfferHighlightLabel = 'recommended' | 'lowest_price' | 'closest_match';

export interface OfferComparisonSummary {
  requestedBudget: number;
  offeredPrice: number;
  requestedLocation: string;
  offeredLocation: string | null;
  requestedRequirements: string;
  offerMessage: string;
  imageCount: number;
  offerImageUrls: string[];
  requestImageUrls: string[];
  priceComparison: OfferItem['comparison'];
  requirementsMatch: 'full' | 'partial' | 'unknown';
  locationMatch: boolean;
}

export interface OfferHighlight {
  offerId: string;
  label: OfferHighlightLabel;
  price: number;
  currency: string;
  requestTitle: string;
  /** Always personal User.name — never businessName. */
  sellerName: string;
  sellerType?: 'INDIVIDUAL' | 'COMPANY' | null;
  businessName?: string | null;
  sellerState?: string | null;
  sellerCity?: string | null;
  sellerCountry?: 'AR' | 'US' | string | null;
  sellerAvatarUrl?: string | null;
  sellerRating: { avgStars: number | null; reviewCount: number } | null;
  comparisonSummary: OfferComparisonSummary;
}

export interface OfferItem {
  id: string;
  price: number;
  currency: string;
  message: string;
  imageUrls?: string[];
  status: string;
  dealCompletedAt?: string | null;
  negotiationEndedAt?: string | null;
  negotiationEndedBy?: 'BUYER' | 'SELLER' | null;
  hiddenByModeration?: boolean;
  moderationReviewRequired?: boolean;
  requestTitle: string;
  requestBudget: number;
  requestBudgetPeriod?: string | null;
  requestRequirements: string;
  requestLocation: string;
  seller?: {
    id: string;
    name: string;
    rating?: UserRatingStats;
    avatarUrl?: string | null;
    sellerType?: 'INDIVIDUAL' | 'COMPANY' | null;
    businessName?: string | null;
    businessType?: 'DEALERSHIP' | 'REAL_ESTATE_AGENCY' | 'OTHER' | null;
    state?: string | null;
    city?: string | null;
    country?: 'AR' | 'US';
  };
  request?: {
    id: string;
    title: string;
    imageUrls?: string[];
    status?: RequestStatusValue;
    category?: 'AUTOS' | 'INMOBILIARIA' | string;
    currency?: string;
    budget?: number;
    budgetPeriod?: string | null;
    location?: string;
    zone?: string | null;
    country?: 'AR' | 'US' | string;
    carBrand?: string | null;
    carModel?: string | null;
    carColor?: string | null;
    carYearMin?: number | null;
    carCondition?: CarCondition | null;
    maxMileage?: number | null;
    minSqm?: number | null;
    maxSqm?: number | null;
    user?: { id: string; name: string; avatarUrl?: string | null };
  };
  chatId?: string | null;
  comparison: {
    budget: number;
    offerPrice: number;
    diff: number;
    status: 'under' | 'at' | 'over';
    label: string;
  };
}
