import { StarRating } from './StarRating';

type Stats = {
  avgStars: number | null;
  reviewCount: number;
  noResponseCount: number;
};

export function UserRatingBadge({ stats, compact }: { stats?: Stats; compact?: boolean }) {
  if (!stats) return null;

  const hasReviews = stats.reviewCount > 0 && stats.avgStars !== null;
  const hasFlags = stats.noResponseCount > 0;

  if (!hasReviews && !hasFlags) {
    return <span className="text-xs text-slate-400">Sin valoraciones aún</span>;
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? 'text-xs' : 'text-sm'}`}>
      {hasReviews && (
        <span className="inline-flex items-center gap-1">
          <StarRating value={stats.avgStars!} showValue />
          <span className="text-slate-400">({stats.reviewCount})</span>
        </span>
      )}
      {hasFlags && (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
          {stats.noResponseCount} sin respuesta
        </span>
      )}
    </div>
  );
}
