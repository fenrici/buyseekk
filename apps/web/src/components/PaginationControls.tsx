'use client';

import { useT } from '@/lib/i18n';

type Props = {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
  scrollToTopOnChange?: boolean;
};

function scrollListToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
}

export function PaginationControls({
  page,
  totalPages,
  total,
  onPageChange,
  itemLabel,
  scrollToTopOnChange = true,
}: Props) {
  const t = useT();
  if (totalPages <= 1) return null;

  const changePage = (nextPage: number) => {
    onPageChange(nextPage);
    if (scrollToTopOnChange) scrollListToTop();
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
      <p className="text-sm text-slate-500">
        {t('common.pageInfo', {
          page: String(page),
          totalPages: String(totalPages),
          total: String(total),
          items: itemLabel ?? t('common.items'),
        })}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => changePage(page - 1)}
          className="btn btn-ghost border disabled:opacity-40"
        >
          {t('common.prevPage')}
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => changePage(page + 1)}
          className="btn btn-ghost border disabled:opacity-40"
        >
          {t('common.nextPage')}
        </button>
      </div>
    </div>
  );
}
