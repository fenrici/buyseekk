'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { api } from '@/lib/api';
import { NotificationItem } from '@/lib/notifications';
import {
  connectNotificationsSocket,
  disconnectNotificationsSocket,
  getNotificationsSocket,
} from '@/lib/notifications-socket';
import { useAuth } from './AuthProvider';

type ToastState = { title: string; message: string } | null;

type NotificationsContextValue = {
  unreadCount: number;
  recent: NotificationItem[];
  loading: boolean;
  toast: ToastState;
  refresh: () => Promise<void>;
  refreshRecent: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  remove: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  dismissToast: () => void;
  prepend: (item: NotificationItem) => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [recent, setRecent] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const toastTimer = useRef<number | null>(null);

  const showToast = useCallback((title: string, message: string) => {
    setToast({ title, message });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  }, []);

  const refresh = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    const res = await api<{ count: number }>('/notifications/unread-count');
    setUnreadCount(res.count);
  }, [user]);

  const refreshRecent = useCallback(async () => {
    if (!user) {
      setRecent([]);
      return;
    }
    setLoading(true);
    try {
      const items = await api<NotificationItem[]>('/notifications/recent');
      setRecent(items);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const prepend = useCallback((item: NotificationItem) => {
    setRecent((prev) => [item, ...prev.filter((n) => n.id !== item.id)].slice(0, 20));
    if (!item.read) setUnreadCount((c) => c + 1);
  }, []);

  const markRead = useCallback(async (id: string) => {
    const updated = await api<NotificationItem>(`/notifications/${id}/read`, { method: 'PATCH' });
    setRecent((prev) => prev.map((n) => (n.id === id ? updated : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await api('/notifications/read-all', { method: 'PATCH' });
    setRecent((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const remove = useCallback(async (id: string) => {
    const target = recent.find((n) => n.id === id);
    await api(`/notifications/${id}`, { method: 'DELETE' });
    setRecent((prev) => prev.filter((n) => n.id !== id));
    if (target && !target.read) setUnreadCount((c) => Math.max(0, c - 1));
  }, [recent]);

  const clearAll = useCallback(async () => {
    await api('/notifications', { method: 'DELETE' });
    setRecent([]);
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    if (!user) {
      disconnectNotificationsSocket();
      setUnreadCount(0);
      setRecent([]);
      return;
    }

    refresh().catch(() => {});
    refreshRecent().catch(() => {});

    const socket = connectNotificationsSocket();

    const onNotification = (payload: { notification: NotificationItem; unreadCount: number }) => {
      prepend(payload.notification);
      setUnreadCount(payload.unreadCount);
      showToast(payload.notification.title, payload.notification.message);
    };

    const onUnread = (payload: { unreadCount: number }) => {
      setUnreadCount(payload.unreadCount);
    };

    socket.on('notification', onNotification);
    socket.on('unread-count', onUnread);

    return () => {
      socket.off('notification', onNotification);
      socket.off('unread-count', onUnread);
      disconnectNotificationsSocket();
    };
  }, [user, refresh, refreshRecent, prepend, showToast]);

  const value = useMemo(
    () => ({
      unreadCount,
      recent,
      loading,
      toast,
      refresh,
      refreshRecent,
      markRead,
      markAllRead,
      remove,
      clearAll,
      dismissToast: () => setToast(null),
      prepend,
    }),
    [unreadCount, recent, loading, toast, refresh, refreshRecent, markRead, markAllRead, remove, clearAll, prepend],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}
