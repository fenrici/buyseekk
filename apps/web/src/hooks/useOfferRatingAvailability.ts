'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type RatingAvailability = {
  canReview: boolean;
  canMarkNoResponse: boolean;
  hasRating: boolean;
  loading: boolean;
};

export function useOfferRatingAvailability(offerId: string | null): RatingAvailability {
  const [state, setState] = useState<RatingAvailability>({
    canReview: false,
    canMarkNoResponse: false,
    hasRating: false,
    loading: !!offerId,
  });

  useEffect(() => {
    if (!offerId) {
      setState({ canReview: false, canMarkNoResponse: false, hasRating: false, loading: false });
      return;
    }

    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true }));

    api<{ canReview: boolean; canMarkNoResponse: boolean; myRating: unknown }>(
      `/ratings/offer/${offerId}`,
    )
      .then((ctx) => {
        if (cancelled) return;
        setState({
          canReview: ctx.canReview,
          canMarkNoResponse: ctx.canMarkNoResponse,
          hasRating: !!ctx.myRating,
          loading: false,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setState({
            canReview: false,
            canMarkNoResponse: false,
            hasRating: false,
            loading: false,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [offerId]);

  return state;
}
