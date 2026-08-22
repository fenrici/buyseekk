import type { AppLocale } from './user-mode';
import type { CarCondition } from './types';
import {
  formatCarConditionLabel,
  isCarColorNoPreference,
  isCarConditionNew,
  isMileageNoPreference,
} from './car-catalog';
import { formatRequestLocationDisplay } from './request-location';

type AutoSpecInput = {
  carBrand?: string | null;
  carModel?: string | null;
  carColor?: string | null;
  carCondition?: CarCondition | null;
  carYearMin?: number | null;
  maxMileage?: number | null;
};

export function autoRequestTitle(request: AutoSpecInput): string {
  if (request.carBrand && request.carModel) {
    return `${request.carBrand} ${request.carModel}`;
  }
  return '';
}

export function formatCarYearMinLabel(
  carYearMin: number | null | undefined,
  locale: AppLocale = 'ES',
): string | null {
  if (carYearMin == null) return null;
  const current = new Date().getFullYear();
  if (carYearMin >= current) {
    return String(carYearMin);
  }
  return locale === 'EN' ? `${carYearMin} or newer` : `${carYearMin} o posterior`;
}

export function formatMaxMileageLabel(
  maxMileage: number | null | undefined,
  locale: AppLocale = 'ES',
): string | null {
  if (isMileageNoPreference(maxMileage)) {
    return locale === 'EN' ? 'Any mileage' : 'Sin preferencia';
  }
  const prefix = locale === 'EN' ? 'Up to' : 'Hasta';
  return `${prefix} ${maxMileage!.toLocaleString(locale === 'EN' ? 'en-US' : 'es-AR')} mi`;
}

export function formatCarColorLabel(
  color: string | null | undefined,
  locale: AppLocale = 'ES',
): string | null {
  if (!color?.trim()) return null;
  if (isCarColorNoPreference(color)) {
    return locale === 'EN' ? 'No preference' : 'Sin preferencia';
  }
  return color;
}

export function formatBudgetCapLabel(
  budget: number,
  currency: string,
  locale: AppLocale = 'ES',
  budgetPeriod?: string | null,
): string {
  const formatted = new Intl.NumberFormat(locale === 'EN' ? 'en-US' : 'es-AR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(budget);
  const period = budgetPeriod?.trim() ?? '';
  const prefix = locale === 'EN' ? 'Up to' : 'Hasta';
  return `${prefix} ${formatted}${period}`;
}

export function formatMinSqmLabel(minSqm: number | null | undefined, locale: AppLocale = 'ES'): string | null {
  if (minSqm == null) return null;
  return locale === 'EN' ? `From ${minSqm} m²` : `Desde ${minSqm} m²`;
}

export function formatMaxSqmLabel(maxSqm: number | null | undefined, locale: AppLocale = 'ES'): string | null {
  if (maxSqm == null) return null;
  const prefix = locale === 'EN' ? 'Up to' : 'Hasta';
  return `${prefix} ${maxSqm} m²`;
}

export function formatAutoSpecLine(
  request: AutoSpecInput,
  locale: AppLocale = 'ES',
): string | null {
  const parts: string[] = [];
  const year = formatCarYearMinLabel(request.carYearMin, locale);
  if (year) parts.push(year);
  if (isCarConditionNew(request.carCondition)) {
    parts.push(formatCarConditionLabel(locale));
  } else if (request.maxMileage != null) {
    const mileage = formatMaxMileageLabel(request.maxMileage, locale);
    if (mileage) parts.push(mileage);
  }
  return parts.length ? parts.join(' · ') : null;
}

export function formatColorFieldLabel(
  color: string | null | undefined,
  locale: AppLocale = 'ES',
): string | null {
  const value = formatCarColorLabel(color, locale);
  if (!value) return null;
  const label = locale === 'EN' ? 'Color' : 'Color';
  return `${label}: ${value}`;
}

export type BuyerRequestSummaryInput = AutoSpecInput & {
  title?: string | null;
  category?: string | null;
  budget?: number | null;
  currency?: string | null;
  budgetPeriod?: string | null;
  location?: string | null;
  zone?: string | null;
  country?: string | null;
  minSqm?: number | null;
  maxSqm?: number | null;
};

/** Líneas compactas para el resumen de Request encima del listado de ofertas. */
export function formatBuyerRequestSummary(
  request: BuyerRequestSummaryInput,
  locale: AppLocale = 'ES',
): { primary: string; secondary: string | null } {
  const title =
    autoRequestTitle(request) ||
    request.title?.trim() ||
    (locale === 'EN' ? 'Your request' : 'Tu solicitud');

  const primaryParts = [title];
  if (request.budget != null && request.budget > 0 && request.currency) {
    primaryParts.push(
      formatBudgetCapLabel(request.budget, request.currency, locale, request.budgetPeriod),
    );
  }
  if (request.location?.trim()) {
    primaryParts.push(
      formatRequestLocationDisplay(
        {
          location: request.location,
          zone: request.zone,
          country: request.country,
        },
        locale,
      ),
    );
  }

  const secondaryParts: string[] = [];
  if (request.category === 'AUTOS' || request.carBrand || request.carModel) {
    const specs = formatAutoSpecLine(request, locale);
    if (specs) secondaryParts.push(specs);
    const color = formatCarColorLabel(request.carColor, locale);
    if (color) secondaryParts.push(color);
  } else {
    const min = formatMinSqmLabel(request.minSqm, locale);
    const max = formatMaxSqmLabel(request.maxSqm, locale);
    if (min) secondaryParts.push(min);
    if (max) secondaryParts.push(max);
  }

  return {
    primary: primaryParts.join(' · '),
    secondary: secondaryParts.length ? secondaryParts.join(' · ') : null,
  };
}
