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
  const [showRating, setShowRating] = useState(false);

  if (!user) return null;

  return (
    <div className="panel-dark flex h-[100dvh] flex-col overflow-hidden">
      <Header variant="dark" />
      <main className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col overflow-hidden px-4 py-4">
        <Link href="/chats" className="shrink-0 text-sm font-semibold text-indigo-400 hover:underline">
          {t('chat.back')}
        </Link>
        <div className="mt-3 flex min-h-0 flex-1 flex-col gap-2">
          <ChatThread
            chatId={id}
            className="min-h-0 flex-1"
            onLoaded={(c) => setOfferId(c.offerId)}
          />
          {offerId && (
            <div className="shrink-0">
              <button
                type="button"
                onClick={() => setShowRating((open) => !open)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-xs font-semibold text-slate-300 hover:bg-white/10"
              >
                {showRating ? t('rating.hidePanel') : t('rating.showPanel')}
              </button>
              {showRating && <RatingPanel offerId={offerId} />}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
