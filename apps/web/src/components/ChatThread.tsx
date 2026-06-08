'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { ChatDetail } from '@/lib/types';

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

export function ChatThread({ chatId }: { chatId: string }) {
  const [chat, setChat] = useState<ChatDetail | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function load() {
    const data = await api<ChatDetail>(`/chats/${chatId}`);
    setChat(data);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
    const interval = setInterval(() => {
      load().catch(() => {});
    }, 4000);
    return () => clearInterval(interval);
  }, [chatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat?.messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    setError('');
    try {
      const msg = await api<ChatDetail['messages'][0]>(`/chats/${chatId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      });
      setText('');
      setChat((c) => (c ? { ...c, messages: [...c.messages, msg] } : c));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar');
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
        <div>
          <p className="font-semibold">{chat.partner.name}</p>
          <p className="text-xs text-slate-500">{chat.requestTitle}</p>
        </div>
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
          className="flex-1 rounded-xl border px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
          placeholder="Escribí un mensaje..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
