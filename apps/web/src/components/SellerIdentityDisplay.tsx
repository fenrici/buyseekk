'use client';

import { formatSellerBuyerIdentity, type SellerProfileFields } from '@buyseekk/shared';
import { useLocale } from '@/lib/i18n';

type Props = {
  seller?: SellerProfileFields | null;
  compact?: boolean;
};

export function SellerIdentityDisplay({ seller, compact = false }: Props) {
  const locale = useLocale();
  if (!seller?.name) {
    return <p className="offer-decision-bar__seller">—</p>;
  }

  const identity = formatSellerBuyerIdentity({ ...seller, role: 'SELLER' }, locale);

  return (
    <div className={`seller-identity${compact ? ' seller-identity--compact' : ''}`}>
      <p className="seller-identity__title">{identity.titleLine}</p>
      <p className="seller-identity__detail">{identity.detailLine}</p>
    </div>
  );
}
