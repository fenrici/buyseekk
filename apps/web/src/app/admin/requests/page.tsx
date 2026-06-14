'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminApi, type AdminPaginated, type AdminRequest } from '@/lib/admin';
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

type Filters = { search: string; category: string; country: string; status: string; active: string };
const EMPTY: Filters = { search: '', category: '', country: '', status: '', active: '' };

export default function AdminRequestsPage() {
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_ADMIN_LIMIT);
  const [data, setData] = useState<AdminPaginated<AdminRequest>>({
    items: [],
    meta: EMPTY_PAGINATION_META,
  });
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<{ req: AdminRequest; action: 'delete' } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(
        await adminApi.requests({
          page,
          limit,
          search: filters.search || undefined,
          category: filters.category || undefined,
          country: filters.country || undefined,
          status: filters.status || undefined,
          active: filters.active || undefined,
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

  const doClose = async (req: AdminRequest) => {
    await adminApi.closeRequest(req.id);
    load();
  };
  const doReactivate = async (req: AdminRequest) => {
    await adminApi.reactivateRequest(req.id);
    load();
  };
  const doDelete = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      await adminApi.deleteRequest(confirm.req.id);
      setConfirm(null);
      load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Solicitudes" subtitle={`${data.meta.total} solicitudes`} />

      <Toolbar>
        <TextInput
          placeholder="Buscar título o requisitos"
          value={filters.search}
          onChange={(e) => set({ search: e.target.value })}
          className="min-w-[200px] flex-1"
        />
        <Select value={filters.category} onChange={(e) => set({ category: e.target.value })}>
          <option value="">Categoría</option>
          <option value="AUTOS">Autos</option>
          <option value="INMOBILIARIA">Inmobiliaria</option>
        </Select>
        <Select value={filters.status} onChange={(e) => set({ status: e.target.value })}>
          <option value="">Estado</option>
          <option value="ACTIVA">Activa</option>
          <option value="NEGOCIANDO">Negociando</option>
          <option value="CERRADA">Cerrada</option>
        </Select>
        <Select value={filters.active} onChange={(e) => set({ active: e.target.value })}>
          <option value="">Visibilidad</option>
          <option value="true">Activas</option>
          <option value="false">Inactivas</option>
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
        <EmptyState>No hay solicitudes con estos filtros.</EmptyState>
      ) : (
        <TableShell>
          <thead>
            <tr>
              <Th>Título</Th>
              <Th>Comprador</Th>
              <Th>Categoría</Th>
              <Th>Estado</Th>
              <Th>Ofertas</Th>
              <Th>Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((r) => (
              <tr key={r.id}>
                <Td>
                  <p className="font-semibold text-white">{r.title}</p>
                  <p className="text-xs text-slate-500">
                    {r.location} · {r.country}
                  </p>
                </Td>
                <Td>
                  <p className="text-sm">{r.user.name}</p>
                  <p className="text-xs text-slate-500">{r.user.email}</p>
                </Td>
                <Td>{r.category}</Td>
                <Td>
                  <Badge tone={r.status === 'CERRADA' ? 'red' : r.status === 'NEGOCIANDO' ? 'amber' : 'green'}>
                    {r.status}
                  </Badge>
                  {!r.active && <span className="ml-1 text-xs text-slate-500">(inactiva)</span>}
                </Td>
                <Td>{r._count.offers}</Td>
                <Td>
                  <div className="flex flex-wrap gap-1.5">
                    {r.status === 'CERRADA' ? (
                      <ActionButton tone="primary" onClick={() => void doReactivate(r)}>
                        Reactivar
                      </ActionButton>
                    ) : (
                      <ActionButton onClick={() => void doClose(r)}>Cerrar</ActionButton>
                    )}
                    <ActionButton tone="danger" onClick={() => setConfirm({ req: r, action: 'delete' })}>
                      Eliminar
                    </ActionButton>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}

      <Pagination meta={data.meta} onPage={setPage} onLimit={changeLimit} />

      <ConfirmDialog
        open={!!confirm}
        title="Eliminar solicitud"
        message={`Vas a eliminar "${confirm?.req.title}". Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        busy={busy}
        onConfirm={() => void doDelete()}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
