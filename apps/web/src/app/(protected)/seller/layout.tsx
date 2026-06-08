'use client';

import { useRequireRole } from '@/hooks/useRequireRole';

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  useRequireRole('seller');
  return children;
}
