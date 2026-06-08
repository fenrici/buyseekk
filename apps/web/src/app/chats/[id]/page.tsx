'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { ChatThread } from '@/components/ChatThread';
import { RatingPanel } from '@/components/RatingPanel';
import { api } from '@/lib/api';
import { ChatDetail } from '@/lib/types';
import { useUser } from '@/hooks/useUser';

export default function ChatDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading } = useUser();
  const [offerId, setOfferId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    api<ChatDetail>(`/chats/${id}`).then((c) => setOfferId(c.offerId)).catch(() => {});
  }, [id, user]);

  if (loading || !user) {
    return <><Header /><main className="p-8">Cargando...</main></>;
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <Link href="/chats" className="text-sm font-semibold text-indigo-600 hover:underline">
          ← Volver a mensajes
        </Link>
        <div className="mt-4">
          <ChatThread chatId={id} />
          {offerId && <RatingPanel offerId={offerId} />}
        </div>
      </main>
    </>
  );
}
