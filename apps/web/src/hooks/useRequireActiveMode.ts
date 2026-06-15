'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { resolveNavMode } from '@buyseekk/shared';
import { getDashboardPathForMode, isAdminRole } from '@/lib/auth';
import { useAuth } from '@/providers/AuthProvider';

/**
 * Redirige al dashboard del modo activo si la ruta no coincide (p. ej. /seller con activeMode BUYER).
 */
export function useRequireActiveMode(mode: 'buyer' | 'seller') {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading || !user) return;
    if (isAdminRole(user.role)) {
      router.replace('/admin');
      return;
    }

    const navMode = resolveNavMode({ role: user.role, activeMode: user.activeMode });
    const wantsSeller = mode === 'seller';
    const isSellerNav = navMode === 'SELLER';

    if (wantsSeller !== isSellerNav) {
      router.replace(getDashboardPathForMode(navMode));
    }
  }, [user, loading, mode, router]);
}
