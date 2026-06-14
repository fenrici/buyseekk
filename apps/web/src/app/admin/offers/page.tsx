'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminApi, type AdminOffer, type AdminPaginated } from '@/lib/admin';
import { formatMoney } from '@/lib/api';
import {
  ActionButton,
  Badge,
  ConfirmDialog,
  DEFAULT_ADMIN_LIMIT,
  EMPTY_PAGINATION_META,
  EmptyState,
  PageHeader,
  Pagination,
  Select,
  TableShell,
  Td,
  TextInput,
  Th,
  Toolbar,
} from '@/components/admin/ui';

type Filters = { search: string; status: string; country: string };
const EMPTY: Filters = { search: '', status: '', country: '' };

export default function AdminOffersPage() {
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_ADMIN_LIMIT);
  const [data, setData] = useState<AdminPaginated<AdminOffer>>({
    items: [],
    meta: EMPTY_PAGINATION_META,
  });
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<AdminOffer | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(
        await adminApi.offers({
          page,
          limit,
          search: filters.search || undefined,
          status: filters.status || undefined,
          country: filters.country || undefined,
        }),
      );
    } finally {
      setLoading(false);
    }
  }, [page, limit, filters]);

  useEffect(() => {
    const id = setTimeout(() => void load(), 250);
    return () => clearTimeout(id);
  }, [load]);

  const set = (patch: Partial<Filters>) => {
    setPage(1);
    setFilters((f) => ({ ...f, ...patch }));
  };

  const changeLimit = (next: number) => {
    setPage(1);
    setLimit(next);
  };

  const doDelete = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      await adminApi.deleteOffer(confirm.id);
      setConfirm(null);
      load();
    } finally {
      setBusy(false);
    }
  };

  const statusTone = (s: AdminOffer['status']) =>
    s === 'ACEPTADA' ? 'green' : s === 'RECHAZADA' ? 'red' : 'amber';

  return (
    <div>
      <PageHeader title="Ofertas" subtitle={`${data.meta.total} ofertas`} />

      <Toolbar>
        <TextInput
          placeholder="Buscar mensaje o solicitud"
          value={filters.search}
          onChange={(e) => set({ search: e.target.value })}
          className="min-w-[200px] flex-1"
        />
        <Select value={filters.status} onChange={(e) => set({ status: e.target.value })}>
          <option value="">Estado</option>
          <option value="PENDIENTE">Pendiente</option>
          <option value="ACEPTADA">Aceptada</option>
          <option value="RECHAZADA">Rechazada</option>
        </Select>
        <Select value={filters.country} onChange={(e) => set({ country: e.target.value })}>
          <option value="">País</option>
          <option value="AR">AR</option>
          <option value="US">US</option>
        </Select>
      </Toolbar>

      {loading ? (
        <EmptyState>Cargando…</EmptyState>
      ) : data.items.length === 0 ? (
        <EmptyState>No hay ofertas con estos filtros.</EmptyState>
      ) : (
        <TableShell>
          <thead>
            <tr>
              <Th>Solicitud</Th>
              <Th>Vendedor</Th>
              <Th>Precio</Th>
              <Th>Estado</Th>
              <Th>Fecha</Th>
              <Th>Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((o) => (
              <tr key={o.id}>
                <Td>
                  <p className="font-semibold text-white">{o.requestTitle}</p>
                  <p className="max-w-[280px] truncate text-xs text-slate-500">{o.message}</p>
                </Td>
                <Td>
                  <p className="text-sm">{o.seller.name}</p>
                  <p className="text-xs text-slate-500">{o.seller.email}</p>
                </Td>
                <Td className="whitespace-nowrap">{formatMoney(o.price, o.currency)}</Td>
                <Td>
                  <Badge tone={statusTone(o.status)}>{o.status}</Badge>
                </Td>
                <Td className="whitespace-nowrap text-xs text-slate-400">
                  {new Date(o.createdAt).toLocaleDateString()}
                </Td>
                <Td>
                  <ActionButton tone="danger" onClick={() => setConfirm(o)}>
                    Eliminar
                  </ActionButton>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}

      <Pagination meta={data.meta} onPage={setPage} onLimit={changeLimit} />

      <ConfirmDialog
        open={!!confirm}
        title="Eliminar oferta"
        message="Vas a eliminar esta oferta. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        busy={busy}
        onConfirm={() => void doDelete()}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
