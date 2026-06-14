'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { adminApi, type AdminChat, type AdminPaginated } from '@/lib/admin';
import {
  DEFAULT_ADMIN_LIMIT,
  EMPTY_PAGINATION_META,
  EmptyState,
  PageHeader,
  Pagination,
  TableShell,
  Td,
  TextInput,
  Th,
  Toolbar,
} from '@/components/admin/ui';

export default function AdminChatsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_ADMIN_LIMIT);
  const [data, setData] = useState<AdminPaginated<AdminChat>>({
    items: [],
    meta: EMPTY_PAGINATION_META,
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await adminApi.chats({ page, limit, search: search || undefined }));
    } finally {
      setLoading(false);
    }
  }, [page, limit, search]);

  useEffect(() => {
    const id = setTimeout(() => void load(), 250);
    return () => clearTimeout(id);
  }, [load]);

  const changeLimit = (next: number) => {
    setPage(1);
    setLimit(next);
  };

  return (
    <div>
      <PageHeader
        title="Chats"
        subtitle="Revisá conversaciones solo cuando exista un reporte o riesgo de seguridad."
      />

      <Toolbar>
        <TextInput
          placeholder="Buscar por solicitud o vendedor"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          className="min-w-[220px] flex-1"
        />
      </Toolbar>

      {loading ? (
        <EmptyState>Cargando…</EmptyState>
      ) : data.items.length === 0 ? (
        <EmptyState>No hay chats con estos filtros.</EmptyState>
      ) : (
        <TableShell>
          <thead>
            <tr>
              <Th>Solicitud</Th>
              <Th>Comprador</Th>
              <Th>Vendedor</Th>
              <Th>Mensajes</Th>
              <Th>Último</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((c) => (
              <tr key={c.id}>
                <Td>
                  <p className="font-semibold text-white">{c.requestTitle}</p>
                </Td>
                <Td>{c.buyer.name}</Td>
                <Td>{c.seller.name}</Td>
                <Td>{c.messageCount}</Td>
                <Td className="max-w-[240px] truncate text-xs text-slate-500">
                  {c.lastMessage ? c.lastMessage.text : '—'}
                </Td>
                <Td>
                  <Link
                    href={`/admin/chats/${c.id}`}
                    className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-slate-800"
                  >
                    Revisar
                  </Link>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}

      <Pagination meta={data.meta} onPage={setPage} onLimit={changeLimit} />
    </div>
  );
}
