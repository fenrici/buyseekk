'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, normalizePaginated } from '@/lib/api';
import { useT } from '@/lib/i18n';
import type { OfferItem, PaginatedResult } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';

export function SellerSubnav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const t = useT();
  const [sentTotal, setSentTotal] = useState(0);

  useEffect(() => {
    if (!user) return;
    api<PaginatedResult<OfferItem> | OfferItem[]>('/offers/sent?limit=1')
      .then((raw) => setSentTotal(normalizePaginated(raw).total))
      .catch(() => setSentTotal(0));
  }, [user, pathname]);

  const tabs = [
    { href: '/seller', label: t('seller.tabBrowse'), match: (p: string) => p === '/seller' },
    { href: '/seller/offers', label: t('seller.tabSent'), match: (p: string) => p.startsWith('/seller/offers') },
  ];

  return (
    <div className="panel-tabs mt-6">
      {tabs.map((tab) => {
        const active = tab.match(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`panel-tab ${active ? 'active' : ''}`}
          >
            {tab.label}
            {tab.href === '/seller/offers' && sentTotal > 0 && (
              <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${active ? 'bg-white/20' : 'bg-indigo-500/80 text-white'}`}>
                {sentTotal}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
