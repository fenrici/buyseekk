'use client';

import { OfferItem } from '@/lib/types';
import { formatMoney } from '@/lib/api';
import { comparisonLabel, useLocale, useT } from '@/lib/i18n';
import { ImageGallery } from '@/components/ImageGallery';

const diffStyles = {
  under: 'bg-emerald-100 text-emerald-700',
  at: 'bg-indigo-100 text-indigo-700',
  over: 'bg-red-100 text-red-700',
};

export function CompareBlock({ offer, perspective = 'buyer' }: { offer: OfferItem; perspective?: 'buyer' | 'seller' }) {
  const t = useT();
  const locale = useLocale();
  const period = offer.requestBudgetPeriod ?? '';
  const style = diffStyles[offer.comparison.status];
  const isBuyer = perspective === 'buyer';
  const label = comparisonLabel(locale, offer.comparison.status, offer.comparison.diff, offer.currency);

  return (
    <div className="compare-block mt-4">
      <div className="border-b border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-800">
        ⚖️ {isBuyer ? t('compare.titleBuyer') : t('compare.titleSeller')}
      </div>
      <div className="grid gap-0 md:grid-cols-2">
        <div className="space-y-3 border-b border-slate-200 p-4 md:border-b-0 md:border-r">
          <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">
            {isBuyer ? t('compare.youAsked') : t('compare.theyAsked')}
          </p>
          <ImageGallery urls={offer.request?.imageUrls} alt={t('compare.theyAsked')} className="h-52 md:h-60" />
          <div>
            <p className="text-xs text-slate-500">{t('compare.budget')}</p>
            <p className="font-semibold">{formatMoney(offer.requestBudget, offer.currency, period)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{t('compare.location')}</p>
            <p className="text-sm">{offer.requestLocation}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{t('compare.requirements')}</p>
            <p className="text-sm text-slate-700">{offer.requestRequirements}</p>
          </div>
        </div>
        <div className="space-y-3 bg-emerald-50/50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
            {isBuyer ? t('compare.theyOffer') : t('compare.yourOffer')}
          </p>
          <ImageGallery urls={offer.imageUrls} alt={t('compare.theyOffer')} className="h-52 md:h-60" />
          <div>
            <p className="text-xs text-slate-500">{t('compare.price')}</p>
            <p className="text-xl font-extrabold text-emerald-600">{formatMoney(offer.price, offer.currency)}</p>
            <span className={`mt-1 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${style}`}>{label}</span>
          </div>
          <div>
            <p className="text-xs text-slate-500">{isBuyer ? t('compare.seller') : t('compare.buyer')}</p>
            <p className="text-sm font-semibold">
              {isBuyer ? offer.seller?.name : offer.request?.user?.name ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{t('compare.proposal')}</p>
            <p className="text-sm text-slate-700">{offer.message}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
