import { api } from './api';
import { getChatSocket } from './socket';

export type ChatUnreadState = {
  totalUnread: number;
  byChatId: Record<string, number>;
};

const EMPTY: ChatUnreadState = { totalUnread: 0, byChatId: {} };

type InboxBumpListener = () => void;
type UnreadStateListener = (state: ChatUnreadState) => void;

let handlersBound = false;
let unreadRefreshPromise: Promise<ChatUnreadState> | null = null;
const inboxBumpListeners = new Set<InboxBumpListener>();
const unreadStateListeners = new Set<UnreadStateListener>();

function fetchUnreadSummary(): Promise<ChatUnreadState> {
  if (!unreadRefreshPromise) {
    unreadRefreshPromise = api<ChatUnreadState>('/chats/unread-summary')
      .catch(() => EMPTY)
      .finally(() => {
        unreadRefreshPromise = null;
      });
  }
  return unreadRefreshPromise;
}

function refreshUnreadFromApi() {
  void fetchUnreadSummary().then((state) => {
    for (const listener of unreadStateListeners) listener(state);
  });
}

function bindHandlersOnce() {
  if (handlersBound) return;
  handlersBound = true;

  const socket = getChatSocket();

  socket.on('unread-update', (payload?: ChatUnreadState) => {
    for (const bump of inboxBumpListeners) bump();
    if (payload && typeof payload.totalUnread === 'number' && payload.byChatId) {
      for (const listener of unreadStateListeners) listener(payload);
      return;
    }
    refreshUnreadFromApi();
  });

  socket.on('connect', () => {
    for (const bump of inboxBumpListeners) bump();
    refreshUnreadFromApi();
  });
}

export function subscribeChatUnreadState(listener: UnreadStateListener): () => void {
  unreadStateListeners.add(listener);
  bindHandlersOnce();
  return () => {
    unreadStateListeners.delete(listener);
  };
}

export function subscribeChatInboxBump(listener: InboxBumpListener): () => void {
  inboxBumpListeners.add(listener);
  bindHandlersOnce();

  const socket = getChatSocket();
  if (!socket.connected) socket.connect();

  return () => {
    inboxBumpListeners.delete(listener);
  };
}

export function requestChatUnreadRefresh() {
  refreshUnreadFromApi();
}

export function fetchChatUnreadSummary() {
  return fetchUnreadSummary();
}

/** Solo para tests y logout. */
export function resetChatUnreadSocketBridge() {
  handlersBound = false;
  unreadRefreshPromise = null;
  inboxBumpListeners.clear();
  unreadStateListeners.clear();
}

export function getChatUnreadSocketSubscriberCount() {
  return inboxBumpListeners.size + unreadStateListeners.size;
}
