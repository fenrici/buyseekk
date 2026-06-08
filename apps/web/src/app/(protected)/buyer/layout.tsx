'use client';

import { useRequireRole } from '@/hooks/useRequireRole';

export default function BuyerLayout({ children }: { children: React.ReactNode }) {
  useRequireRole('buyer');
  return children;
}
