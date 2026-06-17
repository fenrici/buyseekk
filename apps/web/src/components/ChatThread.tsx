'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api, getToken } from '@/lib/api';
import { dateLocale, useLocale, useT } from '@/lib/i18n';
import { getChatSocket } from '@/lib/socket';
import { ChatDetail, ChatMessage } from '@/lib/types';
import { Avatar } from './Avatar';
import { useAuth } from '@/providers/AuthProvider';
import { EmailVerificationErrorAlert } from '@/components/EmailVerificationErrorAlert';

function formatTime(iso: string, locale: ReturnType<typeof useLocale>) {
  const d = new Date(iso);
  const now = new Date();
  const loc = dateLocale(locale);
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString(loc, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function appendMessage(prev: ChatDetail | null, msg: ChatMessage): ChatDetail | null {
  if (!prev || prev.messages.some((m) => m.id === msg.id)) return prev;
  return { ...prev, messages: [...prev.messages, msg] };
}

function prependMessages(prev: ChatDetail, older: ChatMessage[]): ChatDetail {
  const existing = new Set(prev.messages.map((m) => m.id));
  const unique = older.filter((m) => !existing.has(m.id));
  return { ...prev, messages: [...unique, ...prev.messages] };
}

export function ChatThread({
  chatId,
  onLoaded,
  className,
  keyboardOpen = false,
  hideHeaderOnMobile = false,
}: {
  chatId: string;
  onLoaded?: (chat: ChatDetail) => void;
  className?: string;
  keyboardOpen?: boolean;
  hideHeaderOnMobile?: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const { user } = useAuth();
  const [chat, setChat] = useState<ChatDetail | null>(null);
  const [partnerLastReadAt, setPartnerLastReadAt] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [live, setLive] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipScrollRef = useRef(false);

  function scrollMessagesToBottom(behavior: ScrollBehavior = 'smooth') {
    const el = messagesRef.current;
    if (!el) return;
    if (behavior === 'smooth') {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    } else {
      el.scrollTop = el.scrollHeight;
    }
  }

  function scrollToBottomAfterFocus() {
    scrollMessagesToBottom('auto');
    requestAnimationFrame(() => scrollMessagesToBottom('auto'));
  }

  useEffect(() => {
    api<ChatDetail>(`/chats/${chatId}`)
      .then((data) => {
        setChat(data);
        setPartnerLastReadAt(data.partnerLastReadAt ?? null);
        onLoaded?.(data);
      })
      .catch((e) => setError(e.message));
  }, [chatId, onLoaded]);

  useEffect(() => {
    const socket = getChatSocket();
    socket.auth = { token: getToken() };
    socket.connect();
    socket.emit('join', chatId);

    const onMessage = (msg: ChatMessage) => {
      setChat((c) => appendMessage(c, msg));
    };
    const onPartnerRead = (payload: { userId: string; readAt: string }) => {
      if (payload.userId !== user?.id) {
        setPartnerLastReadAt(payload.readAt);
      }
    };
    const onConnect = () => setLive(true);
    const onDisconnect = () => setLive(false);

    socket.on('message', onMessage);
    socket.on('partner-read', onPartnerRead);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    if (socket.connected) setLive(true);

    return () => {
      socket.off('message', onMessage);
      socket.off('partner-read', onPartnerRead);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [chatId, user?.id]);

  useEffect(() => {
    if (skipScrollRef.current) {
      skipScrollRef.current = false;
      return;
    }
    scrollMessagesToBottom(keyboardOpen ? 'auto' : 'smooth');
  }, [chat?.messages.length, keyboardOpen]);

  useEffect(() => {
    if (!keyboardOpen) return;
    scrollMessagesToBottom('auto');
  }, [keyboardOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const vv = window.visualViewport;
    if (!vv) return;

    function onViewportChange() {
      if (document.activeElement === inputRef.current) {
        scrollMessagesToBottom('auto');
      }
    }

    vv.addEventListener('resize', onViewportChange);
    vv.addEventListener('scroll', onViewportChange);
    return () => {
      vv.removeEventListener('resize', onViewportChange);
      vv.removeEventListener('scroll', onViewportChange);
    };
  }, []);

  async function loadOlderMessages() {
    if (!chat?.messagesMeta?.hasOlderPage || loadingOlder) return;
    const prevPage = chat.messagesMeta.page - 1;
    setLoadingOlder(true);
    setError('');
    try {
      const limit = chat.messagesMeta.limit;
      const data = await api<ChatDetail>(`/chats/${chatId}?messagesPage=${prevPage}&messagesLimit=${limit}`);
      skipScrollRef.current = true;
      setChat((c) => {
        if (!c) return data;
        return {
          ...c,
          messages: prependMessages(c, data.messages).messages,
          messagesMeta: data.messagesMeta,
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setLoadingOlder(false);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    setError('');
    const payload = text.trim();
    setText('');

    const socket = getChatSocket();
    if (socket.connected) {
      socket.emit('send', { chatId, text: payload }, (res: ChatMessage | { message?: string }) => {
        setSending(false);
        if (res && 'id' in res) {
          setChat((c) => appendMessage(c, res));
        } else if (res && 'message' in res) {
          setError(String(res.message));
        }
      });
      return;
    }

    try {
      const msg = await api<ChatMessage>(`/chats/${chatId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ text: payload }),
      });
      setChat((c) => appendMessage(c, msg));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
      setText(payload);
    } finally {
      setSending(false);
    }
  }

  if (!chat) {
    return (
      <div className="chat-thread chat-thread--loading flex flex-1 items-center justify-center text-slate-500">
        {error || t('chat.loading')}
      </div>
    );
  }

  return (
    <div
      className={`chat-thread card flex min-h-0 flex-col overflow-hidden p-0 ${className ?? 'flex-1'} ${hideHeaderOnMobile ? 'chat-thread--mobile-fullscreen' : ''}`}
    >
      <div className={`chat-thread__header flex shrink-0 items-center gap-3 border-b px-4 py-3 ${hideHeaderOnMobile ? 'max-md:hidden' : ''}`}>
        <Link href={`/users/${chat.partner.id}`} className="shrink-0">
          <Avatar name={chat.partner.name} url={chat.partner.avatarUrl} size={40} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/users/${chat.partner.id}`} className="font-semibold hover:underline">
            {chat.partner.name}
          </Link>
          <p className="truncate text-xs text-slate-500">{chat.requestTitle}</p>
        </div>
        <span className={`shrink-0 text-xs font-semibold ${live ? 'text-emerald-600' : 'text-slate-400'}`}>
          {live ? t('chat.live') : t('chat.reconnecting')}
        </span>
      </div>

      <div ref={messagesRef} className="chat-thread__messages space-y-3 p-4">
        {chat.messagesMeta?.hasOlderPage && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={loadOlderMessages}
              disabled={loadingOlder}
              className="btn btn-ghost border text-xs"
            >
              {loadingOlder ? t('chat.loadingOlder') : t('chat.loadOlder')}
            </button>
          </div>
        )}
        {chat.messages.map((m) => {
          if (m.fromRole === 'system') {
            return (
              <div key={m.id} className="chat-bubble-system mx-auto max-w-md px-3 py-2">
                {m.text}
              </div>
            );
          }
          const isMine = m.fromRole === chat.myRole;
          const isRead =
            isMine &&
            partnerLastReadAt != null &&
            new Date(m.createdAt).getTime() <= new Date(partnerLastReadAt).getTime();
          return (
            <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-4 py-2 ${isMine ? 'chat-bubble-mine' : 'chat-bubble-theirs'}`}>
                <p className="text-sm break-words">{m.text}</p>
                <div
                  className={`mt-1 flex items-center justify-end gap-1.5 text-[10px] ${isMine ? 'text-indigo-200' : 'text-slate-400'}`}
                >
                  <span>{formatTime(m.createdAt, locale)}</span>
                  {isRead && <span className="chat-bubble-read">{t('chat.read')}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="chat-thread__error-wrap shrink-0 px-4 pb-2">
          <EmailVerificationErrorAlert message={error} />
        </div>
      )}

      <form onSubmit={handleSend} className="chat-thread__composer">
        <input
          ref={inputRef}
          type="text"
          enterKeyHint="send"
          autoComplete="off"
          autoCorrect="on"
          className="input chat-thread__composer-input"
          placeholder={t('chat.placeholder')}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={scrollToBottomAfterFocus}
          maxLength={2000}
        />
        <button type="submit" disabled={sending || !text.trim()} className="btn btn-primary chat-thread__composer-send">
          {t('chat.send')}
        </button>
      </form>
    </div>
  );
}
