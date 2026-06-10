'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, normalizePaginated } from '@/lib/api';
import { ChatPreview, PaginatedResult } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { Header } from '@/components/Header';
import { PaginationControls } from '@/components/PaginationControls';
import { useAuth } from '@/providers/AuthProvider';
import { dateLocale, useLocale, useT } from '@/lib/i18n';

function formatTime(iso: string, locale: ReturnType<typeof useLocale>) {
  const d = new Date(iso);
  const now = new Date();
  const loc = dateLocale(locale);
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString(loc, { day: 'numeric', month: 'short' });
}

export default function ChatsPage() {
  const { user } = useAuth();
  const t = useT();
  const locale = useLocale();
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, page: 1 });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    api<PaginatedResult<ChatPreview> | ChatPreview[]>(`/chats?page=${page}`)
      .then((raw) => {
        const res = normalizePaginated(raw);
        setChats(res.items);
        setMeta({ total: res.total, totalPages: res.totalPages, page: res.page });
      })
      .catch((e) => setError(e.message));
  }, [user, page]);

  if (!user) return null;

  return (
    <div className="panel-dark">
      <Header variant="dark" />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-3xl font-bold text-white">{t('chat.title')}</h1>
        <p className="mt-1 text-slate-500">{t('chat.subtitle')}</p>

        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

        <div className="mt-8 space-y-3">
          {chats.length === 0 && (
            <div className="card empty-state p-8">
              <p className="text-4xl">💬</p>
              <p className="mt-3">{t('chat.empty')}</p>
              <p className="mt-1 text-sm">{t('chat.emptyHint')}</p>
            </div>
          )}
          {chats.map((c) => (
            <Link
              key={c.id}
              href={`/chats/${c.id}`}
              className="card flex items-center gap-4 p-4 transition hover:border-indigo-200"
            >
              <Avatar name={c.partner.name} url={c.partner.avatarUrl} size={48} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate font-semibold">{c.partner.name}</p>
                  <span className="flex-shrink-0 text-xs text-slate-400">{formatTime(c.updatedAt, locale)}</span>
                </div>
                <p className="truncate text-xs text-indigo-600">{c.requestTitle}</p>
                {c.lastMessage && (
                  <p className="mt-1 truncate text-sm text-slate-500">{c.lastMessage.text}</p>
                )}
              </div>
            </Link>
          ))}
          <PaginationControls
            page={meta.page}
            totalPages={meta.totalPages}
            total={meta.total}
            onPageChange={setPage}
            itemLabel={t('nav.messages').toLowerCase()}
          />
        </div>
      </main>
    </div>
  );
}
