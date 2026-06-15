'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { notificationHref, NotificationItem } from '@/lib/notifications';
import { useLocale, timeAgo, useT } from '@/lib/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { useNotifications } from '@/providers/NotificationsProvider';

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden className="notif-bell__icon">
      <path d="M15 17H9l-1 2h8l-1-2z" strokeLinejoin="round" />
      <path d="M18 8a6 6 0 1 0-12 0c0 7-2 7-2 7h16s-2 0-2-7z" strokeLinejoin="round" />
    </svg>
  );
}

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
    NEW_MATCHING_REQUEST: '🔔',
  };
  return icons[type] ?? '•';
}

type Props = {
  variant?: 'desktop' | 'mobile';
};

export function NotificationBell({ variant = 'desktop' }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const t = useT();
  const { unreadCount, recent, loading, refreshRecent, markRead, markAllRead, clearAll } = useNotifications();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    refreshRecent().catch(() => {});
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, refreshRecent]);

  if (!user) return null;

  const badge = unreadCount > 99 ? '99+' : unreadCount > 0 ? String(unreadCount) : null;
  const locale = useLocale();

  async function handleClick(item: NotificationItem) {
    if (!item.read) await markRead(item.id).catch(() => {});
    setOpen(false);
    router.push(notificationHref(item, user?.activeMode));
  }

  async function handleClearAll() {
    if (!window.confirm(t('notifications.clearAllConfirm'))) return;
    await clearAll().catch(() => {});
  }

  return (
    <div
      ref={rootRef}
      className={`notif-bell notif-bell--${variant}`}
    >
      <button
        type="button"
        className="notif-bell__trigger"
        aria-label={t('notifications.bellLabel')}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <BellIcon />
        {badge && <span className="notif-bell__badge">{badge}</span>}
      </button>

      {open && (
        <div className="notif-bell__dropdown" role="menu">
          <div className="notif-bell__dropdown-head">
            <span>{t('notifications.title')}</span>
            <div className="notif-bell__head-actions">
              {unreadCount > 0 && (
                <button type="button" className="notif-bell__mark-all" onClick={() => markAllRead()}>
                  {t('notifications.markAllRead')}
                </button>
              )}
              {recent.length > 0 && (
                <button
                  type="button"
                  className="notif-bell__clear-all"
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
                </button>
              )}
            </div>
          </div>

          <div className="notif-bell__list">
            {loading && recent.length === 0 && (
              <p className="notif-bell__empty">{t('common.loading')}</p>
            )}
            {!loading && recent.length === 0 && (
              <p className="notif-bell__empty">{t('notifications.empty')}</p>
            )}
            {recent.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`notif-bell__item ${item.read ? '' : 'notif-bell__item--unread'}`}
                onClick={() => handleClick(item)}
              >
                <span className="notif-bell__item-icon" aria-hidden>{typeIcon(item.type)}</span>
                <span className="notif-bell__item-body">
                  <span className="notif-bell__item-title">{item.title}</span>
                  <span className="notif-bell__item-msg">{item.message}</span>
                  <span className="notif-bell__item-time">{timeAgo(locale, item.createdAt)}</span>
                </span>
              </button>
            ))}
          </div>

          <Link href="/notifications" className="notif-bell__footer" onClick={() => setOpen(false)}>
            {t('notifications.viewAll')}
          </Link>
        </div>
      )}
    </div>
  );
}

export function NotificationToast() {
  const { toast, dismissToast } = useNotifications();
  if (!toast) return null;

  return (
    <div className="notif-toast" role="status" aria-live="polite">
      <button type="button" className="notif-toast__close" onClick={dismissToast} aria-label="Close">
        ×
      </button>
      <p className="notif-toast__title">{toast.title}</p>
      <p className="notif-toast__msg">{toast.message}</p>
    </div>
  );
}
