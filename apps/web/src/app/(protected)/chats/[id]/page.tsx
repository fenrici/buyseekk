'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { ChatThread } from '@/components/ChatThread';
import { RatingPanel } from '@/components/RatingPanel';
import { useVisualViewportHeight } from '@/hooks/useVisualViewportHeight';
import { useT } from '@/lib/i18n';
import { useAuth } from '@/providers/AuthProvider';

export default function ChatDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const t = useT();
  const [offerId, setOfferId] = useState<string | null>(null);
  const [showRating, setShowRating] = useState(false);

  useVisualViewportHeight(true);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  if (!user) return null;

  return (
    <div className="chat-detail-screen panel-dark flex flex-col overflow-hidden">
      <div className="chat-detail-screen__header max-md:hidden">
        <Header variant="dark" />
      </div>
      <header className="chat-detail-mobile-bar md:hidden">
        <Link href="/chats" className="chat-detail-mobile-bar__back">
          ← {t('chat.back')}
        </Link>
      </header>
      <main className="chat-detail-screen__main mx-auto flex w-full max-w-2xl flex-1 flex-col overflow-hidden px-4 py-3 md:py-4">
        <Link
          href="/chats"
          className="chat-detail-back-desktop shrink-0 text-sm font-semibold text-indigo-400 hover:underline"
        >
          {t('chat.back')}
        </Link>
        <div className="mt-2 flex min-h-0 flex-1 flex-col gap-2 md:mt-3">
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
