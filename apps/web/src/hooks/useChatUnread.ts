'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { getChatSocket } from '@/lib/socket';
import type { User } from '@/lib/types';

export type ChatUnreadState = {
  totalUnread: number;
  byChatId: Record<string, number>;
};

const EMPTY: ChatUnreadState = { totalUnread: 0, byChatId: {} };

export function useChatUnread(user: User | null) {
  const [unread, setUnread] = useState<ChatUnreadState>(EMPTY);
  const [inboxVersion, setInboxVersion] = useState(0);

  const refresh = useCallback(() => {
    if (!user || user.role === 'ADMIN') {
      setUnread(EMPTY);
      return Promise.resolve();
    }
    return api<ChatUnreadState>('/chats/unread-summary')
      .then(setUnread)
      .catch(() => setUnread(EMPTY));
  }, [user?.id, user?.activeMode]);

  useEffect(() => {
    if (!user || user.role === 'ADMIN') {
      setUnread(EMPTY);
      return;
    }

    let cancelled = false;
    refresh();

    const socket = getChatSocket();
    if (!socket.connected) socket.connect();

    const bumpInbox = () => setInboxVersion((n) => n + 1);

    const onUnread = (payload?: ChatUnreadState) => {
      if (cancelled) return;
      bumpInbox();
      if (payload && typeof payload.totalUnread === 'number' && payload.byChatId) {
        setUnread(payload);
        return;
      }
      void refresh();
    };
    const onConnect = () => {
      if (!cancelled) {
        bumpInbox();
        void refresh();
      }
    };

    socket.on('unread-update', onUnread);
    socket.on('connect', onConnect);

    return () => {
      cancelled = true;
      socket.off('unread-update', onUnread);
      socket.off('connect', onConnect);
    };
  }, [user?.id, user?.activeMode, refresh]);

  return { ...unread, refresh, inboxVersion };
}
