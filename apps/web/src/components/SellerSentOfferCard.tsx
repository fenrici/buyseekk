'use client';

import Link from 'next/link';
import { formatMoney } from '@/lib/api';
import { offerStatusLabel, useLocale, useT } from '@/lib/i18n';
import type { OfferItem } from '@/lib/types';
import { CompareBlock } from '@/components/CompareBlock';

const STATUS_CLASS: Record<string, string> = {
  ACEPTADA: 'offer-status-badge--accepted',
  RECHAZADA: 'offer-status-badge--rejected',
  PENDIENTE: 'offer-status-badge--pending',
};

export function SellerSentOfferCard({ offer }: { offer: OfferItem }) {
  const t = useT();
  const locale = useLocale();
  const statusClass = STATUS_CLASS[offer.status] ?? STATUS_CLASS.PENDIENTE;

  return (
    <article className="offer-received-card">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-400">{offer.requestTitle}</p>
          <p className="mt-1 text-lg font-bold text-white">
            {formatMoney(offer.price, offer.currency)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">{t('seller.offeredPrice')}</p>
        </div>
        <span className={`offer-status-badge ${statusClass}`}>
          {offerStatusLabel(locale, offer.status)}
        </span>
      </div>

      <CompareBlock offer={offer} perspective="seller" />

      {offer.status === 'ACEPTADA' && offer.chatId && (
        <div className="mt-3 flex justify-end">
          <Link href={`/chats/${offer.chatId}`} className="btn btn-primary text-sm">
            💬 {t('seller.openChat')}
          </Link>
        </div>
      )}
    </article>
  );
}
