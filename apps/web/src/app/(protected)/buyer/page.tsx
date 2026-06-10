'use client';

import { Suspense } from 'react';
import { useT } from '@/lib/i18n';
import { BuyerPanel } from './BuyerPanel';

function BuyerFallback() {
  const t = useT();
  return (
    <main className="panel-dark p-8 text-slate-400">{t('common.loading')}</main>
  );
}

export default function BuyerPage() {
  return (
    <Suspense fallback={<BuyerFallback />}>
      <BuyerPanel />
    </Suspense>
  );
}
