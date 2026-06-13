'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PortalLoadingScreen } from '@/components/PortalLoadingScreen';

export default function SellerSavedRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/seller/offers?tab=saved');
  }, [router]);

  return <PortalLoadingScreen />;
}
