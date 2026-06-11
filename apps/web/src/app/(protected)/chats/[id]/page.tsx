'use client';

import { useState } from 'react';
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

  if (!user) return null;

  return (
    <div className="chat-page panel-dark">
      <div className="chat-page__header-desktop max-md:hidden">
        <Header variant="dark" />
      </div>

      <header className="chat-page__header-mobile md:hidden">
        <Link href="/chats" className="chat-page__back">
          ← {t('chat.back')}
        </Link>
      </header>

      <main className="chat-page__main">
        <Link href="/chats" className="chat-page__back-desktop">
          {t('chat.back')}
        </Link>

        <div className="chat-page__thread">
          <ChatThread
            chatId={id}
            onLoaded={(c) => setOfferId(c.offerId)}
          />
        </div>

        {offerId && (
          <div className="chat-page__rating">
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
      </main>
    </div>
  );
}
