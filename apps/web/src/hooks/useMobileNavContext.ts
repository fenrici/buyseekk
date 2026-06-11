'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { isSellerRole } from '@/lib/auth';
import type { User } from '@/lib/types';

const STORAGE_KEY = 'buyseekk_nav_context';

export type MobileNavContext = 'buyer' | 'seller';

export function useMobileNavContext(user: User | null): MobileNavContext | null {
  const pathname = usePathname();
  const [bothContext, setBothContext] = useState<MobileNavContext>('buyer');

  useEffect(() => {
    if (pathname.startsWith('/buyer')) {
      sessionStorage.setItem(STORAGE_KEY, 'buyer');
      setBothContext('buyer');
      return;
    }
    if (pathname.startsWith('/seller') || pathname.startsWith('/requests/')) {
      sessionStorage.setItem(STORAGE_KEY, 'seller');
      setBothContext('seller');
      return;
    }
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored === 'buyer' || stored === 'seller') setBothContext(stored);
  }, [pathname]);

  if (!user) return null;
  if (pathname.startsWith('/seller')) return 'seller';
  if (pathname.startsWith('/buyer')) return 'buyer';
  if (pathname.startsWith('/requests/') && isSellerRole(user.role)) return 'seller';
  if (user.role === 'SELLER') return 'seller';
  if (user.role === 'BUYER') return 'buyer';
  if (user.role === 'BOTH') return bothContext;
  return null;
}
