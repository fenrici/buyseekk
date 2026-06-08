'use client';

import { useEffect, useRef, useState } from 'react';
import { api, getToken } from '@/lib/api';
import { getChatSocket } from '@/lib/socket';
import { ChatDetail, ChatMessage } from '@/lib/types';

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

function appendMessage(prev: ChatDetail | null, msg: ChatMessage): ChatDetail | null {
  if (!prev || prev.messages.some((m) => m.id === msg.id)) return prev;
  return { ...prev, messages: [...prev.messages, msg] };
}

export function ChatThread({ chatId }: { chatId: string }) {
  const [chat, setChat] = useState<ChatDetail | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [live, setLive] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<ChatDetail>(`/chats/${chatId}`)
      .then(setChat)
      .catch((e) => setError(e.message));
  }, [chatId]);

  useEffect(() => {
    const socket = getChatSocket();
    socket.auth = { token: getToken() };
    socket.connect();
    socket.emit('join', chatId);

    const onMessage = (msg: ChatMessage) => {
      setChat((c) => appendMessage(c, msg));
    };
    const onConnect = () => setLive(true);
    const onDisconnect = () => setLive(false);

    socket.on('message', onMessage);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    if (socket.connected) setLive(true);

    return () => {
      socket.off('message', onMessage);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.disconnect();
    };
  }, [chatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat?.messages.length]);

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
      setError(err instanceof Error ? err.message : 'Error al enviar');
      setText(payload);
    } finally {
      setSending(false);
    }
  }

  if (!chat) {
    return <div className="flex h-96 items-center justify-center text-slate-500">Cargando chat...</div>;
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] min-h-[28rem] flex-col rounded-xl border bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
          {initials(chat.partner.name)}
        </div>
        <div className="flex-1">
          <p className="font-semibold">{chat.partner.name}</p>
          <p className="text-xs text-slate-500">{chat.requestTitle}</p>
        </div>
        <span className={`text-xs font-semibold ${live ? 'text-emerald-600' : 'text-slate-400'}`}>
          {live ? '● En vivo' : 'Reconectando...'}
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {chat.messages.map((m) => {
          if (m.fromRole === 'system') {
            return (
              <div key={m.id} className="chat-bubble-system mx-auto max-w-md px-3 py-2">
                {m.text}
              </div>
            );
          }
          const isMine = m.fromRole === chat.myRole;
          return (
            <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-4 py-2 ${isMine ? 'chat-bubble-mine' : 'chat-bubble-theirs'}`}>
                <p className="text-sm">{m.text}</p>
                <p className={`mt-1 text-[10px] ${isMine ? 'text-indigo-200' : 'text-slate-400'}`}>
                  {formatTime(m.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {error && <p className="px-4 text-xs text-red-600">{error}</p>}

      <form onSubmit={handleSend} className="flex gap-2 border-t p-4">
        <input
          className="input flex-1"
          placeholder="Escribí un mensaje..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
        />
        <button type="submit" disabled={sending || !text.trim()} className="btn btn-primary">
          Enviar
        </button>
      </form>
    </div>
  );
}
