'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ChatPreview } from '@/lib/types';
import { Header } from '@/components/Header';
import { useUser } from '@/hooks/useUser';

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function ChatsPage() {
  const router = useRouter();
  const { user, loading } = useUser();
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    api<ChatPreview[]>('/chats')
      .then(setChats)
      .catch((e) => setError(e.message));
  }, [user]);

  if (loading || !user) {
    return <><Header /><main className="p-8">Cargando...</main></>;
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-3xl font-bold">Mensajes</h1>
        <p className="mt-1 text-slate-500">Coordiná con compradores o vendedores después de aceptar una oferta</p>

        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

        <div className="mt-8 space-y-3">
          {chats.length === 0 && (
            <div className="rounded-xl border bg-white p-8 text-center text-slate-500">
              <p className="text-4xl">💬</p>
              <p className="mt-3">Todavía no tenés conversaciones activas.</p>
              <p className="mt-1 text-sm">Se abren automáticamente cuando se acepta una oferta.</p>
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
                  <span className="flex-shrink-0 text-xs text-slate-400">{formatTime(c.updatedAt)}</span>
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
