'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { PortalLoadingScreen } from '@/components/PortalLoadingScreen';
import { getToken } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading, refresh } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (user) return;
    if (getToken()) {
      refresh();
      return;
    }
    router.replace('/login');
  }, [user, loading, router, refresh]);

  if (loading) {
    return <PortalLoadingScreen />;
  }

  if (!user) return null;

  return (
    <>
      <div className="mobile-app-shell">{children}</div>
      <Suspense fallback={null}>
        <MobileBottomNav />
      </Suspense>
    </>
  );
}
