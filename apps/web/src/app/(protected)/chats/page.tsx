'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { ChatPreview, PaginatedResult } from '@/lib/types';
import { Header } from '@/components/Header';
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

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function ChatsPage() {
  const { user } = useAuth();
  const t = useT();
  const locale = useLocale();
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    api<PaginatedResult<ChatPreview>>('/chats')
      .then((res) => setChats(res.items))
      .catch((e) => setError(e.message));
  }, [user]);

  if (!user) return null;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-3xl font-bold">{t('chat.title')}</h1>
        <p className="mt-1 text-slate-500">{t('chat.subtitle')}</p>

        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

        <div className="mt-8 space-y-3">
          {chats.length === 0 && (
            <div className="rounded-xl border bg-white p-8 text-center text-slate-500">
              <p className="text-4xl">💬</p>
              <p className="mt-3">{t('chat.empty')}</p>
              <p className="mt-1 text-sm">{t('chat.emptyHint')}</p>
            </div>
          )}
          {chats.map((c) => (
            <Link
              key={c.id}
              href={`/chats/${c.id}`}
              className="flex items-center gap-4 rounded-xl border bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                {initials(c.partner.name)}
              </div>
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
        </div>
      </main>
    </>
  );
}
