'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Avatar } from '@/components/Avatar';
import { Header } from '@/components/Header';
import { ChatThread } from '@/components/ChatThread';
import { RatingPanel } from '@/components/RatingPanel';
import { useChatViewport } from '@/hooks/useChatViewport';
import { useT } from '@/lib/i18n';
import type { ChatDetail } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';

export default function ChatDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const t = useT();
  const [chat, setChat] = useState<ChatDetail | null>(null);
  const [offerId, setOfferId] = useState<string | null>(null);
  const [showRating, setShowRating] = useState(false);

  const { keyboardOpen } = useChatViewport(true);

  if (!user) return null;

  return (
    <div className="chat-page panel-dark">
      <div className="chat-page__header-desktop max-md:hidden">
        <Header variant="dark" />
      </div>

      <header className="chat-page__header-mobile md:hidden">
        <Link href="/chats" className="chat-page__back" aria-label={t('chat.back')}>
          ←
        </Link>
        {chat ? (
          <Link href={`/users/${chat.partner.id}`} className="chat-page__header-info">
            <Avatar name={chat.partner.name} url={chat.partner.avatarUrl} size={36} />
            <div className="chat-page__header-text">
              <span className="chat-page__header-name">{chat.partner.name}</span>
              <span className="chat-page__header-subtitle">{chat.requestTitle}</span>
            </div>
          </Link>
        ) : (
          <div className="chat-page__header-info chat-page__header-info--loading">
            <span className="chat-page__header-name">{t('chat.loading')}</span>
          </div>
        )}
        {offerId && (
          <button
            type="button"
            className="chat-page__rate-btn"
            onClick={() => setShowRating((open) => !open)}
            aria-expanded={showRating}
            aria-label={showRating ? t('rating.hidePanel') : t('rating.showPanel')}
          >
            ★
          </button>
        )}
      </header>

      {showRating && offerId && (
        <div className="chat-page__rating-sheet md:hidden" role="dialog" aria-label={t('rating.showPanel')}>
          <div className="chat-page__rating-sheet-inner">
            <div className="chat-page__rating-sheet-header">
              <span className="text-sm font-semibold text-slate-200">{t('rating.showPanel')}</span>
              <button
                type="button"
                className="chat-page__rating-close"
                onClick={() => setShowRating(false)}
                aria-label={t('rating.hidePanel')}
              >
                ✕
              </button>
            </div>
            <RatingPanel offerId={offerId} />
          </div>
        </div>
      )}

      <main className="chat-page__main">
        <Link href="/chats" className="chat-page__back-desktop">
          {t('chat.back')}
        </Link>

        <div className="chat-page__thread">
          <ChatThread
            chatId={id}
            keyboardOpen={keyboardOpen}
            hideHeaderOnMobile
            onLoaded={(c) => {
              setChat(c);
              setOfferId(c.offerId);
            }}
          />
        </div>

        {offerId && (
          <div className="chat-page__rating-desktop max-md:hidden">
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
