import { parseUsAreaLocation } from './us-locations';
import type { AppLocale } from './user-mode';

export type AppSellerType = 'INDIVIDUAL' | 'COMPANY';
export type AppBusinessType = 'DEALERSHIP' | 'REAL_ESTATE_AGENCY' | 'OTHER';

export const SELLER_PROFILE_INCOMPLETE_CODE = 'SELLER_PROFILE_INCOMPLETE';

export type SellerProfileFields = {
  role: string;
  sellerType?: string | null;
  sellerCategory?: string | null;
  name?: string | null;
  businessName?: string | null;
  businessType?: string | null;
  state?: string | null;
  city?: string | null;
  country?: string | null;
};

export type SellerBuyerIdentity = {
  titleLine: string;
  detailLine: string;
};

function hasText(value?: string | null): boolean {
  return !!value?.trim();
}

export function hasSellerLocation(profile: Pick<SellerProfileFields, 'state' | 'city'>): boolean {
  return hasText(profile.state) && hasText(profile.city);
}

export function isIndividualSellerProfileComplete(profile: SellerProfileFields): boolean {
  return (
    profile.sellerType === 'INDIVIDUAL' &&
    !!profile.sellerCategory &&
    hasSellerLocation(profile)
  );
}

export function isCompanySellerProfileComplete(profile: SellerProfileFields): boolean {
  return (
    profile.sellerType === 'COMPANY' &&
    !!profile.sellerCategory &&
    hasText(profile.businessName) &&
    hasSellerLocation(profile)
  );
}

/** Perfil de vendedor listo para enviar ofertas. */
export function canSendOffers(profile: SellerProfileFields): boolean {
  if (profile.role !== 'SELLER' && profile.role !== 'BOTH') return false;
  if (!profile.sellerType || !profile.sellerCategory) return false;
  if (profile.sellerType === 'INDIVIDUAL') return isIndividualSellerProfileComplete(profile);
  if (profile.sellerType === 'COMPANY') return isCompanySellerProfileComplete(profile);
  return false;
}

export function businessTypeLabel(
  businessType: string | null | undefined,
  locale: AppLocale,
): string | null {
  if (!businessType) return null;
  const es: Record<AppBusinessType, string> = {
    DEALERSHIP: 'Concesionaria',
    REAL_ESTATE_AGENCY: 'Inmobiliaria',
    OTHER: 'Empresa',
  };
  const en: Record<AppBusinessType, string> = {
    DEALERSHIP: 'Dealership',
    REAL_ESTATE_AGENCY: 'Real Estate Agency',
    OTHER: 'Business',
  };
  const table = locale === 'EN' ? en : es;
  return table[businessType as AppBusinessType] ?? null;
}

export function sellerTypeSubtitle(sellerType: string | null | undefined, locale: AppLocale): string {
  if (sellerType === 'COMPANY') return locale === 'EN' ? 'Business' : 'Empresa';
  return locale === 'EN' ? 'Private seller' : 'Vendedor particular';
}

/** Ubicación visible para buyers: prioriza city US codificada, si no combina city + state. */
export function formatSellerLocation(profile: Pick<SellerProfileFields, 'city' | 'state' | 'country'>): string {
  const city = profile.city?.trim() ?? '';
  const state = profile.state?.trim() ?? '';
  if (!city && !state) return '—';

  if (profile.country === 'US') {
    const parsed = parseUsAreaLocation(city);
    if (parsed) return `${parsed.area}, ${parsed.state}`;
    if (city && state) {
      const area = city.includes(',') ? city.split(',')[0]?.trim() : city;
      return `${area}, ${state}`;
    }
  }

  if (city && state) return `${city}, ${state}`;
  return city || state;
}

/** Identidad visible al buyer en ofertas y chat. */
export function formatSellerBuyerIdentity(
  profile: SellerProfileFields,
  locale: AppLocale,
): SellerBuyerIdentity {
  const name = profile.name?.trim() || '—';
  const location = formatSellerLocation(profile);

  if (profile.sellerType === 'COMPANY') {
    const business = profile.businessName?.trim() || '—';
    return {
      titleLine: `${name} / ${business}`,
      detailLine: location,
    };
  }

  return {
    titleLine: `${name} / ${sellerTypeSubtitle('INDIVIDUAL', locale)}`,
    detailLine: location,
  };
}
