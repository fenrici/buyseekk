'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, normalizePaginated } from '@/lib/api';
import { ChatPreview, PaginatedResult } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { Header } from '@/components/Header';
import { PanelListLoading } from '@/components/PanelListLoading';
import { PaginationControls } from '@/components/PaginationControls';
import { useAuth } from '@/providers/AuthProvider';
import { dateLocale, useLocale, useT } from '@/lib/i18n';
import { useChatUnread } from '@/hooks/useChatUnread';

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
  const [loading, setLoading] = useState(true);
  const { byChatId } = useChatUnread(user);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    api<PaginatedResult<ChatPreview> | ChatPreview[]>(`/chats?page=${page}`)
      .then((raw) => {
        if (cancelled) return;
        const res = normalizePaginated(raw);
        setChats(res.items);
        setMeta({ total: res.total, totalPages: res.totalPages, page: res.page });
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, page]);

  if (!user) return null;

  return (
    <div className="panel-dark">
      <Header variant="dark" />
      <main className="mx-auto max-w-2xl px-4 py-6 pb-4 max-md:py-5">
        <h1 className="text-3xl font-bold text-white">{t('chat.title')}</h1>
        <p className="mt-1 text-slate-500">{t('chat.subtitle')}</p>

        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

        <div className="mt-8 space-y-3">
          <PanelListLoading loading={loading} />
          {!loading && (
            <>
              {chats.length === 0 && (
                <div className="card empty-state p-8">
                  <p className="text-4xl">💬</p>
                  <p className="mt-3">{t('chat.empty')}</p>
                  <p className="mt-1 text-sm">{t('chat.emptyHint')}</p>
                </div>
              )}
              {chats.map((c) => {
                const unread = c.unreadCount ?? byChatId[c.id] ?? 0;
                return (
                <Link
                  key={c.id}
                  href={`/chats/${c.id}`}
                  className={`card chat-list-item flex items-center gap-3 p-4 transition sm:gap-4 ${unread > 0 ? 'chat-list-item--unread' : ''}`}
                >
                  <Avatar name={c.partner.name} url={c.partner.avatarUrl} size={48} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`min-w-0 truncate ${unread > 0 ? 'font-bold' : 'font-semibold'}`}>
                        {c.partner.name}
                      </p>
                      <span className="flex shrink-0 items-center gap-1.5">
                        {unread > 0 && (
                          <span className="chat-list-item__badge" aria-label={t('chat.unread').replace('{count}', String(unread))}>
                            +{unread > 99 ? '99' : unread}
                          </span>
                        )}
                        <span className="chat-list-item__time">{formatTime(c.updatedAt, locale)}</span>
                      </span>
                    </div>
                    <p className="truncate text-xs text-indigo-400">{c.requestTitle}</p>
                    {c.lastMessage && (
                      <p className={`mt-1 truncate text-sm ${unread > 0 ? 'font-medium text-slate-300' : 'text-slate-500'}`}>
                        {c.lastMessage.text}
                      </p>
                    )}
                  </div>
                </Link>
              );
              })}
              <PaginationControls
                page={meta.page}
                totalPages={meta.totalPages}
                total={meta.total}
                onPageChange={setPage}
                itemLabel={t('nav.messages').toLowerCase()}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
