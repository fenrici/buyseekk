'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, normalizePaginated } from '@/lib/api';
import { PaginatedResult, PendingRatingItem } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { Header } from '@/components/Header';
import { PaginationControls } from '@/components/PaginationControls';
import { useAuth } from '@/providers/AuthProvider';
import { useT } from '@/lib/i18n';

export default function RatingsPage() {
  const { user } = useAuth();
  const t = useT();
  const [items, setItems] = useState<PendingRatingItem[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, page: 1 });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    api<PaginatedResult<PendingRatingItem> | PendingRatingItem[]>(`/ratings/pending?page=${page}`)
      .then((raw) => {
        const res = normalizePaginated(raw);
        setItems(res.items);
        setMeta({ total: res.total, totalPages: res.totalPages, page: res.page });
      })
      .catch((e) => setError(e.message));
  }, [user, page]);

  if (!user) return null;

  return (
    <div className="panel-dark">
      <Header variant="dark" />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-3xl font-bold text-white">{t('rating.pendingTitle')}</h1>
        <p className="mt-1 text-slate-500">{t('rating.pendingSubtitle')}</p>

        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

        <div className="mt-8 space-y-4">
          {items.length === 0 && (
            <div className="card empty-state p-8">
              <p className="text-4xl">⭐</p>
              <p className="mt-3">{t('rating.pendingEmpty')}</p>
            </div>
          )}
          {items.map((item) => (
            <article key={item.offerId} className="card p-5">
              <h2 className="font-bold text-white">{item.requestTitle}</h2>
              <Link
                href={`/users/${item.partner.id}`}
                className="mt-2 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-400"
              >
                <Avatar name={item.partner.name} url={item.partner.avatarUrl} size={28} />
                <span>
                  {item.partner.name} · {item.partner.role === 'seller' ? t('compare.seller') : t('compare.buyer')}
                </span>
              </Link>
              {item.chatId ? (
                <Link href={`/chats/${item.chatId}`} className="btn btn-primary mt-4">
                  {t('rating.rateNow')}
                </Link>
              ) : (
                <p className="mt-4 text-sm text-slate-400">{t('rating.pendingEmpty')}</p>
              )}
            </article>
          ))}
          <PaginationControls
            page={meta.page}
            totalPages={meta.totalPages}
            total={meta.total}
            onPageChange={setPage}
            itemLabel={t('nav.ratings').toLowerCase()}
          />
        </div>
      </main>
    </div>
  );
}
