'use client';

import {
  autoRequestTitle,
  formatAutoSpecLine,
  formatBudgetCapLabel,
  formatCarColorLabel,
  formatMaxSqmLabel,
  formatMinSqmLabel,
} from '@buyseekk/shared';
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
  | 'carYearMin'
  | 'maxMileage'
>;

type Props = {
  request: RequestMetaData;
  locale: User['locale'];
  size?: 'sm' | 'md';
  showRequirements?: boolean;
  compact?: boolean;
  minimal?: boolean;
};

export function RequestMeta({
  request,
  locale,
  size = 'md',
  showRequirements = true,
  compact = false,
  minimal = false,
}: Props) {
  const t = useT();
  const titleClass = compact
    ? 'text-base font-bold leading-snug line-clamp-2'
    : size === 'sm'
      ? 'text-lg font-bold leading-snug'
      : 'text-2xl font-bold';
  const budgetClass = compact
    ? 'text-lg font-extrabold text-[var(--accent)]'
    : size === 'sm'
      ? 'text-xl font-extrabold text-[var(--accent)]'
      : 'text-2xl font-extrabold text-emerald-600';
  const specClass = compact
    ? 'truncate text-xs font-semibold text-slate-600'
    : size === 'sm'
      ? 'text-xs font-semibold text-slate-600'
      : 'text-sm font-semibold text-slate-700';
  const gap = compact ? 'mt-1.5' : 'mt-2';

  const autoTitle =
    request.category === 'AUTOS' ? autoRequestTitle(request) || request.title : request.title;
  const autoSpec = request.category === 'AUTOS' ? formatAutoSpecLine(request, locale) : null;
  const colorLabel = formatCarColorLabel(request.carColor, locale);

  return (
    <>
      {!minimal && (
        <div className="flex flex-wrap gap-1.5">
          <span className={`tag ${request.category === 'AUTOS' ? 'tag-autos' : 'tag-inm'}`}>
            {t(`category.${request.category}`)}
          </span>
          <span className="tag bg-slate-100 text-slate-700">
            {operationLabel(locale, request.operation)}
          </span>
        </div>
      )}
      <h3 className={`${gap} ${titleClass}`}>{autoTitle}</h3>
      <div className={`${gap} flex flex-wrap items-center gap-2`}>
        <p className={budgetClass}>
          {formatBudgetCapLabel(request.budget, request.currency, locale, request.budgetPeriod)}
        </p>
        {!minimal && (
          <span className={`tag ${request.negotiable !== false ? 'tag-negotiable' : 'tag-fixed'}`}>
            {request.negotiable !== false ? t('request.negotiable') : t('request.fixedPrice')}
          </span>
        )}
      </div>
      {showRequirements && request.requirements?.trim() && (
        <p
          className={`${gap} ${size === 'sm' ? 'line-clamp-3 text-sm text-[var(--text-muted)]' : 'line-clamp-3 text-slate-600'}`}
        >
          {request.requirements}
        </p>
      )}
      {autoSpec && <p className={`${gap} ${specClass}`}>{autoSpec}</p>}
      {request.category === 'AUTOS' && colorLabel && (
        <p className={`${gap} ${specClass}`}>
          {t('request.carColor')}: {colorLabel}
        </p>
      )}
      {request.category === 'INMOBILIARIA' &&
        (request.bedrooms != null || request.minSqm != null || request.maxSqm != null) && (
          <p className={`${gap} ${specClass}`}>
            {[
              request.bedrooms != null ? `${request.bedrooms} ${t('request.bedroomsShort')}` : null,
              formatMinSqmLabel(request.minSqm, locale),
              formatMaxSqmLabel(request.maxSqm, locale),
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}
    </>
  );
}
