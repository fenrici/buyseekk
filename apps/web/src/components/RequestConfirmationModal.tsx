'use client';

import { useEffect } from 'react';
import { RequestMeta } from '@/components/RequestMeta';
import { useT } from '@/lib/i18n';
import { RequestItem, User } from '@/lib/types';

type Props = {
  request: RequestItem;
  locale: User['locale'];
  onKeep: () => void | Promise<void>;
  onBought: () => void | Promise<void>;
  onPause: () => void | Promise<void>;
  onDelete: () => void | Promise<void>;
  busy?: boolean;
};

export function RequestConfirmationModal({
  request,
  locale,
  onKeep,
  onBought,
  onPause,
  onDelete,
  busy = false,
}: Props) {
  const t = useT();

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 px-4 py-6 sm:px-6"
      style={{
        paddingTop: 'max(1.5rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="request-confirmation-title"
    >
      <div className="mx-auto flex w-full max-w-md max-h-[min(88dvh,34rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-w-lg">
        <div className="overflow-y-auto p-5 sm:p-6">
          <div className="text-center sm:text-left">
            <h2 id="request-confirmation-title" className="text-lg font-bold text-slate-900 sm:text-xl">
              {t('reminder.title')}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{t('reminder.hint')}</p>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left">
            <RequestMeta request={request} locale={locale} size="sm" compact showRequirements={false} />
          </div>

          <div className="mt-5 flex flex-col gap-2.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => void onKeep()}
              className="btn btn-primary w-full py-3 text-sm font-semibold"
            >
              {t('reminder.keep')}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onBought()}
              className="btn btn-ghost w-full border border-slate-200 py-3 text-sm font-semibold"
            >
              {t('reminder.bought')}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onPause()}
              className="btn btn-ghost w-full border border-slate-200 py-3 text-sm font-semibold"
            >
              {t('reminder.pause')}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onDelete()}
              className="btn btn-ghost w-full border border-red-200 py-3 text-sm font-semibold text-red-600"
            >
              {t('reminder.delete')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
