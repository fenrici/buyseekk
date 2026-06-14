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
      ? 'inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50'
      : 'inline-flex items-center gap-1 text-xs font-medium text-slate-400 transition hover:text-red-500';

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
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/65 px-4 py-6"
          role="dialog"
          aria-modal="true"
          onClick={close}
        >
          <div
            className="report-dialog mx-auto flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-bold text-slate-900">{t('report.title')}</h2>
              <button type="button" onClick={close} className="text-slate-400 hover:text-slate-600" aria-label={t('report.cancel')}>
                ✕
              </button>
            </div>

            {done ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-slate-700">{t('report.success')}</p>
                <button type="button" onClick={close} className="btn btn-primary mt-5 px-6 py-2.5 text-sm font-semibold">
                  {t('report.cancel')}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4 px-5 py-5">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('report.reasonLabel')}</span>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value as ReportReason)}
                    className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none"
                  >
                    {REPORT_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {t(`report.reasons.${r}`)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('report.detailsLabel')}</span>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    rows={4}
                    maxLength={2000}
                    placeholder={t('report.detailsPlaceholder')}
                    className="resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none"
                  />
                </label>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex gap-2.5">
                  <button type="button" onClick={close} disabled={busy} className="btn btn-ghost flex-1 border border-slate-200 py-2.5 text-sm font-semibold">
                    {t('report.cancel')}
                  </button>
                  <button type="button" onClick={() => void submit()} disabled={busy} className="btn btn-primary flex-1 py-2.5 text-sm font-semibold">
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
