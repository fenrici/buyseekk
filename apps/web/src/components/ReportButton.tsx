'use client';

import { useEffect, useState } from 'react';
import { createReport, REPORT_REASONS, type CreateReportInput, type ReportReason } from '@/lib/admin';
import { useT } from '@/lib/i18n';

type ReportTarget = Omit<CreateReportInput, 'reason' | 'details'>;

type Props = {
  target: ReportTarget;
  className?: string;
  label?: string;
  variant?: 'button' | 'link';
};

export function ReportButton({ target, className, label, variant = 'link' }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>('SPAM');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const reset = () => {
    setReason('SPAM');
    setDetails('');
    setDone(false);
    setError(null);
    setBusy(false);
  };

  const close = () => {
    setOpen(false);
    setTimeout(reset, 200);
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await createReport({ ...target, reason, details: details.trim() || undefined });
      setDone(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (/reportaste|already reported/i.test(msg)) {
        setError(t('report.alreadyReported'));
      } else {
        setError(msg || t('report.error'));
      }
    } finally {
      setBusy(false);
    }
  };

  const triggerClass =
    variant === 'button'
      ? 'report-trigger report-trigger--button'
      : 'report-trigger';

  return (
    <>
      <button
        type="button"
        className={className ?? triggerClass}
        onClick={() => setOpen(true)}
        aria-label={t('report.button')}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
          <line x1="4" y1="22" x2="4" y2="15" />
        </svg>
        {label ?? t('report.button')}
      </button>

      {open && (
        <div
          className="report-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-dialog-title"
          onClick={close}
        >
          <div className="report-dialog card" onClick={(e) => e.stopPropagation()}>
            <div className="report-dialog__head">
              <h2 id="report-dialog-title" className="report-dialog__title">{t('report.title')}</h2>
              <button type="button" onClick={close} className="report-dialog__close" aria-label={t('report.cancel')}>
                ✕
              </button>
            </div>

            {done ? (
              <div className="report-dialog__done">
                <p>{t('report.success')}</p>
                <button type="button" onClick={close} className="btn btn-primary report-dialog__submit">
                  {t('report.cancel')}
                </button>
              </div>
            ) : (
              <div className="report-dialog__body">
                <label className="report-dialog__field">
                  <span className="report-dialog__label">{t('report.reasonLabel')}</span>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value as ReportReason)}
                    className="report-dialog__select"
                  >
                    {REPORT_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {t(`report.reasons.${r}`)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="report-dialog__field">
                  <span className="report-dialog__label">{t('report.detailsLabel')}</span>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    rows={4}
                    maxLength={2000}
                    placeholder={t('report.detailsPlaceholder')}
                    className="report-dialog__textarea"
                  />
                </label>

                {error && <p className="report-dialog__error">{error}</p>}

                <div className="report-dialog__actions">
                  <button type="button" onClick={close} disabled={busy} className="report-dialog__cancel">
                    {t('report.cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={() => void submit()}
                    disabled={busy}
                    className="btn btn-primary report-dialog__submit"
                  >
                    {t('report.submit')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
