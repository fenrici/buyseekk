'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useT } from '@/lib/i18n';

type Props = {
  requestId: string;
  initialSaved?: boolean;
  onChange?: (saved: boolean) => void;
  className?: string;
  size?: 'sm' | 'md';
};

function BookmarkIcon({ filled }: { filled: boolean }) {
  if (filled) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M6 2a2 2 0 0 0-2 2v18l8-4.5 8 4.5V4a2 2 0 0 0-2-2H6z" />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 2h12a2 2 0 0 1 2 2v18l-8-4.5L4 22V4a2 2 0 0 1 2-2z" />
    </svg>
  );
}

export function SaveRequestButton({
  requestId,
  initialSaved = false,
  onChange,
  className = '',
  size = 'md',
}: Props) {
  const t = useT();
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    setSaved(initialSaved);
  }, [initialSaved, requestId]);

  const toggle = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (loading) return;
      setLoading(true);
      setToast('');
      try {
        if (saved) {
          await api(`/saved-requests/${requestId}`, { method: 'DELETE' });
          setSaved(false);
          onChange?.(false);
          setToast(t('savedRequest.removed'));
        } else {
          await api(`/saved-requests/${requestId}`, { method: 'POST' });
          setSaved(true);
          onChange?.(true);
          setToast(t('savedRequest.saved'));
        }
        window.setTimeout(() => setToast(''), 2200);
      } catch {
        setToast(t('common.error'));
        window.setTimeout(() => setToast(''), 2200);
      } finally {
        setLoading(false);
      }
    },
    [loading, saved, requestId, onChange, t],
  );

  return (
    <div className={`save-request-wrap ${className}`}>
      <button
        type="button"
        className={`save-request-btn save-request-btn--${size}${saved ? ' save-request-btn--active' : ''}`}
        onClick={toggle}
        disabled={loading}
        aria-pressed={saved}
        aria-label={saved ? t('savedRequest.remove') : t('savedRequest.save')}
        title={saved ? t('savedRequest.remove') : t('savedRequest.save')}
      >
        {loading ? <span className="save-request-spinner" aria-hidden /> : <BookmarkIcon filled={saved} />}
      </button>
      {toast && (
        <span className="save-request-toast" role="status">
          {toast}
        </span>
      )}
    </div>
  );
}

export function canSellerOfferOnRequest(
  status?: string,
  myOffer?: { id: string } | null,
): boolean {
  if (myOffer) return false;
  if (!status) return true;
  return status === 'ACTIVA' || status === 'NEGOCIANDO' || status === 'INACTIVA';
}
