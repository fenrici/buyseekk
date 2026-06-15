'use client';

import { useRequireRole } from '@/hooks/useRequireRole';
import { useRequireActiveMode } from '@/hooks/useRequireActiveMode';

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  useRequireRole('seller');
  useRequireActiveMode('seller');
  return children;
}
