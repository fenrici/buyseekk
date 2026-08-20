'use client';

import { formatRequestLocationDisplay, type AppLocale } from '@buyseekk/shared';

type Props = {
  location: string;
  zone?: string | null;
  country?: string | null;
  locale: AppLocale;
  className?: string;
};

export function RequestLocationText({ location, zone, country, locale, className }: Props) {
  return (
    <p className={className}>
      {formatRequestLocationDisplay({ location, zone, country }, locale)}
    </p>
  );
}
