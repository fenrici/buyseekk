'use client';

import { useRequireRole } from '@/hooks/useRequireRole';

export default function RequestDetailLayout({ children }: { children: React.ReactNode }) {
  useRequireRole('seller');
  return children;
}
