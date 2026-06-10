'use client';

import { timeAgo, useLocale, useT } from '@/lib/i18n';
import { RequestStatusValue } from '@/lib/types';

const STATUS_STYLES: Record<RequestStatusValue, string> = {
  ACTIVA: 'bg-emerald-100 text-emerald-700',
  NEGOCIANDO: 'bg-indigo-100 text-indigo-700',
  INACTIVA: 'bg-amber-100 text-amber-700',
  CERRADA: 'bg-slate-100 text-slate-500',
  ARCHIVADA: 'bg-slate-100 text-slate-400',
};

export function RequestStatusBadge({ status }: { status: RequestStatusValue }) {
  const t = useT();
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status]}`}
    >
      {status === 'NEGOCIANDO' && (
        <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-indigo-500" />
        </span>
      )}
      {t(`requestStatus.${status}`)}
    </span>
  );
}

type ActivityProps = {
  offersCount: number;
  conversationsCount: number;
  lastActivityAt: string;
  className?: string;
};

/** "12 ofertas · 3 conversaciones · hace 2 horas" */
export function RequestActivity({
  offersCount,
  conversationsCount,
  lastActivityAt,
  className = '',
}: ActivityProps) {
  const t = useT();
  const locale = useLocale();
  return (
    <p className={`text-xs text-slate-400 ${className}`}>
      {t('activity.offers', { n: offersCount })}
      {' · '}
      {t('activity.conversations', { n: conversationsCount })}
      {' · '}
      {t('activity.last', { time: timeAgo(locale, lastActivityAt) })}
    </p>
  );
}
