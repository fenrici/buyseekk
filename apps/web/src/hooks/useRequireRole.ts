'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAdminRole, isBuyerRole, isSellerRole } from '@/lib/auth';
import { useAuth } from '@/providers/AuthProvider';

export function useRequireRole(role: 'buyer' | 'seller') {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading || !user) return;
    // Los administradores no operan como comprador/vendedor: van al panel admin.
    if (isAdminRole(user.role)) {
      router.replace('/admin');
      return;
    }
    if (role === 'buyer' && !isBuyerRole(user.role)) {
      router.replace('/seller');
    }
    if (role === 'seller' && !isSellerRole(user.role)) {
      router.replace('/buyer');
    }
  }, [user, loading, role, router]);

  return { user, loading };
}
