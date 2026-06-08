export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'BUYER' | 'SELLER' | 'BOTH';
  country: 'AR' | 'US';
  locale: 'ES' | 'EN';
  currency: 'ARS' | 'USD';
}

export interface RequestItem {
  id: string;
  title: string;
  requirements: string;
  budget: number;
  budgetPeriod?: string | null;
  currency: string;
  location: string;
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
  maxMileage?: number | null;
  offersCount: number;
  pendingOffersCount: number;
  hasOffers: boolean;
  user: {
    id: string;
    name: string;
    rating?: { avgStars: number | null; reviewCount: number; noResponseCount: number };
  };
}

export interface ChatPreview {
  id: string;
  offerId: string;
  requestTitle: string;
  partner: { id: string; name: string; role: 'buyer' | 'seller' };
  lastMessage: { text: string; fromRole: string; createdAt: string } | null;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
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
  partner: { id: string; name: string; role: 'buyer' | 'seller' };
  messages: ChatMessage[];
}

export interface OfferItem {
  id: string;
  price: number;
  currency: string;
  message: string;
  imageUrls?: string[];
  status: string;
  requestTitle: string;
  requestBudget: number;
  requestBudgetPeriod?: string | null;
  requestRequirements: string;
  requestLocation: string;
  seller?: { id: string; name: string; rating?: UserRatingStats };
  request?: { id: string; title: string; imageUrls?: string[]; user?: { id: string; name: string } };
  chatId?: string | null;
  comparison: {
    budget: number;
    offerPrice: number;
    diff: number;
    status: 'under' | 'at' | 'over';
    label: string;
  };
}
