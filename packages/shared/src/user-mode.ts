/**
 * Lógica pura de capacidades y modo de uso de una cuenta Buyseek.
 * Fuente única de verdad compartida por API y web (no duplicar en cada app).
 *
 * - role (capacidades reales): 'BUYER' | 'SELLER' | 'BOTH'. Se usa para autorizar.
 * - activeMode (interfaz visible): 'BUYER' | 'SELLER'. NUNCA es una medida de seguridad.
 */
export type AppUserRole = 'BUYER' | 'SELLER' | 'BOTH' | 'ADMIN';
export type AppUserMode = 'BUYER' | 'SELLER';
export type AppLocale = 'ES' | 'EN';

export function isBuyerCapableRole(role: AppUserRole): boolean {
  return role === 'BUYER' || role === 'BOTH';
}

export function isSellerCapableRole(role: AppUserRole): boolean {
  return role === 'SELLER' || role === 'BOTH';
}

/** Una cuenta completó el onboarding de vendedor si tiene capacidad y datos de vendedor. */
export function hasCompletedSellerProfile(input: {
  role: AppUserRole;
  sellerType?: string | null;
  sellerCategory?: string | null;
}): boolean {
  return isSellerCapableRole(input.role) && !!input.sellerType && !!input.sellerCategory;
}

/**
 * ¿Puede la cuenta entrar en el modo solicitado?
 * Comprador: siempre que tenga capacidad de comprador.
 * Vendedor: solo si ya completó su perfil de vendedor.
 */
export function canEnterMode(
  mode: AppUserMode,
  input: { role: AppUserRole; sellerType?: string | null; sellerCategory?: string | null },
): boolean {
  if (mode === 'SELLER') return hasCompletedSellerProfile(input);
  return isBuyerCapableRole(input.role);
}

/**
 * Modo de navegación efectivo, acotado a las capacidades reales.
 * Evita mostrar la interfaz de un modo para el que la cuenta no tiene capacidad.
 */
export function resolveNavMode(input: { role: AppUserRole; activeMode: AppUserMode }): AppUserMode {
  if (input.activeMode === 'SELLER' && isSellerCapableRole(input.role)) return 'SELLER';
  if (input.activeMode === 'BUYER' && isBuyerCapableRole(input.role)) return 'BUYER';
  if (isBuyerCapableRole(input.role)) return 'BUYER';
  return 'SELLER';
}

/** Rol resultante al habilitar la capacidad de vendedor conservando la de comprador. */
export function roleAfterEnablingSeller(currentRole: AppUserRole): AppUserRole {
  return currentRole === 'SELLER' ? 'SELLER' : 'BOTH';
}

/**
 * Idioma inicial: la preferencia manual guardada tiene prioridad; si no hay,
 * se detecta del navegador/dispositivo; por defecto, español.
 */
export function resolveInitialLocale(stored: AppLocale | null | undefined, browserLang?: string | null): AppLocale {
  if (stored === 'ES' || stored === 'EN') return stored;
  if (browserLang && browserLang.toLowerCase().startsWith('en')) return 'EN';
  return 'ES';
}
