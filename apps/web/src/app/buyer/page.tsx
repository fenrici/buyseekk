'use client';

import { Suspense } from 'react';
import { BuyerPanel } from './BuyerPanel';

export default function BuyerPage() {
  return (
    <Suspense fallback={<main className="p-8">Cargando...</main>}>
      <BuyerPanel />
    </Suspense>
  );
}
