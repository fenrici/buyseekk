'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { StarRating } from './StarRating';
import { UserRatingBadge } from './UserRatingBadge';

type RatingContext = {
  offerId: string;
  myRole: 'buyer' | 'seller';
  partner: {
    id: string;
    name: string;
    stats: { avgStars: number | null; reviewCount: number; noResponseCount: number };
  };
  myRating: { type: string; stars: number | null; comment: string | null } | null;
  canMarkNoResponse: boolean;
  canReview: boolean;
};

export function RatingPanel({ offerId }: { offerId: string }) {
  const [ctx, setCtx] = useState<RatingContext | null>(null);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const data = await api<RatingContext>(`/ratings/offer/${offerId}`);
    setCtx(data);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [offerId]);

  async function submitReview() {
    if (!stars) return;
    setLoading(true);
    setError('');
    try {
      await api('/ratings', {
        method: 'POST',
        body: JSON.stringify({ offerId, type: 'REVIEW', stars, comment: comment || undefined }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  async function submitNoResponse() {
    setLoading(true);
    setError('');
    try {
      await api('/ratings', {
        method: 'POST',
        body: JSON.stringify({ offerId, type: 'NO_RESPONSE' }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  if (!ctx) return null;

  return (
    <div className="card mt-4 p-4">
      <h3 className="text-sm font-bold text-slate-800">Valoración</h3>
      <p className="mt-1 text-xs text-slate-500">
        Reputación de <strong>{ctx.partner.name}</strong> (visible para vendedores)
      </p>
      <div className="mt-2">
        <UserRatingBadge stats={ctx.partner.stats} />
      </div>

      {ctx.myRating ? (
        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
          {ctx.myRating.type === 'NO_RESPONSE' ? (
            <p className="font-semibold text-amber-700">Marcaste: comprador sin respuesta</p>
          ) : (
            <>
              <p className="font-semibold">Tu valoración</p>
              <StarRating value={ctx.myRating.stars ?? 0} size="md" />
              {ctx.myRating.comment && <p className="mt-1 text-slate-600">{ctx.myRating.comment}</p>}
            </>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {ctx.canReview && (
            <>
              <p className="text-xs font-semibold text-slate-600">
                {ctx.myRole === 'buyer' ? '¿Cómo fue el vendedor?' : '¿Cómo fue el comprador?'}
              </p>
              <StarRating value={stars} interactive size="md" showValue={false} onChange={setStars} />
              <textarea
                className="input w-full"
                rows={2}
                placeholder="Comentario opcional..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <button
                type="button"
                disabled={loading || !stars}
                onClick={submitReview}
                className="btn btn-primary w-full"
              >
                Enviar valoración
              </button>
            </>
          )}
          {ctx.canMarkNoResponse && (
            <button
              type="button"
              disabled={loading}
              onClick={submitNoResponse}
              className="btn btn-ghost w-full text-amber-700"
            >
              Marcar: el comprador no respondió
            </button>
          )}
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
