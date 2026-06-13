'use client';

import { timeAgo, useLocale, useT } from '@/lib/i18n';
import { RequestStatusValue } from '@/lib/types';

const STATUS_STYLES: Record<RequestStatusValue, string> = {
  ACTIVA: 'bg-emerald-100 text-emerald-700',
  NEGOCIANDO: 'bg-indigo-100 text-indigo-700',
  PENDIENTE_DE_CONFIRMACION: 'bg-amber-100 text-amber-800',
  INACTIVA: 'bg-amber-100 text-amber-700',
  CERRADA: 'bg-slate-100 text-slate-500',
  ARCHIVADA: 'bg-slate-100 text-slate-400',
};

export function RequestStatusBadge({ status = 'ACTIVA' }: { status?: RequestStatusValue }) {
  const t = useT();
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.ACTIVA;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${style}`}
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
  offersCount?: number;
  conversationsCount?: number;
  lastActivityAt?: string | null;
  lastBuyerActivityAt?: string | null;
  createdAt?: string | null;
  className?: string;
  showPublished?: boolean;
};

/** "12 ofertas · Publicada hace 3 días · Última actividad hace 2 horas" */
export function RequestActivity({
  offersCount = 0,
  conversationsCount = 0,
  lastActivityAt,
  lastBuyerActivityAt,
  createdAt,
  className = '',
  showPublished = false,
}: ActivityProps) {
  const t = useT();
  const locale = useLocale();
  const buyerActivity = lastBuyerActivityAt ?? lastActivityAt ?? createdAt;

  return (
    <p className={`text-xs text-slate-400 ${className}`}>
      {t('activity.offers', { n: offersCount })}
      {' · '}
      {t('activity.conversations', { n: conversationsCount })}
      {showPublished && createdAt && (
        <>
          {' · '}
          {t('activity.published', { time: timeAgo(locale, createdAt) })}
        </>
      )}
      {' · '}
      {t('activity.last', { time: timeAgo(locale, buyerActivity) })}
    </p>
  );
}
