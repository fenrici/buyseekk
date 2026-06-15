import {
  hasCompletedSellerProfile,
  isBuyerCapableRole,
  isSellerCapableRole,
} from '@buyseekk/shared';
import { User } from './types';

export type UserMode = 'BUYER' | 'SELLER';

export function isBuyerRole(role: User['role']) {
  return isBuyerCapableRole(role);
}

export function isSellerRole(role: User['role']) {
  return isSellerCapableRole(role);
}

export function isAdminRole(role: User['role']) {
  return role === 'ADMIN';
}

/** Ruta de inicio tras login: los admin van al panel admin; el resto a su dashboard. */
export function getPostLoginPath(user: Pick<User, 'role' | 'activeMode'>) {
  if (isAdminRole(user.role)) return '/admin';
  return getDashboardPathForMode(user.activeMode);
}

/** Home de la app: dashboard si hay sesión, landing pública si no. */
export function getAppHomePath(user: Pick<User, 'role' | 'activeMode'> | null | undefined) {
  if (!user) return '/';
  return getPostLoginPath(user);
}

/** Una cuenta ya completó el onboarding de vendedor si tiene capacidad y datos de vendedor. */
export function hasSellerProfile(user: Pick<User, 'role' | 'sellerType' | 'sellerCategory'>) {
  return hasCompletedSellerProfile(user);
}

export function getDashboardPath(role: User['role']) {
  if (role === 'SELLER') return '/seller';
  return '/buyer';
}

/** Inicio según el modo activo: vendedor → explorar, comprador → mis solicitudes. */
export function getDashboardPathForMode(mode: UserMode) {
  return mode === 'SELLER' ? '/seller' : '/buyer';
}
