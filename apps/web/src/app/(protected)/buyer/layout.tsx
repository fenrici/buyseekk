'use client';

import { useRequireRole } from '@/hooks/useRequireRole';
import { useRequireActiveMode } from '@/hooks/useRequireActiveMode';

export default function BuyerLayout({ children }: { children: React.ReactNode }) {
  useRequireRole('buyer');
  useRequireActiveMode('buyer');
  return children;
}
