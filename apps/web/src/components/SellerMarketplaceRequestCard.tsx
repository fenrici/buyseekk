'use client';

import {
  autoRequestTitle,
  formatAutoSpecLine,
  formatBudgetCapLabel,
  formatColorFieldLabel,
  formatMaxSqmLabel,
  formatMinSqmLabel,
} from '@buyseekk/shared';
import { operationLabel, useT } from '@/lib/i18n';
import { RequestLocationText } from '@/components/RequestLocationText';
import { RequestStatusBadge } from '@/components/RequestStatusBadge';
import { RequestItem, User } from '@/lib/types';

type Props = {
  request: RequestItem;
  locale: User['locale'];
  className?: string;
};

export function SellerMarketplaceRequestCard({ request, locale, className = '' }: Props) {
  const t = useT();
  const isAuto = request.category === 'AUTOS';

  if (isAuto) {
    const title = autoRequestTitle(request) || request.title;
    const specLine = formatAutoSpecLine(request, locale);
    const colorLine = formatColorFieldLabel(request.carColor, locale);
    const budgetLine = formatBudgetCapLabel(
      request.budget,
      request.currency,
      locale,
      request.budgetPeriod,
    );

    return (
      <div className={`seller-request-card seller-request-card--auto${className ? ` ${className}` : ''}`}>
        <div className="seller-request-card__status">
          <RequestStatusBadge status={request.status} />
        </div>

        <h3 className="seller-request-card__title">{title}</h3>

        {specLine && <p className="seller-request-card__spec">{specLine}</p>}

        <p className="seller-request-card__budget">{budgetLine}</p>

        {colorLine && <p className="seller-request-card__detail">{colorLine}</p>}

        <RequestLocationText
          className="seller-request-card__location"
          location={request.location}
          zone={request.zone}
          country={request.country}
          locale={locale}
        />

        {request.requirements?.trim() && (
          <p className="seller-request-card__description">&ldquo;{request.requirements.trim()}&rdquo;</p>
        )}
      </div>
    );
  }

  const sqmParts = [
    request.bedrooms != null ? `${request.bedrooms} ${t('request.bedroomsShort')}` : null,
    formatMinSqmLabel(request.minSqm, locale),
    formatMaxSqmLabel(request.maxSqm, locale),
  ].filter(Boolean);

  return (
    <div className={`seller-request-card seller-request-card--estate${className ? ` ${className}` : ''}`}>
      <div className="seller-request-card__status">
        <RequestStatusBadge status={request.status} />
        <span className="seller-request-card__operation">{operationLabel(locale, request.operation)}</span>
      </div>

      <h3 className="seller-request-card__title">{request.title}</h3>

      {sqmParts.length > 0 && (
        <p className="seller-request-card__spec">{sqmParts.join(' · ')}</p>
      )}

      <p className="seller-request-card__budget">
        {formatBudgetCapLabel(request.budget, request.currency, locale, request.budgetPeriod)}
      </p>

      <RequestLocationText
        className="seller-request-card__location"
        location={request.location}
        zone={request.zone}
        country={request.country}
        locale={locale}
      />

      {request.requirements?.trim() && (
        <p className="seller-request-card__description">&ldquo;{request.requirements.trim()}&rdquo;</p>
      )}
    </div>
  );
}
