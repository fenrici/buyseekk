'use client';

import { Suspense } from 'react';
import { PortalLoadingScreen } from '@/components/PortalLoadingScreen';
import { BuyerPanel } from './BuyerPanel';

function BuyerFallback() {
  return <PortalLoadingScreen />;
}

export default function BuyerPage() {
  return (
    <Suspense fallback={<BuyerFallback />}>
      <BuyerPanel />
    </Suspense>
  );
}
