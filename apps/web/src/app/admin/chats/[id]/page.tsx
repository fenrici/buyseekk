'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { adminApi, type AdminChatDetail } from '@/lib/admin';
import { formatMoney } from '@/lib/api';
import {
  ActionButton,
  ConfirmDialog,
  DEFAULT_ADMIN_LIMIT,
  EmptyState,
  PageHeader,
  Pagination,
} from '@/components/admin/ui';

export default function AdminChatDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [chat, setChat] = useState<AdminChatDetail | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_ADMIN_LIMIT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminApi
      .chat(id, { page, limit })
      .then(setChat)
      .catch((e) => setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setLoading(false));
  }, [id, page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  const doDelete = async () => {
    if (!confirm || !chat) return;
    setBusy(true);
    try {
      await adminApi.deleteMessage(confirm);
      setConfirm(null);
      load();
    } finally {
      setBusy(false);
    }
  };

  const changeLimit = (next: number) => {
    setPage(1);
    setLimit(next);
  };

  return (
    <div>
      <PageHeader
        title="Chat"
        subtitle="Moderación de conversación"
        action={
          <Link href="/admin/chats" className="text-sm text-slate-400 hover:text-slate-200">
            ← Volver
          </Link>
        }
      />

      {loading && !chat ? (
        <EmptyState>Cargando…</EmptyState>
      ) : error || !chat ? (
        <EmptyState>{error ?? 'Chat no encontrado.'}</EmptyState>
      ) : (
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-sm">
            <p className="font-semibold text-white">{chat.offer.requestTitle}</p>
            <p className="mt-1 text-slate-400">
              {formatMoney(chat.offer.price, chat.offer.currency)} · {chat.offer.status}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
              <span>Comprador: {chat.offer.request.user.name} ({chat.offer.request.user.email})</span>
              <span>Vendedor: {chat.offer.seller.name} ({chat.offer.seller.email})</span>
            </div>
          </div>

          <div className="space-y-2">
            {chat.messages.items.length === 0 ? (
              <EmptyState>Sin mensajes.</EmptyState>
            ) : (
              chat.messages.items.map((m) => (
                <div
                  key={m.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {m.fromRole} · {new Date(m.createdAt).toLocaleString()}
                    </p>
                    <p className="mt-1 break-words text-sm text-slate-200">{m.text}</p>
                  </div>
                  <ActionButton tone="danger" onClick={() => setConfirm(m.id)}>
                    Eliminar
                  </ActionButton>
                </div>
              ))
            )}
          </div>

          <Pagination meta={chat.messages.meta} onPage={setPage} onLimit={changeLimit} />
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        title="Eliminar mensaje"
        message="Vas a eliminar este mensaje de la conversación. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        busy={busy}
        onConfirm={() => void doDelete()}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
