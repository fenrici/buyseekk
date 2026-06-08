'use client';

import { Suspense } from 'react';
import { useT } from '@/lib/i18n';
import { BuyerPanel } from './BuyerPanel';

function BuyerFallback() {
  const t = useT();
  return <main className="p-8">{t('common.loading')}</main>;
}

export default function BuyerPage() {
  return (
    <Suspense fallback={<BuyerFallback />}>
      <BuyerPanel />
    </Suspense>
  );
}
