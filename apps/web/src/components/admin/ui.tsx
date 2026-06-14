'use client';

import { useEffect } from 'react';

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white md:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

type Tone = 'neutral' | 'green' | 'red' | 'amber' | 'blue';

const TONES: Record<Tone, string> = {
  neutral: 'bg-slate-700/60 text-slate-200',
  green: 'bg-emerald-500/15 text-emerald-300',
  red: 'bg-red-500/15 text-red-300',
  amber: 'bg-amber-500/15 text-amber-300',
  blue: 'bg-sky-500/15 text-sky-300',
};

export function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}>
      {children}
    </span>
  );
}

export function Toolbar({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 p-3">
      {children}
    </div>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-slate-500 focus:outline-none ${props.className ?? ''}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-100 focus:border-slate-500 focus:outline-none ${props.className ?? ''}`}
    />
  );
}

export function TableShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
      <table className="w-full min-w-[640px] text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="border-b border-slate-800 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </th>
  );
}

export function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`border-b border-slate-800/60 px-4 py-3 align-middle text-slate-200 ${className ?? ''}`}>{children}</td>;
}

export function ActionButton({
  children,
  onClick,
  tone = 'neutral',
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: 'neutral' | 'danger' | 'primary';
  disabled?: boolean;
}) {
  const tones = {
    neutral: 'border-slate-700 text-slate-200 hover:bg-slate-800',
    danger: 'border-red-500/40 text-red-300 hover:bg-red-500/10',
    primary: 'border-sky-500/40 text-sky-300 hover:bg-sky-500/10',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition disabled:opacity-50 ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

export type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export const DEFAULT_ADMIN_LIMIT = 25;

export const EMPTY_PAGINATION_META: PaginationMeta = {
  total: 0,
  page: 1,
  limit: DEFAULT_ADMIN_LIMIT,
  totalPages: 0,
  hasNextPage: false,
  hasPrevPage: false,
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function Pagination({
  meta,
  onPage,
  onLimit,
}: {
  meta: PaginationMeta;
  onPage: (p: number) => void;
  onLimit?: (limit: number) => void;
}) {
  const { total, page, limit, totalPages, hasNextPage, hasPrevPage } = meta;
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
      <div className="flex items-center gap-3">
        <span>
          Showing <span className="font-semibold text-slate-200">{from}</span>–
          <span className="font-semibold text-slate-200">{to}</span> of{' '}
          <span className="font-semibold text-slate-200">{total}</span>
        </span>
        {onLimit && (
          <label className="flex items-center gap-1.5">
            <span className="text-slate-500">Por página</span>
            <select
              value={limit}
              onChange={(e) => onLimit(Number(e.target.value))}
              className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 focus:border-slate-500 focus:outline-none"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!hasPrevPage}
          onClick={() => onPage(page - 1)}
          className="rounded-lg border border-slate-700 px-2.5 py-1 font-medium transition hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          ← Previous
        </button>
        <span className="tabular-nums">
          {totalPages === 0 ? 0 : page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={!hasNextPage}
          onClick={() => onPage(page + 1)}
          className="rounded-lg border border-slate-700 px-2.5 py-1 font-medium transition hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed border-slate-800 px-4 py-12 text-center text-sm text-slate-500">{children}</div>;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  tone = 'danger',
  withReason = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
  withReason?: boolean;
  busy?: boolean;
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  let reason = '';

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 px-4" onClick={onCancel}>
      <div
        className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold text-white">{title}</h3>
        {message && <p className="mt-2 text-sm text-slate-400">{message}</p>}
        {withReason && (
          <textarea
            rows={3}
            placeholder="Motivo (opcional)"
            onChange={(e) => (reason = e.target.value)}
            className="mt-3 w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-slate-500 focus:outline-none"
          />
        )}
        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-lg border border-slate-700 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(withReason ? reason : undefined)}
            disabled={busy}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold text-white disabled:opacity-50 ${
              tone === 'danger' ? 'bg-red-600 hover:bg-red-500' : 'bg-sky-600 hover:bg-sky-500'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
