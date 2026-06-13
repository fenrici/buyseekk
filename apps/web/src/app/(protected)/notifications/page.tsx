'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, normalizePaginated } from '@/lib/api';
import { notificationHref, NotificationItem } from '@/lib/notifications';
import { useLocale, timeAgo, useT } from '@/lib/i18n';
import { PaginatedResult } from '@/lib/types';
import { Header } from '@/components/Header';
import { PaginationControls } from '@/components/PaginationControls';
import { PanelListLoading } from '@/components/PanelListLoading';
import { useAuth } from '@/providers/AuthProvider';
import { useNotifications } from '@/providers/NotificationsProvider';

function typeIcon(type: NotificationItem['type']) {
  const icons: Record<NotificationItem['type'], string> = {
    NEW_OFFER: '✦',
    OFFER_ACCEPTED: '✓',
    OFFER_REJECTED: '⊘',
    NEW_MESSAGE: '💬',
    REQUEST_EXPIRING: '⏳',
    REQUEST_INACTIVE: '○',
    REQUEST_CLOSED: '■',
    EMAIL_VERIFIED: '✉',
  };
  return icons[type] ?? '•';
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const t = useT();
  const { markRead, markAllRead, remove, clearAll, refresh } = useNotifications();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const locale = useLocale();

  async function load(p = page) {
    setLoading(true);
    try {
      const raw = await api<PaginatedResult<NotificationItem>>(`/notifications?page=${p}`);
      const data = normalizePaginated(raw);
      setItems(data.items);
      setMeta({ total: data.total, totalPages: data.totalPages });
      setPage(data.page);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    load(1).catch(() => {});
  }, [user]);

  async function openItem(item: NotificationItem) {
    if (!item.read) {
      await markRead(item.id);
      await refresh();
    }
    router.push(notificationHref(item, user?.activeMode));
  }

  async function handleRemove(id: string) {
    await remove(id);
    await load(page);
    await refresh();
  }

  async function handleClearAll() {
    if (!window.confirm(t('notifications.clearAllConfirm'))) return;
    await clearAll();
    await load(1);
    await refresh();
  }

  return (
    <div className="panel-dark min-h-screen">
      <Header variant="dark" />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <div className="notif-page__head">
          <div>
            <h1 className="notif-page__title">{t('notifications.title')}</h1>
            <p className="notif-page__subtitle">{t('notifications.subtitle')}</p>
          </div>
          <div className="notif-page__actions">
            <button type="button" className="notif-page__mark-all" onClick={() => markAllRead().then(() => load(page))}>
              {t('notifications.markAllRead')}
            </button>
            {items.length > 0 && (
              <button
                type="button"
                className="notif-page__clear-all"
                onClick={handleClearAll}
                aria-label={t('notifications.clearAll')}
                title={t('notifications.clearAll')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                  <path d="M3 6h18" strokeLinecap="round" />
                  <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" strokeLinecap="round" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" strokeLinejoin="round" />
                  <path d="M10 11v6M14 11v6" strokeLinecap="round" />
                </svg>
                <span>{t('notifications.clearAll')}</span>
              </button>
            )}
          </div>
        </div>

        <PanelListLoading loading={loading} />
        {!loading && items.length === 0 && (
          <p className="notif-page__empty">{t('notifications.empty')}</p>
        )}
        {!loading && items.length > 0 && (
          <ul className="notif-page__list">
            {items.map((item) => (
              <li key={item.id} className={`notif-page__item ${item.read ? '' : 'notif-page__item--unread'}`}>
                <button type="button" className="notif-page__item-main" onClick={() => openItem(item)}>
                  <span className="notif-page__icon" aria-hidden>{typeIcon(item.type)}</span>
                  <span className="notif-page__body">
                    <span className="notif-page__item-title">{item.title}</span>
                    <span className="notif-page__item-msg">{item.message}</span>
                    <span className="notif-page__item-time">{timeAgo(locale, item.createdAt)}</span>
                  </span>
                </button>
                <button
                  type="button"
                  className="notif-page__delete"
                  onClick={() => handleRemove(item.id)}
                  aria-label={t('notifications.delete')}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        <PaginationControls
          page={page}
          totalPages={meta.totalPages}
          total={meta.total}
          onPageChange={(p) => load(p)}
          itemLabel={t('notifications.itemsLabel')}
        />
      </main>
    </div>
  );
}
