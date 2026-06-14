import { Country, Currency, Locale, RequestCategory, SellerType, UserMode, UserRole } from '@prisma/client';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  activeMode: UserMode;
  sellerType?: SellerType | null;
  sellerCategory?: RequestCategory | null;
  country: Country;
  locale: Locale;
  currency: Currency;
};

import { isBuyerCapableRole, isSellerCapableRole } from '@buyseekk/shared';

export function isBuyerCapable(role: UserRole) {
  return isBuyerCapableRole(role);
}

export function isSellerCapable(role: UserRole) {
  return isSellerCapableRole(role);
}

export function isAdmin(role: UserRole) {
  return role === UserRole.ADMIN;
}
