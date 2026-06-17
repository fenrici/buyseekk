'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { getToken } from '@/lib/api';
import { getChatSocket } from '@/lib/socket';
import type { User } from '@/lib/types';

export type ChatUnreadState = {
  totalUnread: number;
  byChatId: Record<string, number>;
};

const EMPTY: ChatUnreadState = { totalUnread: 0, byChatId: {} };

export function useChatUnread(user: User | null) {
  const [unread, setUnread] = useState<ChatUnreadState>(EMPTY);

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
    socket.auth = { token: getToken() };
    if (!socket.connected) socket.connect();

    const onUnread = () => {
      if (!cancelled) void refresh();
    };

    socket.on('unread-update', onUnread);

    return () => {
      cancelled = true;
      socket.off('unread-update', onUnread);
    };
  }, [user?.id, user?.activeMode, refresh]);

  return { ...unread, refresh };
}
