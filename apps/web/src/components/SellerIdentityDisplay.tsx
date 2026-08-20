'use client';

import { formatSellerBuyerIdentity, type SellerProfileFields } from '@buyseekk/shared';
import { useLocale } from '@/lib/i18n';

type Props = {
  seller?: SellerProfileFields | null;
  compact?: boolean;
  /** Light surfaces (e.g. CompareBlock) vs dark panels (decision bar). */
  tone?: 'dark' | 'light';
};

export function SellerIdentityDisplay({ seller, compact = false, tone = 'dark' }: Props) {
  const locale = useLocale();
  if (!seller?.name?.trim()) {
    return <p className={`seller-identity__fallback seller-identity__fallback--${tone}`}>—</p>;
  }

  const identity = formatSellerBuyerIdentity({ ...seller, role: seller.role || 'SELLER' }, locale);

  return (
    <div
      className={`seller-identity seller-identity--${tone}${compact ? ' seller-identity--compact' : ''}`}
    >
      <p className="seller-identity__title">{identity.titleLine}</p>
      <p className="seller-identity__detail">{identity.detailLine}</p>
    </div>
  );
}
