import { Country, Currency, Locale, RequestCategory, SellerType, UserRole } from '@prisma/client';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  sellerType?: SellerType | null;
  sellerCategory?: RequestCategory | null;
  country: Country;
  locale: Locale;
  currency: Currency;
};

export function isBuyerCapable(role: UserRole) {
  return role === UserRole.BUYER || role === UserRole.BOTH;
}

export function isSellerCapable(role: UserRole) {
  return role === UserRole.SELLER || role === UserRole.BOTH;
}
