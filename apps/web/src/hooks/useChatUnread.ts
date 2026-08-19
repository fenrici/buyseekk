'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  fetchChatUnreadSummary,
  subscribeChatInboxBump,
  subscribeChatUnreadState,
  type ChatUnreadState,
} from '@/lib/chat-unread-socket';
import type { User } from '@/lib/types';

export type { ChatUnreadState };

const EMPTY: ChatUnreadState = { totalUnread: 0, byChatId: {} };

export function useChatUnread(user: User | null, opts?: { trackInbox?: boolean }) {
  const [unread, setUnread] = useState<ChatUnreadState>(EMPTY);
  const [inboxVersion, setInboxVersion] = useState(0);
  const trackInbox = opts?.trackInbox ?? false;

  const refresh = useCallback(() => {
    if (!user || user.role === 'ADMIN') {
      setUnread(EMPTY);
      return Promise.resolve();
    }
    return fetchChatUnreadSummary().then(setUnread);
  }, [user?.id, user?.activeMode]);

  useEffect(() => {
    if (!user || user.role === 'ADMIN') {
      setUnread(EMPTY);
      return;
    }

    void refresh();

    const unsubState = subscribeChatUnreadState(setUnread);

    const unsubInbox =
      trackInbox ?
        subscribeChatInboxBump(() => setInboxVersion((n) => n + 1))
      : undefined;

    return () => {
      unsubState();
      unsubInbox?.();
    };
  }, [user?.id, user?.activeMode, refresh, trackInbox]);

  return { ...unread, refresh, inboxVersion };
}
