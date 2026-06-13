'use client';

import { usePathname } from 'next/navigation';
import { resolveNavMode } from '@buyseekk/shared';
import { isSellerRole } from '@/lib/auth';
import type { User } from '@/lib/types';

export type MobileNavContext = 'buyer' | 'seller';

/**
 * Contexto de navegación según el modo activo de la cuenta.
 * Las rutas explícitas (/buyer, /seller, /requests) tienen prioridad para deep-links;
 * fuera de ellas manda user.activeMode, acotado a las capacidades reales del usuario.
 */
export function useMobileNavContext(user: User | null): MobileNavContext | null {
  const pathname = usePathname();

  if (!user) return null;

  if (pathname.startsWith('/buyer')) return 'buyer';
  if (pathname.startsWith('/seller')) return 'seller';
  if (pathname.startsWith('/requests/') && isSellerRole(user.role)) return 'seller';

  return resolveNavMode({ role: user.role, activeMode: user.activeMode }) === 'SELLER'
    ? 'seller'
    : 'buyer';
}
