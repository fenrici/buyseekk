'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { api, normalizePaginated } from '@/lib/api';
import type { OfferItem, PaginatedResult, PendingRatingItem } from '@/lib/types';
import type { MobileNavContext } from '@/hooks/useMobileNavContext';
import type { User } from '@/lib/types';
import { isBuyerRole, isSellerRole } from '@/lib/auth';

export type MobileNavBadges = {
  offers: number;
  profile: number;
};

export function useMobileNavBadges(user: User | null, context: MobileNavContext | null): MobileNavBadges {
  const pathname = usePathname();
  const [badges, setBadges] = useState<MobileNavBadges>({ offers: 0, profile: 0 });

  useEffect(() => {
    if (!user || !context) {
      setBadges({ offers: 0, profile: 0 });
      return;
    }

    let cancelled = false;

    async function load() {
      const tasks: Promise<void>[] = [];

      if (context === 'buyer' && isBuyerRole(user!.role)) {
        tasks.push(
          api<PaginatedResult<OfferItem> | OfferItem[]>('/offers/received?limit=1')
            .then((raw) => {
              if (!cancelled) {
                setBadges((b) => ({ ...b, offers: normalizePaginated(raw).total }));
              }
            })
            .catch(() => {}),
        );
      }

      if (context === 'seller' && isSellerRole(user!.role)) {
        tasks.push(
          api<PaginatedResult<OfferItem> | OfferItem[]>('/offers/sent?limit=1')
            .then((raw) => {
              if (!cancelled) {
                setBadges((b) => ({ ...b, offers: normalizePaginated(raw).total }));
              }
            })
            .catch(() => {}),
        );
      }

      if (pathname !== '/ratings') {
        tasks.push(
          api<PaginatedResult<PendingRatingItem> | PendingRatingItem[]>('/ratings/pending?limit=1')
            .then((raw) => {
              if (!cancelled) {
                setBadges((b) => ({ ...b, profile: normalizePaginated(raw).total }));
              }
            })
            .catch(() => {}),
        );
      }

      await Promise.all(tasks);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user, context, pathname]);

  return badges;
}
