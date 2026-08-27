'use client';

import { useEffect, useRef } from 'react';
import { FREE_DAILY_OFFER_LIMIT, FREE_MAX_SMART_ALERTS } from '@buyseekk/shared';
import { useT } from '@/lib/i18n';

type Props = {
  periodEndLabel: string;
  loading?: boolean;
  onKeepPlus: () => void;
  onConfirmCancel: () => void;
  onClose: () => void;
};

export function CancelPlusModal({
  periodEndLabel,
  loading = false,
  onKeepPlus,
  onConfirmCancel,
  onClose,
}: Props) {
  const t = useT();
  const keepRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    keepRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [loading, onClose]);

  return (
    <div
      className="billing-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-plus-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div className="billing-modal card">
        <h2 id="cancel-plus-title" className="billing-modal__title">
          {t('subscription.cancelModalTitle')}
        </h2>
        <p className="billing-modal__text">
          {t('subscription.cancelModalBody', { date: periodEndLabel })}
        </p>
        <ul className="billing-modal__limits">
          <li>{t('subscription.cancelModalLimitOffers', { count: String(FREE_DAILY_OFFER_LIMIT) })}</li>
          <li>{t('subscription.cancelModalLimitAlerts', { count: String(FREE_MAX_SMART_ALERTS) })}</li>
        </ul>
        <div className="billing-modal__actions">
          <button
            ref={keepRef}
            type="button"
            className="billing-modal__btn billing-modal__btn--primary"
            disabled={loading}
            onClick={onKeepPlus}
          >
            {t('subscription.keepPlus')}
          </button>
          <button
            type="button"
            className="billing-modal__btn billing-modal__btn--danger"
            disabled={loading}
            onClick={onConfirmCancel}
          >
            {loading ? t('subscription.cancelLoading') : t('subscription.confirmCancelPlus')}
          </button>
        </div>
      </div>
    </div>
  );
}
