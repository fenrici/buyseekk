'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { ChatThread } from '@/components/ChatThread';
import { RatingPanel } from '@/components/RatingPanel';
import { useT } from '@/lib/i18n';
import { useAuth } from '@/providers/AuthProvider';

export default function ChatDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const t = useT();
  const [offerId, setOfferId] = useState<string | null>(null);

  if (!user) return null;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <Link href="/chats" className="text-sm font-semibold text-indigo-600 hover:underline">
          {t('chat.back')}
        </Link>
        <div className="mt-4">
          <ChatThread chatId={id} onLoaded={(c) => setOfferId(c.offerId)} />
          {offerId && <RatingPanel offerId={offerId} />}
        </div>
      </main>
    </>
  );
}
