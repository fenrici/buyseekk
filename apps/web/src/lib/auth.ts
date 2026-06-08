import { User } from './types';

export function isBuyerRole(role: User['role']) {
  return role === 'BUYER' || role === 'BOTH';
}

export function isSellerRole(role: User['role']) {
  return role === 'SELLER' || role === 'BOTH';
}

export function getDashboardPath(role: User['role']) {
  if (role === 'SELLER') return '/seller';
  return '/buyer';
}
