'use client';

import { formatMoney } from '@/lib/api';
import { operationLabel, useT } from '@/lib/i18n';
import { RequestItem, User } from '@/lib/types';

/** Subconjunto estructural para poder renderizar también solicitudes públicas. */
type RequestMetaData = Pick<
  RequestItem,
  | 'category'
  | 'operation'
  | 'title'
  | 'budget'
  | 'budgetPeriod'
  | 'negotiable'
  | 'currency'
  | 'requirements'
  | 'zone'
  | 'bedrooms'
  | 'minSqm'
  | 'maxSqm'
  | 'carBrand'
  | 'carModel'
  | 'carColor'
  | 'maxMileage'
>;

type Props = {
  request: RequestMetaData;
  locale: User['locale'];
  size?: 'sm' | 'md';
  showRequirements?: boolean;
};

export function RequestMeta({
  request,
  locale,
  size = 'md',
  showRequirements = true,
}: Props) {
  const t = useT();
  const titleClass = size === 'sm' ? 'text-lg font-bold leading-snug' : 'text-2xl font-bold';
  const budgetClass = size === 'sm' ? 'text-xl font-extrabold text-[var(--accent)]' : 'text-2xl font-extrabold text-emerald-600';
  const specClass = size === 'sm' ? 'text-xs font-semibold text-slate-600' : 'text-sm font-semibold text-slate-700';

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <span className={`tag ${request.category === 'AUTOS' ? 'tag-autos' : 'tag-inm'}`}>
          {t(`category.${request.category}`)}
        </span>
        <span className="tag bg-slate-100 text-slate-700">
          {operationLabel(locale, request.operation)}
        </span>
      </div>
      <h3 className={`mt-2 ${titleClass}`}>{request.title}</h3>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <p className={budgetClass}>
          {formatMoney(request.budget, request.currency, request.budgetPeriod ?? '')}
        </p>
        <span className={`tag ${request.negotiable !== false ? 'tag-negotiable' : 'tag-fixed'}`}>
          {request.negotiable !== false ? t('request.negotiable') : t('request.fixedPrice')}
        </span>
      </div>
      {showRequirements && (
        <p className={`mt-2 ${size === 'sm' ? 'line-clamp-2 text-sm text-[var(--text-muted)]' : 'text-slate-600'}`}>
          {request.requirements}
        </p>
      )}
      {request.category === 'AUTOS' && request.carBrand && (
        <p className={`mt-2 ${specClass}`}>
          {request.carBrand} {request.carModel}
          {request.carColor ? ` · ${request.carColor}` : ''}
          {request.maxMileage != null ? ` · ≤ ${request.maxMileage.toLocaleString()} ${t('seller.miles')}` : ''}
        </p>
      )}
      {request.category === 'INMOBILIARIA' && (
        <p className={`mt-2 ${specClass}`}>
          {request.zone}
          {request.bedrooms != null ? ` · ${request.bedrooms} ${t('request.bedroomsShort')}` : ''}
          {request.minSqm != null ? ` · ≥ ${request.minSqm} m²` : ''}
          {request.maxSqm != null ? ` · ≤ ${request.maxSqm} m²` : ''}
        </p>
      )}
    </>
  );
}
