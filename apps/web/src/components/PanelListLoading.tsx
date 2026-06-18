'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/lib/i18n';

const DEFAULT_DELAY_MS = 400;

type Props = {
  loading: boolean;
  delayMs?: number;
};

export function PanelListLoading({ loading, delayMs = DEFAULT_DELAY_MS }: Props) {
  const t = useT();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!loading) {
      setVisible(false);
      return;
    }

    const timer = window.setTimeout(() => setVisible(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [loading, delayMs]);

  if (!visible) return null;

  return (
    <div className="panel-list-loading" role="status" aria-live="polite" aria-busy="true" aria-label={t('common.loading')}>
      <div className="portal-spinner" aria-hidden="true" />
    </div>
  );
}
